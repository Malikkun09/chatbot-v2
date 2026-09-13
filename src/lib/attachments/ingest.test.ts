import { describe, expect, it } from "vitest";
import { documentStub, mergeAttachmentText } from "./ingest";
import type { Attachment } from "@/lib/chat/types";

describe("mergeAttachmentText", () => {
  it("inlines text files and stubs binary documents", () => {
    const attachments: Attachment[] = [
      {
        id: "1",
        kind: "text",
        name: "notes.txt",
        mimeType: "text/plain",
        status: "ready",
        textContent: "hello world",
      },
      {
        id: "2",
        kind: "document",
        name: "brief.pdf",
        mimeType: "application/pdf",
        status: "ready",
        sizeBytes: 2048,
      },
    ];
    const merged = mergeAttachmentText("Summarize this", attachments);
    expect(merged).toContain("Summarize this");
    expect(merged).toContain("hello world");
    expect(merged).toContain("```txt");
    expect(merged).toContain(documentStub(attachments[1]!));
    expect(merged).toMatch(/binary is not sent/i);
  });
});
