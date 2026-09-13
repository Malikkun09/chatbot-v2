// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { decodeAttachmentBytes, looksLikePdf } from "./bytes";
import { extractPdfBytes, extractPdfDataUrl } from "./pdf";
import { buildMinimalPdf } from "./fixtures/minimal-pdf";

const fixturePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/tiny.pdf");

describe("extractPdfBytes", () => {
  it("extracts text from a tiny digital PDF fixture", async () => {
    const bytes = new Uint8Array(readFileSync(fixturePath));
    expect(looksLikePdf(bytes)).toBe(true);
    const result = await extractPdfBytes(bytes);
    expect(result.status).toBe("ok");
    expect(result.pageCount).toBe(1);
    expect(result.text).toContain("Hello Chatbot V2");
    expect(result.truncated).toBe(false);
  });

  it("caps extracted text with a truncation note", async () => {
    const bytes = new Uint8Array(readFileSync(fixturePath));
    const result = await extractPdfBytes(bytes, 8);
    expect(result.status).toBe("ok");
    expect(result.truncated).toBe(true);
    expect(result.chars).toBeGreaterThan(8);
    expect(result.text).toMatch(/truncated to 8 characters/i);
  });

  it("marks scanned / empty PDFs", async () => {
    const result = await extractPdfBytes(buildMinimalPdf(""));
    expect(result.status).toBe("empty");
    expect(result.text).toBe("");
    expect(result.pageCount).toBe(1);
  });

  it("fails closed on invalid bytes", async () => {
    const result = await extractPdfBytes(new Uint8Array([1, 2, 3, 4, 5]));
    expect(result.status).toBe("failed");
  });

  it("reads a PDF data URL", async () => {
    const bytes = readFileSync(fixturePath);
    const dataUrl = `data:application/pdf;base64,${Buffer.from(bytes).toString("base64")}`;
    const decoded = decodeAttachmentBytes(dataUrl);
    expect(looksLikePdf(decoded)).toBe(true);
    const result = await extractPdfDataUrl(dataUrl);
    expect(result.status).toBe("ok");
    expect(result.text).toContain("Hello Chatbot V2");
  });
});
