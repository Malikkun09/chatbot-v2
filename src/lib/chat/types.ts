export type Role = "user" | "assistant" | "system";

export type MessageStatus =
  | "idle"
  | "submitting"
  | "streaming"
  | "completed"
  | "error"
  | "cancelled";

export type ChatStatus = MessageStatus;

export type ErrorCategory =
  | "timeout"
  | "rate_limit"
  | "bad_key"
  | "provider_down"
  | "stream_drop"
  | "payload_too_large"
  | "network"
  | "cancelled"
  | "unknown";

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  dataUrl?: string;
  stub?: boolean;
  width?: number;
  height?: number;
  error?: string;
  sizeBytes?: number;
}

export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
}

export interface MessageMetrics {
  ttftMs?: number;
  durationMs?: number;
  generationMs?: number;
  tokensPerSecond?: number;
}

export interface MessageError {
  category: ErrorCategory;
  message: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  status: MessageStatus;
  createdAt: number;
  attachments?: Attachment[];
  usage?: TokenUsage;
  model?: string;
  latency?: MessageMetrics;
  error?: MessageError;
  thinking?: string;
}

export interface ApiAttachment {
  name: string;
  mimeType: string;
  dataUrl?: string;
}

export interface ApiTurn {
  role: "user" | "assistant";
  content: string;
  attachments?: ApiAttachment[];
}

export interface ChatRequestBody {
  messages: ApiTurn[];
}
