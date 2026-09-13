// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PDF_VISION_MAX_PAGES } from "@/lib/attachments/config";
import { buildMinimalPdf } from "./fixtures/minimal-pdf";
import { pdfPageAttachmentName, renderPdfPageImages } from "./render";

const fixturePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/tiny.pdf");

describe("renderPdfPageImages", () => {
  it("rasterizes a digital fixture page to a compressed JPEG data URL", async () => {
    const bytes = new Uint8Array(readFileSync(fixturePath));
    const result = await renderPdfPageImages(bytes, { maxPages: 1 });
    expect(result.error).toBeUndefined();
    expect(result.pageCount).toBe(1);
    expect(result.pages).toHaveLength(1);
    const page = result.pages[0]!;
    expect(page.pageNumber).toBe(1);
    expect(page.mimeType).toBe("image/jpeg");
    expect(page.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
    expect(page.sizeBytes).toBeGreaterThan(32);
    expect(Math.max(page.width, page.height)).toBeLessThanOrEqual(1440);
  });

  it("rasterizes empty-text PDFs instead of giving up", async () => {
    const result = await renderPdfPageImages(buildMinimalPdf(""), { maxPages: 2 });
    expect(result.pages.length).toBe(1);
    expect(result.pages[0]?.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("caps pages at the hard max", async () => {
    expect(PDF_VISION_MAX_PAGES).toBe(3);
    const result = await renderPdfPageImages(new Uint8Array(readFileSync(fixturePath)), {
      maxPages: 99,
    });
    expect(result.pages.length).toBeLessThanOrEqual(PDF_VISION_MAX_PAGES);
    expect(result.pages.length).toBe(1);
  });

  it("names page attachments for the chip / payload", () => {
    expect(pdfPageAttachmentName("cert.pdf", 2)).toBe("cert.pdf · page 2");
  });
});
