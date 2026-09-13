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
  | "rate_limited"
  | "temporary_provider_error"
  | "timeout"
  | "network"
  | "auth"
  | "invalid_request"
  | "model_unavailable"
  | "context_limit"
  | "content_policy"
  | "user_cancelled"
  | "payload_too_large"
  | "not_multimodal"
  | "stream_drop"
  | "pdf_unreadable"
  | "unknown";

export type AttachmentKind = "image" | "text" | "document";
export type AttachmentStatus = "pending" | "processing" | "ready" | "error";
export type ExtractionStatus = "ok" | "empty" | "failed";

export interface Attachment {
  id: string;
  kind: AttachmentKind;
  name: string;
  mimeType: string;
  status: AttachmentStatus;
  dataUrl?: string;
  textContent?: string;
  previewUrl?: string;
  stub?: boolean;
  width?: number;
  height?: number;
  error?: string;
  sizeBytes?: number;
  progress?: number;
  pageCount?: number;
  extractedChars?: number;
  extractedTruncated?: boolean;
  extractionStatus?: ExtractionStatus;
  visionPages?: number;
  source?: "pdf-page";
  pageNumber?: number;
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
  kind?: AttachmentKind;
  dataUrl?: string;
  textContent?: string;
  source?: "pdf-page";
  pageNumber?: number;
}

export interface ApiTurn {
  role: "user" | "assistant";
  content: string;
  attachments?: ApiAttachment[];
}

export interface ChatRequestBody {
  messages: ApiTurn[];
  model?: string;
}
