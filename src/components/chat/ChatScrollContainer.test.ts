import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("chat scroll architecture", () => {
  it("does not call scrollIntoView from message list updates", () => {
    const messages = readFileSync("src/components/chat/ChatMessages.tsx", "utf8");
    const shell = readFileSync("src/components/chat/ChatShell.tsx", "utf8");
    const scroller = readFileSync("src/components/chat/ChatScrollContainer.tsx", "utf8");
    expect(messages).not.toContain("scrollIntoView");
    expect(shell).not.toContain("scrollIntoView");
    expect(scroller).not.toContain("scrollIntoView");
    expect(scroller).toContain("scrollTop");
  });
});
