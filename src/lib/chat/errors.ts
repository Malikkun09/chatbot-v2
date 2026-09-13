import type { ErrorCategory, MessageError } from "@/lib/chat/types";

const MESSAGES: Record<ErrorCategory, string> = {
  timeout: "The model took too long to respond. Try again.",
  rate_limit: "NVIDIA is rate-limiting this key. Wait a moment and retry.",
  bad_key:
    "The NVIDIA API key is missing or invalid. Set NVIDIA_API_KEY on the server (never in the browser).",
  provider_down: "NVIDIA NIM is unavailable right now. Try again shortly.",
  stream_drop: "The response stream dropped before it finished. Retry to continue.",
  payload_too_large:
    "This conversation or an attachment is too large to send. Start a new chat or remove images.",
  network: "Network error. Check your connection and retry.",
  cancelled: "Generation stopped.",
  unknown: "Something went wrong. Please retry.",
};

export function errorMessage(category: ErrorCategory): string {
  return MESSAGES[category];
}

export function makeError(category: ErrorCategory, override?: string): MessageError {
  return { category, message: override?.trim() || MESSAGES[category] };
}

export function classifyHttpStatus(status: number): ErrorCategory {
  if (status === 401 || status === 403) return "bad_key";
  if (status === 408 || status === 504) return "timeout";
  if (status === 413) return "payload_too_large";
  if (status === 429) return "rate_limit";
  if (status >= 500 && status <= 503) return "provider_down";
  return "unknown";
}

export function classifyThrown(error: unknown): ErrorCategory {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "cancelled";
  }
  if (error instanceof Error) {
    const name = error.name;
    const msg = error.message.toLowerCase();
    if (name === "TimeoutError" || msg.includes("timeout")) return "timeout";
    if (name === "AbortError" || msg.includes("aborted")) return "cancelled";
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed to fetch")) {
      return "network";
    }
  }
  return "unknown";
}
