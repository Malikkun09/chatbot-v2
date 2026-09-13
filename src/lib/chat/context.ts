import {
  MAX_REQUEST_BYTES,
  RECENT_MESSAGE_COUNT,
  STUB_CHARS,
} from "@/lib/constants";
import type { ApiTurn, ChatMessage } from "@/lib/chat/types";

export function estimatePayloadBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

function clip(text: string, max = STUB_CHARS): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

function formatStub(turn: ApiTurn): string {
  const who = turn.role === "user" ? "User" : "Assistant";
  return `${who}: ${clip(turn.content)}`;
}

function lastUserIndex(turns: ApiTurn[]): number {
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    if (turns[i]?.role === "user") return i;
  }
  return -1;
}

export function toApiTurns(messages: ChatMessage[]): ApiTurn[] {
  const filtered = messages.filter((message) => {
    if (message.role === "system") return false;
    if (message.role === "assistant" && (message.status === "streaming" || message.status === "submitting")) {
      return false;
    }
    return message.role === "user" || message.role === "assistant";
  });

  const lastUser = filtered.reduce((acc, message, index) => {
    return message.role === "user" ? index : acc;
  }, -1);

  return filtered.map((message, index) => {
    const allowImages = message.role === "user" && index === lastUser;
    const stubs =
      !allowImages && message.attachments?.length
        ? message.attachments.map((attachment) => `[Attached image: ${attachment.name}]`).join(" ")
        : "";
    const content = [message.content, stubs].filter(Boolean).join("\n\n").trim();

    return {
      role: message.role === "assistant" ? "assistant" : "user",
      content,
      attachments: allowImages
        ? message.attachments
            ?.filter((attachment) => attachment.dataUrl && !attachment.stub)
            .map((attachment) => ({
              name: attachment.name,
              mimeType: attachment.mimeType,
              dataUrl: attachment.dataUrl,
            }))
        : undefined,
    };
  });
}

export function trimTurns(turns: ApiTurn[], recentCount = RECENT_MESSAGE_COUNT): ApiTurn[] {
  if (turns.length <= recentCount) return turns;
  const recent = turns.slice(-recentCount);
  const older = turns.slice(0, -recentCount);
  const stub: ApiTurn = {
    role: "user",
    content: `[Earlier conversation, summarized]\n${older.map(formatStub).join("\n")}`,
  };
  return [stub, ...recent];
}

function shrinkTurn(turn: ApiTurn): ApiTurn {
  const nextContent = clip(turn.content, Math.min(STUB_CHARS, Math.max(32, Math.floor(turn.content.length / 2))));
  return {
    ...turn,
    attachments: undefined,
    content: nextContent,
  };
}

function stripOldest(turns: ApiTurn[]): ApiTurn[] {
  if (turns.length <= 1) {
    const only = turns[0];
    if (!only) return turns;
    return [shrinkTurn(only)];
  }
  return turns.slice(1);
}

export function fitPayload(
  messages: ChatMessage[],
  maxBytes = MAX_REQUEST_BYTES,
): { turns: ApiTurn[]; truncated: boolean; bytes: number } {
  const original = toApiTurns(messages);
  let turns = trimTurns(original);
  let truncated = turns.length < original.length;

  const sizeOf = () => estimatePayloadBytes({ messages: turns });

  while (sizeOf() > maxBytes && turns.length > 0) {
    truncated = true;
    const next = stripOldest(turns);
    const unchanged =
      next.length === turns.length &&
      next[0]?.content === turns[0]?.content &&
      (next[0]?.attachments?.length ?? 0) === (turns[0]?.attachments?.length ?? 0);
    turns = next;
    if (unchanged) break;
  }

  if (sizeOf() > maxBytes) {
    truncated = true;
    const keepImagesAt = lastUserIndex(turns);
    turns = turns.map((turn, index) =>
      index === keepImagesAt
        ? { ...turn, attachments: turn.attachments?.slice(0, 1) }
        : { ...turn, attachments: undefined },
    );
  }

  if (sizeOf() > maxBytes) {
    truncated = true;
    turns = turns.map((turn) => ({ ...turn, attachments: undefined }));
  }

  return { turns, truncated, bytes: sizeOf() };
}

export function isPayloadTooLarge(bytes: number, maxBytes = MAX_REQUEST_BYTES): boolean {
  return bytes > maxBytes;
}
