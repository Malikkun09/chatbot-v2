import { describe, expect, it } from "vitest";
import {
  isNearBottom,
  nextFollowMode,
  shouldShowJump,
  shouldStickToBottom,
} from "./follow";

describe("scroll follow helpers", () => {
  it("treats the bottom as near when within the threshold", () => {
    expect(isNearBottom({ scrollTop: 0, clientHeight: 400, scrollHeight: 400 })).toBe(true);
    expect(isNearBottom({ scrollTop: 304, clientHeight: 400, scrollHeight: 800 }, 96)).toBe(true);
    expect(isNearBottom({ scrollTop: 0, clientHeight: 400, scrollHeight: 800 }, 96)).toBe(false);
  });

  it("keeps following while the user stays near the bottom", () => {
    expect(
      nextFollowMode({ current: "follow", nearBottom: true, source: "user-scroll" }),
    ).toBe("follow");
    expect(
      nextFollowMode({ current: "follow", nearBottom: false, source: "user-scroll" }),
    ).toBe("paused");
    expect(
      nextFollowMode({ current: "paused", nearBottom: true, source: "user-scroll" }),
    ).toBe("follow");
    expect(
      nextFollowMode({ current: "paused", nearBottom: false, source: "programmatic" }),
    ).toBe("paused");
  });

  it("never auto-scrolls while paused", () => {
    expect(shouldStickToBottom("paused")).toBe(false);
    expect(shouldStickToBottom("follow")).toBe(true);
  });

  it("shows jump-to-latest only when paused with new content", () => {
    expect(shouldShowJump("paused", true)).toBe(true);
    expect(shouldShowJump("paused", false)).toBe(false);
    expect(shouldShowJump("follow", true)).toBe(false);
  });
});
