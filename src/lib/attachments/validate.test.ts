import { describe, expect, it } from "vitest";
import { MAX_PDF_BYTES } from "./config";
import { classifyFile, hasImageAttachments, isImageAttachment } from "./validate";

function file(name: string, type: string, size = 12) {
  return new File([new Uint8Array(size)], name, { type });
}

describe("classifyFile", () => {
  it("accepts images, text, and PDFs", () => {
    expect(classifyFile(file("shot.png", "image/png"))).toEqual({ kind: "image" });
    expect(classifyFile(file("notes.txt", "text/plain"))).toEqual({ kind: "text" });
    expect(classifyFile(file("brief.pdf", "application/pdf"))).toEqual({ kind: "document" });
  });

  it("rejects oversize and unknown types", () => {
    const huge = classifyFile(file("big.png", "image/png", 13_000_000));
    expect(huge.kind).toBe("image");
    expect(huge.error).toMatch(/too large/i);

    const hugePdf = classifyFile({
      name: "book.pdf",
      type: "application/pdf",
      size: MAX_PDF_BYTES + 1,
    });
    expect(hugePdf.kind).toBe("document");
    expect(hugePdf.error).toMatch(/max 2MB/i);

    const exe = classifyFile(file("tool.exe", "application/x-msdownload"));
    expect(exe.error).toMatch(/not supported/i);
  });
});

describe("hasImageAttachments", () => {
  it("detects images and ignores PDF data URLs", () => {
    expect(
      hasImageAttachments([{ kind: "image", dataUrl: "data:image/png;base64,aa" }]),
    ).toBe(true);
    expect(hasImageAttachments([{ kind: "text" }])).toBe(false);
    expect(
      isImageAttachment({
        kind: "document",
        mimeType: "application/pdf",
        name: "brief.pdf",
        dataUrl: "data:application/pdf;base64,JVBERi0x",
      }),
    ).toBe(false);
    expect(
      hasImageAttachments([
        {
          kind: "document",
          mimeType: "application/pdf",
          name: "brief.pdf",
          dataUrl: "data:application/pdf;base64,JVBERi0x",
        },
      ]),
    ).toBe(false);
  });
});
