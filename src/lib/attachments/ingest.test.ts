import { describe, expect, it } from "vitest";
import { documentStub, mergeAttachmentText } from "./ingest";
import type { Attachment } from "@/lib/chat/types";

describe("mergeAttachmentText", () => {
  it("inlines text files and leaves PDF bytes for the server", () => {
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
        dataUrl: "data:application/pdf;base64,JVBERi0x",
      },
    ];
    const merged = mergeAttachmentText("Summarize this", attachments);
    expect(merged).toContain("Summarize this");
    expect(merged).toContain("hello world");
    expect(merged).toContain("```txt");
    expect(merged).not.toMatch(/binary is not sent/i);
    expect(merged).not.toContain("Document: brief.pdf");
  });

  it("injects already-extracted PDF text as a Document block", () => {
    const attachments: Attachment[] = [
      {
        id: "2",
        kind: "document",
        name: "brief.pdf",
        mimeType: "application/pdf",
        status: "ready",
        textContent: "Hello Chatbot V2",
        extractionStatus: "ok",
        pageCount: 1,
        extractedChars: 16,
      },
    ];
    const merged = mergeAttachmentText("ringkasin", attachments);
    expect(merged).toContain("Document: brief.pdf");
    expect(merged).toContain("Hello Chatbot V2");
    expect(merged).toContain("ringkasin");
  });

  it("stubs non-PDF office files as metadata", () => {
    const docx: Attachment = {
      id: "3",
      kind: "document",
      name: "essay.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      status: "ready",
      sizeBytes: 4096,
    };
    expect(mergeAttachmentText("hi", [docx])).toContain(documentStub(docx));
    expect(documentStub(docx)).toMatch(/not parsed/i);
  });
});
