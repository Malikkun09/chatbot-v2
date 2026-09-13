import { NVIDIA_TIMEOUT_MS } from "@/lib/constants";
import {
  canFailover,
  classifyProviderError,
  classifyThrown,
  errorMessage,
} from "@/lib/chat/errors";
import type { ErrorCategory, TokenUsage } from "@/lib/chat/types";
import { markKeyCooldown, preferFreshKeys } from "@/lib/ai/cooldown";
import { rotateKeys, shouldFailover } from "@/lib/ai/keys";
import { readSse } from "@/lib/ai/sse";
import { createThinkingSplitter } from "@/lib/ai/thinking";
import type { ModelProviderId } from "@/lib/ai/catalog";
import type { ProviderEvent } from "@/lib/ai/types";
import { logChat } from "@/lib/logger";

interface OpenAiDelta {
  content?: string | null;
  reasoning_content?: string | null;
  reasoning?: unknown;
  tool_calls?: Array<{
    id?: string;
    function?: { name?: string; arguments?: string };
  }>;
}

interface OpenAiChunk {
  choices?: Array<{ delta?: OpenAiDelta; finish_reason?: string | null }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    completion_tokens_details?: { reasoning_tokens?: number };
  };
  error?: { message?: string; code?: number | string };
}

function usageFrom(chunk: OpenAiChunk): TokenUsage | null {
  if (!chunk.usage) return null;
  return {
    promptTokens: chunk.usage.prompt_tokens,
    completionTokens: chunk.usage.completion_tokens,
    totalTokens: chunk.usage.total_tokens,
    reasoningTokens: chunk.usage.completion_tokens_details?.reasoning_tokens,
  };
}

function reasoningText(delta: OpenAiDelta): string {
  if (typeof delta.reasoning_content === "string") return delta.reasoning_content;
  if (typeof delta.reasoning === "string") return delta.reasoning;
  return "";
}

function combineSignals(client: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(NVIDIA_TIMEOUT_MS);
  if (typeof AbortSignal.any === "function") return AbortSignal.any([client, timeout]);
  return client.aborted ? client : timeout;
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 500);
  } catch {
    return "";
  }
}

export async function* streamOpenAiChat(options: {
  endpoint: string;
  keys: string[];
  extraHeaders?: Record<string, string>;
  body: unknown;
  signal: AbortSignal;
  provider: ModelProviderId;
}): AsyncIterable<ProviderEvent> {
  if (options.keys.length === 0) {
    yield { type: "error", category: "auth", message: errorMessage("auth", options.provider) };
    return;
  }

  const keys = rotateKeys(preferFreshKeys(options.keys));
  const signal = combineSignals(options.signal);
  let sawToken = false;
  let lastCategory: ErrorCategory = "unknown";

  for (let index = 0; index < keys.length; index += 1) {
    if (options.signal.aborted) {
      yield { type: "error", category: "user_cancelled" };
      return;
    }

    if (index > 0) {
      yield { type: "status", message: "Trying another connection…" };
    }

    const key = keys[index];
    if (!key) continue;

    let response: Response;
    try {
      response = await fetch(options.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...options.extraHeaders,
        },
        body: JSON.stringify(options.body),
        signal,
      });
    } catch (error) {
      if (options.signal.aborted) {
        yield { type: "error", category: "user_cancelled" };
        return;
      }
      lastCategory = classifyThrown(error);
      const more = index < keys.length - 1;
      if (sawToken || !more) {
        yield { type: "error", category: lastCategory, keepPartial: sawToken };
        return;
      }
      logChat("failover", { reason: lastCategory, attempt: index + 1 });
      continue;
    }

    if (!response.ok) {
      const body = await readErrorBody(response);
      lastCategory = classifyProviderError(response.status, body);
      if (response.status === 429 || response.status >= 500) markKeyCooldown(key);
      const more = canFailover({
        aborted: options.signal.aborted,
        sawToken,
        hasMoreKeys: index < keys.length - 1,
        status: response.status,
      }) && shouldFailover(response.status);
      if (!more) {
        yield {
          type: "error",
          category: lastCategory,
          message: errorMessage(lastCategory, options.provider),
          keepPartial: sawToken,
        };
        return;
      }
      logChat("failover", { status: response.status, attempt: index + 1 });
      continue;
    }

    if (!response.body) {
      lastCategory = "temporary_provider_error";
      if (index < keys.length - 1 && !sawToken) continue;
      yield { type: "error", category: lastCategory, keepPartial: sawToken };
      return;
    }

    const splitter = createThinkingSplitter();
    try {
      for await (const event of readSse(response.body)) {
        if (options.signal.aborted) {
          yield { type: "error", category: "user_cancelled", keepPartial: sawToken };
          return;
        }
        if (event.data === "[DONE]") break;
        let chunk: OpenAiChunk;
        try {
          chunk = JSON.parse(event.data) as OpenAiChunk;
        } catch {
          continue;
        }
        if (chunk.error?.message) {
          lastCategory = classifyProviderError(Number(chunk.error.code) || 500, chunk.error.message);
          yield {
            type: "error",
            category: lastCategory,
            message: errorMessage(lastCategory, options.provider),
            keepPartial: sawToken,
          };
          return;
        }
        const usage = usageFrom(chunk);
        if (usage) yield { type: "usage", usage };
        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;
        if (delta.tool_calls?.length) {
          for (const call of delta.tool_calls) {
            if (!call.function?.name) continue;
            yield { type: "tool_call", id: call.id, name: call.function.name, arguments: call.function.arguments };
          }
        }
        const reasoning = reasoningText(delta);
        if (reasoning) {
          sawToken = true;
          yield { type: "thinking", text: reasoning };
        }
        if (delta.content) {
          const split = splitter.push(delta.content);
          if (split.thinking) {
            sawToken = true;
            yield { type: "thinking", text: split.thinking };
          }
          if (split.content) {
            sawToken = true;
            yield { type: "content", text: split.content };
          }
        }
      }
      const rest = splitter.flush();
      if (rest.thinking) yield { type: "thinking", text: rest.thinking };
      if (rest.content) yield { type: "content", text: rest.content };
      if (!sawToken) {
        const more = index < keys.length - 1;
        if (more) {
          logChat("failover", { reason: "empty_stream", attempt: index + 1 });
          continue;
        }
        yield { type: "error", category: "stream_drop" };
      }
      return;
    } catch (error) {
      if (options.signal.aborted) {
        yield { type: "error", category: "user_cancelled", keepPartial: sawToken };
        return;
      }
      lastCategory = classifyThrown(error);
      if (sawToken || index === keys.length - 1) {
        yield { type: "error", category: lastCategory === "user_cancelled" ? lastCategory : sawToken ? "stream_drop" : lastCategory, keepPartial: sawToken };
        return;
      }
      logChat("failover", { reason: lastCategory, attempt: index + 1 });
    }
  }

  yield { type: "error", category: lastCategory, keepPartial: sawToken };
}

