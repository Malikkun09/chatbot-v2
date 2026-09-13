import { describe, expect, it } from "vitest";
import { attachmentStatusNote } from "./labels";
import type { Attachment } from "@/lib/chat/types";

function pdf(partial: Partial<Attachment> = {}): Attachment {
  return {
    id: "1",
    kind: "document",
    name: "cert.pdf",
    mimeType: "application/pdf",
    status: "ready",
    ...partial,
  };
}

describe("attachmentStatusNote", () => {
  it("shows scanned copy before vision pages are known", () => {
    expect(attachmentStatusNote(pdf({ extractionStatus: "empty" }))).toBe("No text · likely scanned");
  });

  it("shows Vision · N pages after page images were used", () => {
    expect(attachmentStatusNote(pdf({ extractionStatus: "empty", visionPages: 2 }))).toBe(
      "Vision · 2 pages",
    );
    expect(attachmentStatusNote(pdf({ extractionStatus: "empty", visionPages: 1 }))).toBe(
      "Vision · 1 page",
    );
  });
});
