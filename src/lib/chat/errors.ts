import type { ErrorCategory, MessageError } from "@/lib/chat/types";
import type { ModelProviderId } from "@/lib/ai/catalog";

const MESSAGES: Record<ErrorCategory, string> = {
  timeout: "The model took too long to respond. Try again.",
  rate_limited: "The provider is rate-limiting this request. Wait a moment and retry.",
  auth: "The API key for this provider is missing or invalid. Set it on the server (never in the browser).",
  temporary_provider_error: "The model provider is unavailable right now. Try again shortly.",
  stream_drop: "The response stream dropped before it finished. Retry to continue.",
  payload_too_large:
    "This conversation or an attachment is too large to send. Start a new chat or remove files.",
  network: "Network error. Check your connection and retry.",
  user_cancelled: "Generation stopped.",
  not_multimodal:
    "This model does not accept images. Switch to Nemotron Omni or Dots, or remove image attachments.",
  invalid_request: "The request was rejected. Check the prompt, files, or selected model.",
  model_unavailable: "That model is unavailable right now. Pick another model and retry.",
  context_limit: "This conversation is too long for the model. Start a new chat or shorten the last message.",
  content_policy: "The provider blocked this request for safety policy reasons.",
  unknown: "Something went wrong. Please retry.",
};

const PROVIDER_MESSAGES: Partial<Record<ErrorCategory, Record<ModelProviderId, string>>> = {
  auth: {
    nvidia:
      "The NVIDIA API key is missing or invalid. Set NVIDIA_API_KEY on the server (never in the browser).",
    openrouter:
      "The OpenRouter API key is missing or invalid. Set OPENROUTER_API_KEY on the server (never in the browser).",
  },
  rate_limited: {
    nvidia: "NVIDIA is rate-limiting this key. Wait a moment and retry.",
    openrouter:
      "OpenRouter is rate-limiting this key or free-model quota. Wait a moment and retry.",
  },
  temporary_provider_error: {
    nvidia: "NVIDIA NIM is unavailable right now. Try again shortly.",
    openrouter: "OpenRouter is unavailable right now. Try again shortly.",
  },
};

export function errorMessage(category: ErrorCategory, provider?: ModelProviderId): string {
  if (provider) {
    const specific = PROVIDER_MESSAGES[category]?.[provider];
    if (specific) return specific;
  }
  return MESSAGES[category];
}

function safeDetail(override?: string): string | undefined {
  if (!override) return undefined;
  const line = override.split("\n")[0]?.trim() ?? "";
  if (!line) return undefined;
  if (/api[_-]?key|bearer\s+\S+/i.test(line)) return undefined;
  return line.slice(0, 240);
}

export function makeError(
  category: ErrorCategory,
  override?: string,
  provider?: ModelProviderId,
): MessageError {
  return { category, message: safeDetail(override) || errorMessage(category, provider) };
}

export function classifyHttpStatus(status: number): ErrorCategory {
  if (status === 401 || status === 403) return "auth";
  if (status === 408 || status === 504) return "timeout";
  if (status === 402 || status === 429) return "rate_limited";
  if (status === 413) return "payload_too_large";
  if (status === 404) return "model_unavailable";
  if (status === 400) return "invalid_request";
  if (status >= 500 && status <= 503) return "temporary_provider_error";
  return "unknown";
}

export function classifyProviderError(status: number, body = ""): ErrorCategory {
  const lower = body.toLowerCase();
  if (
    lower.includes("context length") ||
    lower.includes("context_length") ||
    lower.includes("maximum context") ||
    lower.includes("too many tokens") ||
    (lower.includes("max_tokens") && lower.includes("exceed"))
  ) {
    return "context_limit";
  }
  if (
    lower.includes("moderation") ||
    lower.includes("content policy") ||
    lower.includes("safety") && lower.includes("blocked")
  ) {
    return "content_policy";
  }
  if (
    lower.includes("no allowed providers") ||
    lower.includes("model not found") ||
    lower.includes("does not exist")
  ) {
    return "model_unavailable";
  }
  return classifyHttpStatus(status);
}

export function classifyThrown(error: unknown): ErrorCategory {
  if (error instanceof DOMException && error.name === "AbortError") return "user_cancelled";
  if (error instanceof Error) {
    const name = error.name;
    const msg = error.message.toLowerCase();
    if (name === "TimeoutError" || msg.includes("timeout")) return "timeout";
    if (name === "AbortError" || msg.includes("aborted")) return "user_cancelled";
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed to fetch")) {
      return "network";
    }
  }
  return "unknown";
}

export function canFailover(input: {
  aborted: boolean;
  sawToken: boolean;
  hasMoreKeys: boolean;
  status?: number;
}): boolean {
  if (input.aborted || input.sawToken || !input.hasMoreKeys) return false;
  if (input.status === undefined) return true;
  return (
    input.status === 401 ||
    input.status === 403 ||
    input.status === 429 ||
    (input.status >= 500 && input.status <= 504)
  );
}
