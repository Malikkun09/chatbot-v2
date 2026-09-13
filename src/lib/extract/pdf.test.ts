// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { decodeAttachmentBytes, looksLikePdf } from "./bytes";
import { extractPdfBytes, extractPdfDataUrl } from "./pdf";

const fixturePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/tiny.pdf");

function pad(offset: number): string {
  return String(offset).padStart(10, "0");
}

function buildMinimalPdf(text: string): Uint8Array {
  const escaped = text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const stream = text
    ? `BT /F1 12 Tf 72 720 Td (${escaped}) Tj ET`
    : "BT /F1 12 Tf 72 720 Td ET";
  const objs = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objs) {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += obj;
  }
  const xrefStart = Buffer.byteLength(body, "latin1");
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i += 1) {
    xref += `${pad(offsets[i] as number)} 00000 n \n`;
  }
  body += xref;
  body += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(body, "latin1"));
}

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
