import { describe, expect, it } from "vitest";
import { capExtractedText, formatDocumentContext, formatDocumentVision } from "./format";

describe("capExtractedText", () => {
  it("returns the original text when under the cap", () => {
    expect(capExtractedText("hello", 10)).toEqual({ text: "hello", truncated: false });
  });

  it("truncates with a clear note", () => {
    const result = capExtractedText("abcdefghij", 4);
    expect(result.truncated).toBe(true);
    expect(result.text.startsWith("abcd")).toBe(true);
    expect(result.text).toMatch(/truncated to 4 characters/i);
    expect(result.text.length).toBeGreaterThan(4);
  });
});

describe("formatDocumentContext", () => {
  it("uses the Document: filename header", () => {
    expect(formatDocumentContext("notes.pdf", "Hello")).toBe("Document: notes.pdf\n\nHello");
  });
});

describe("formatDocumentVision", () => {
  it("notes that page images are used instead of asking to paste", () => {
    const text = formatDocumentVision("cert.pdf", 2, 5);
    expect(text).toContain("Document: cert.pdf");
    expect(text).toMatch(/scanned/i);
    expect(text).toMatch(/page images/i);
    expect(text).not.toMatch(/paste the text/i);
    expect(text).toContain("2 of 5");
  });
});
