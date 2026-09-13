import { describe, expect, it } from "vitest";
import { classifyFile, hasImageAttachments } from "./validate";

function file(name: string, type: string, size = 12) {
  return new File([new Uint8Array(size)], name, { type });
}

describe("classifyFile", () => {
  it("accepts images, text, and document stubs", () => {
    expect(classifyFile(file("shot.png", "image/png"))).toEqual({ kind: "image" });
    expect(classifyFile(file("notes.txt", "text/plain"))).toEqual({ kind: "text" });
    expect(classifyFile(file("brief.pdf", "application/pdf"))).toEqual({ kind: "document" });
  });

  it("rejects oversize and unknown types", () => {
    const huge = classifyFile(file("big.png", "image/png", 13_000_000));
    expect(huge.kind).toBe("image");
    expect(huge.error).toMatch(/too large/i);

    const exe = classifyFile(file("tool.exe", "application/x-msdownload"));
    expect(exe.error).toMatch(/not supported/i);
  });
});

describe("hasImageAttachments", () => {
  it("detects image attachments on the last user turn", () => {
    expect(
      hasImageAttachments([{ kind: "image", dataUrl: "data:image/png;base64,aa" }]),
    ).toBe(true);
    expect(
      hasImageAttachments([{ kind: "text" }]),
    ).toBe(false);
  });
});
