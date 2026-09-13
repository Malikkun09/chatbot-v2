import { describe, expect, it } from "vitest";
import { classifyHttpStatus, errorMessage } from "@/lib/chat/errors";
import { safeHref, safeImageSrc } from "@/lib/markdown/safe-url";

describe("errors", () => {
  it("maps provider statuses to human categories", () => {
    expect(classifyHttpStatus(401)).toBe("bad_key");
    expect(classifyHttpStatus(429)).toBe("rate_limit");
    expect(classifyHttpStatus(413)).toBe("payload_too_large");
    expect(classifyHttpStatus(503)).toBe("provider_down");
    expect(errorMessage("timeout")).toMatch(/too long/i);
  });
});

describe("safe urls", () => {
  it("blocks javascript and data hrefs", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("https://malikfajar.me")).toBe("https://malikfajar.me");
    expect(safeImageSrc("javascript:x")).toBeNull();
    expect(safeImageSrc("https://example.com/a.png")).toBeTruthy();
  });
});
