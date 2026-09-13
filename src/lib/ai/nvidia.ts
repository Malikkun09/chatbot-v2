import { NVIDIA_TIMEOUT_MS } from "@/lib/constants";
import { classifyHttpStatus, errorMessage } from "@/lib/chat/errors";
import type { TokenUsage } from "@/lib/chat/types";
import { nvidiaBaseUrl, nvidiaKeys, nvidiaModel, shouldFailover } from "@/lib/ai/config";
import { toNvidiaMessages } from "@/lib/ai/messages";
import { readSse } from "@/lib/ai/sse";
import { createThinkingSplitter } from "@/lib/ai/thinking";
import type { ChatProvider, ProviderChatRequest, ProviderEvent } from "@/lib/ai/types";
import { logChat } from "@/lib/logger";

interface NvidiaDelta {
  content?: string | null;
  reasoning_content?: string | null;
  reasoning?: string | null;
  tool_calls?: Array<{
    index?: number;
    id?: string;
    function?: { name?: string; arguments?: string };
  }>;
}

interface NvidiaChunk {
  choices?: Array<{
    delta?: NvidiaDelta;
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    completion_tokens_details?: { reasoning_tokens?: number };
  };
  error?: { message?: string };
}

function usageFrom(chunk: NvidiaChunk): TokenUsage | null {
  if (!chunk.usage) return null;
  return {
    promptTokens: chunk.usage.prompt_tokens,
    completionTokens: chunk.usage.completion_tokens,
    totalTokens: chunk.usage.total_tokens,
    reasoningTokens: chunk.usage.completion_tokens_details?.reasoning_tokens,
  };
}

function combineSignals(client: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(NVIDIA_TIMEOUT_MS);
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([client, timeout]);
  }
  return client.aborted ? client : timeout;
}

async function openNvidiaStream(
  key: string,
  body: unknown,
  signal: AbortSignal,
): Promise<Response> {
  return fetch(`${nvidiaBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
    signal,
  });
}

export function createNvidiaProvider(): ChatProvider {
  const model = nvidiaModel();

  return {
    id: "nvidia",
    model,
    async *stream(request: ProviderChatRequest): AsyncIterable<ProviderEvent> {
      const keys = nvidiaKeys();
      if (keys.length === 0) {
        yield { type: "error", category: "bad_key" };
        return;
      }

      const payload = {
        model,
        messages: toNvidiaMessages(request.messages),
        stream: true,
        temperature: 0.6,
        top_p: 0.95,
        max_tokens: 8192,
        chat_template_kwargs: {
          enable_thinking: true,
          reasoning_budget: 2048,
        },
      };

      const signal = combineSignals(request.signal);
      let response: Response | null = null;
      let lastStatus = 0;

      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        try {
          response = await openNvidiaStream(key, payload, signal);
        } catch (error) {
          if (request.signal.aborted) {
            yield { type: "error", category: "cancelled" };
            return;
          }
          if (index === keys.length - 1) {
            const timeout = error instanceof Error && error.name === "TimeoutError";
            yield {
              type: "error",
              category: timeout ? "timeout" : "network",
            };
            return;
          }
          logChat("failover", { reason: "network", attempt: index + 1 });
          continue;
        }

        lastStatus = response.status;
        if (response.ok) break;

        if (index < keys.length - 1 && shouldFailover(response.status)) {
          logChat("failover", { status: response.status, attempt: index + 1 });
          continue;
        }

        yield {
          type: "error",
          category: classifyHttpStatus(response.status),
        };
        return;
      }

      if (!response?.ok || !response.body) {
        yield {
          type: "error",
          category: lastStatus ? classifyHttpStatus(lastStatus) : "provider_down",
        };
        return;
      }

      const splitter = createThinkingSplitter();
      let sawToken = false;

      try {
        for await (const event of readSse(response.body)) {
          if (request.signal.aborted) {
            yield { type: "error", category: "cancelled" };
            return;
          }
          if (event.data === "[DONE]") break;

          let chunk: NvidiaChunk;
          try {
            chunk = JSON.parse(event.data) as NvidiaChunk;
          } catch {
            continue;
          }

          if (chunk.error?.message) {
            yield { type: "error", category: "provider_down", message: errorMessage("provider_down") };
            return;
          }

          const usage = usageFrom(chunk);
          if (usage) yield { type: "usage", usage };

          const delta = chunk.choices?.[0]?.delta;
          if (!delta) continue;

          if (delta.tool_calls?.length) {
            for (const call of delta.tool_calls) {
              if (!call.function?.name) continue;
              yield {
                type: "tool_call",
                id: call.id,
                name: call.function.name,
                arguments: call.function.arguments,
              };
            }
          }

          const reasoning = delta.reasoning_content || delta.reasoning;
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
          yield { type: "error", category: "stream_drop" };
        }
      } catch (error) {
        if (request.signal.aborted) {
          yield { type: "error", category: "cancelled" };
          return;
        }
        if (error instanceof Error && error.name === "TimeoutError") {
          yield { type: "error", category: "timeout" };
          return;
        }
        yield { type: "error", category: sawToken ? "stream_drop" : "network" };
      }
    },
  };
}

