import { describe, expect, it } from "vitest";
import { clampPdfPageAttachments, fitPayload, isPayloadTooLarge, toApiTurns, trimTurns } from "@/lib/chat/context";
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
            kind: "image",
            status: "ready",
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
            kind: "image",
            status: "ready",
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

  it("sends last-user PDF bytes for server extraction and inlines text files", () => {
    const messages: ChatMessage[] = [
      msg({
        role: "user",
        content: "read these",
        attachments: [
          {
            id: "t",
            kind: "text",
            status: "ready",
            name: "notes.txt",
            mimeType: "text/plain",
            textContent: "alpha beta",
          },
          {
            id: "d",
            kind: "document",
            status: "ready",
            name: "brief.pdf",
            mimeType: "application/pdf",
            sizeBytes: 1200,
            dataUrl: "data:application/pdf;base64,JVBERi0x",
          },
        ],
      }),
    ];
    const turns = toApiTurns(messages);
    expect(turns[0]?.content).toContain("alpha beta");
    expect(turns[0]?.content).not.toMatch(/binary is not sent/i);
    expect(turns[0]?.attachments?.some((item) => item.mimeType === "application/pdf")).toBe(true);
    expect(turns[0]?.attachments?.every((item) => item.kind !== "image")).toBe(true);
  });

  it("fits oversized payloads under the function limit", () => {
    const huge = `data:image/jpeg;base64,${"B".repeat(800_000)}`;
    const messages: ChatMessage[] = Array.from({ length: 20 }, (_, index) =>
      msg({
        role: index % 2 === 0 ? "user" : "assistant",
        content: "n".repeat(50_000),
        attachments:
          index % 2 === 0
            ? [{ id: String(index), kind: "image", status: "ready", name: "pic.jpg", mimeType: "image/jpeg", dataUrl: huge }]
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

  it("clamps scanned PDF page images without dropping other files", () => {
    const turns = clampPdfPageAttachments(
      [
        {
          role: "user",
          content: "jelaskan",
          attachments: [
            { name: "shot.png", mimeType: "image/png", kind: "image", dataUrl: "data:image/png;base64,aa" },
            { name: "cert.pdf · page 1", mimeType: "image/jpeg", kind: "image", dataUrl: "p1", source: "pdf-page", pageNumber: 1 },
            { name: "cert.pdf · page 2", mimeType: "image/jpeg", kind: "image", dataUrl: "p2", source: "pdf-page", pageNumber: 2 },
            { name: "cert.pdf · page 3", mimeType: "image/jpeg", kind: "image", dataUrl: "p3", source: "pdf-page", pageNumber: 3 },
          ],
        },
      ],
      2,
    );
    expect(turns[0]?.attachments?.map((item) => item.name)).toEqual([
      "shot.png",
      "cert.pdf · page 1",
      "cert.pdf · page 2",
    ]);
  });
});
