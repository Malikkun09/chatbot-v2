import { describe, expect, it } from "vitest";
import { createThinkingSplitter, stripThinkingForMarkdown } from "@/lib/ai/thinking";

describe("thinking splitter", () => {
  it("keeps think tags out of the answer", () => {
    const splitter = createThinkingSplitter();
    const a = splitter.push("<think>step");
    const b = splitter.push(" one</think>\n\nAnswer");
    expect(a.thinking + b.thinking).toContain("step one");
    expect(a.content + b.content).toBe("Answer");
  });

  it("holds a partial tag across chunks", () => {
    const splitter = createThinkingSplitter();
    const a = splitter.push("<thi");
    const b = splitter.push("nk>secret</thi");
    const c = splitter.push("nk>Visible");
    expect(a.content + b.content + c.content).toBe("Visible");
    expect(a.thinking + b.thinking + c.thinking).toContain("secret");
  });

  it("strips closed think blocks from leftover markdown", () => {
    expect(stripThinkingForMarkdown("<think>nope</think>\n\nYes")).toBe("Yes");
  });
});
