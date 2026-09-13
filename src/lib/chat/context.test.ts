import { describe, expect, it } from "vitest";
import { fitPayload, isPayloadTooLarge, toApiTurns, trimTurns } from "@/lib/chat/context";
import { MAX_REQUEST_BYTES } from "@/lib/constants";
import type { ChatMessage } from "@/lib/chat/types";

function msg(
  partial: Pick<ChatMessage, "role" | "content"> & Partial<ChatMessage>,
): ChatMessage {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    status: "completed",
    createdAt: Date.now(),
    ...partial,
  };
}

describe("context trim", () => {
  it("keeps recent turns and stubs older ones", () => {
    const messages = Array.from({ length: 24 }, (_, index) =>
      msg({
        role: index % 2 === 0 ? "user" : "assistant",
        content: `turn ${index} ${"x".repeat(20)}`,
      }),
    );
    const turns = trimTurns(toApiTurns(messages), 4);
    expect(turns[0]?.content).toContain("Earlier conversation");
    expect(turns.length).toBe(5);
  });

  it("does not resend older image payloads", () => {
    const messages: ChatMessage[] = [
      msg({
        role: "user",
        content: "look at this",
        attachments: [
          {
            id: "1",
            name: "old.png",
            mimeType: "image/png",
            dataUrl: `data:image/png;base64,${"A".repeat(2000)}`,
          },
        ],
      }),
      msg({ role: "assistant", content: "ok" }),
      msg({
        role: "user",
        content: "and this",
        attachments: [
          {
            id: "2",
            name: "new.jpg",
            mimeType: "image/jpeg",
            dataUrl: "data:image/jpeg;base64,BBB",
          },
        ],
      }),
    ];
    const turns = toApiTurns(messages);
    expect(turns[0]?.attachments).toBeUndefined();
    expect(turns[0]?.content).toContain("old.png");
    expect(turns[2]?.attachments?.[0]?.dataUrl).toContain("BBB");
  });

  it("fits oversized payloads under the function limit", () => {
    const huge = `data:image/jpeg;base64,${"B".repeat(800_000)}`;
    const messages: ChatMessage[] = Array.from({ length: 20 }, (_, index) =>
      msg({
        role: index % 2 === 0 ? "user" : "assistant",
        content: "n".repeat(50_000),
        attachments:
          index % 2 === 0
            ? [{ id: String(index), name: "pic.jpg", mimeType: "image/jpeg", dataUrl: huge }]
            : undefined,
      }),
    );
    const fitted = fitPayload(messages, 50_000);
    expect(fitted.truncated).toBe(true);
    expect(fitted.bytes).toBeLessThanOrEqual(50_000);
  });

  it("flags FUNCTION_PAYLOAD_TOO_LARGE sizes", () => {
    expect(isPayloadTooLarge(MAX_REQUEST_BYTES + 1)).toBe(true);
    expect(isPayloadTooLarge(12)).toBe(false);
  });
});
