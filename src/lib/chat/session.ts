import { SESSION_MAX_BYTES, SESSION_STORAGE_KEY } from "@/lib/constants";
import type { ChatMessage } from "@/lib/chat/types";

function stubImages(messages: ChatMessage[]): ChatMessage[] {
  const lastUser = messages.reduce((acc, message, index) => {
    return message.role === "user" ? index : acc;
  }, -1);

  return messages.map((message, index) => {
    if (!message.attachments?.length || index === lastUser) return message;
    return {
      ...message,
      attachments: message.attachments.map((attachment) => ({
        ...attachment,
        dataUrl: undefined,
        stub: true,
      })),
    };
  });
}

function freezeStatus(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((message) => {
    if (message.status === "streaming" || message.status === "submitting") {
      return { ...message, status: "cancelled" as const };
    }
    return message;
  });
}

export function serializeSession(messages: ChatMessage[]): string {
  const prepared = stubImages(freezeStatus(messages));
  let payload = JSON.stringify(prepared);
  if (payload.length <= SESSION_MAX_BYTES) return payload;

  const lastUser = prepared.reduce((acc, message, index) => {
    return message.role === "user" ? index : acc;
  }, -1);
  const stripped = prepared.map((message, index) => {
    const isLastUser = message.role === "user" && index === lastUser;
    if (isLastUser) return message;
    return {
      ...message,
      attachments: message.attachments?.map((attachment) => ({
        ...attachment,
        dataUrl: undefined,
        stub: true,
      })),
    };
  });
  payload = JSON.stringify(stripped);
  if (payload.length <= SESSION_MAX_BYTES) return payload;

  return JSON.stringify(
    stripped.map((message) => ({
      ...message,
      thinking: undefined,
      attachments: undefined,
      content: message.content.slice(0, 4000),
    })),
  );
}

export function loadSession(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isChatMessage);
  } catch {
    return [];
  }
}

export function saveSession(messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, serializeSession(messages));
  } catch {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore quota / private mode
    }
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    (record.role === "user" || record.role === "assistant" || record.role === "system") &&
    typeof record.content === "string" &&
    typeof record.createdAt === "number"
  );
}
