import { describe, expect, it } from "vitest";
import { applyDocumentReads } from "./apply-reads";
import type { ChatMessage } from "@/lib/chat/types";

function userPdf(partial: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "u1",
    role: "user",
    content: "jelaskan",
    status: "completed",
    createdAt: 1,
    attachments: [
      {
        id: "pdf",
        kind: "document",
        name: "cert.pdf",
        mimeType: "application/pdf",
        status: "ready",
        dataUrl: "data:application/pdf;base64,JVBERi0x",
      },
    ],
    ...partial,
  };
}

describe("applyDocumentReads", () => {
  it("keeps PDF bytes for retry when text is empty and vision pages were used", () => {
    const messages: ChatMessage[] = [
      userPdf(),
      { id: "a1", role: "assistant", content: "", status: "streaming", createdAt: 2 },
    ];
    const next = applyDocumentReads(messages, [
      { name: "cert.pdf", status: "empty", pageCount: 2, visionPages: 2 },
    ]);
    const pdf = next[0]?.attachments?.[0];
    expect(pdf?.extractionStatus).toBe("empty");
    expect(pdf?.visionPages).toBe(2);
    expect(pdf?.dataUrl).toContain("JVBERi0x");
    expect(pdf?.error).toBeUndefined();
  });

  it("matches PDFs by filename when a text extract is also in the payload", () => {
    const messages: ChatMessage[] = [userPdf()];
    const next = applyDocumentReads(messages, [
      { name: "notes.txt", status: "ok", chars: 4, text: "hi" },
      { name: "cert.pdf", status: "ok", pageCount: 1, chars: 12, text: "Hello" },
    ]);
    expect(next[0]?.attachments?.[0]?.extractionStatus).toBe("ok");
    expect(next[0]?.attachments?.[0]?.textContent).toBe("Hello");
    expect(next[0]?.attachments?.[0]?.dataUrl).toBeUndefined();
  });
});
