import type { ApiTurn, TokenUsage } from "@/lib/chat/types";
import type { ErrorCategory } from "@/lib/chat/types";

export interface ProviderChatRequest {
  messages: ApiTurn[];
  signal: AbortSignal;
}

export type ProviderEvent =
  | { type: "thinking"; text: string }
  | { type: "content"; text: string }
  | { type: "tool_call"; id?: string; name: string; arguments?: string }
  | { type: "usage"; usage: TokenUsage }
  | { type: "error"; category: ErrorCategory; message?: string };

export interface ChatProvider {
  id: string;
  model: string;
  stream(request: ProviderChatRequest): AsyncIterable<ProviderEvent>;
}

export type NvidiaContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface NvidiaChatMessage {
  role: "system" | "user" | "assistant";
  content: string | NvidiaContentPart[];
}
