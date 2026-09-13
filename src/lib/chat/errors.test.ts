import { describe, expect, it } from "vitest";
import {
  canFailover,
  classifyHttpStatus,
  classifyProviderError,
  errorMessage,
  makeError,
} from "./errors";

describe("classifyHttpStatus", () => {
  it("maps common HTTP statuses", () => {
    expect(classifyHttpStatus(401)).toBe("auth");
    expect(classifyHttpStatus(429)).toBe("rate_limited");
    expect(classifyHttpStatus(503)).toBe("temporary_provider_error");
    expect(classifyHttpStatus(400)).toBe("invalid_request");
  });
});

describe("classifyProviderError", () => {
  it("reads provider error bodies", () => {
    expect(
      classifyProviderError(400, JSON.stringify({ error: { code: "context_length_exceeded" } })),
    ).toBe("context_limit");
    expect(classifyProviderError(400, "blocked by content policy")).toBe("content_policy");
    expect(classifyProviderError(404, "model not found")).toBe("model_unavailable");
  });
});

describe("errorMessage", () => {
  it("never dumps stack traces", () => {
    const msg = errorMessage("unknown");
    expect(msg).not.toMatch(/at foo/);
    expect(msg.length).toBeLessThan(280);
    expect(makeError("unknown", "Error: boom\n    at foo.ts:12:3").message).not.toMatch(/at foo/);
  });

  it("keeps auth copy provider-specific", () => {
    expect(errorMessage("auth", "openrouter")).toMatch(/OpenRouter/);
    expect(errorMessage("auth", "nvidia")).toMatch(/NVIDIA/);
  });
});

describe("canFailover", () => {
  it("allows failover only before tokens and never after cancel", () => {
    expect(canFailover({ aborted: false, sawToken: false, hasMoreKeys: true, status: 429 })).toBe(
      true,
    );
    expect(canFailover({ aborted: false, sawToken: true, hasMoreKeys: true, status: 429 })).toBe(
      false,
    );
    expect(canFailover({ aborted: false, sawToken: false, hasMoreKeys: true, status: 400 })).toBe(
      false,
    );
    expect(canFailover({ aborted: true, sawToken: false, hasMoreKeys: true, status: 429 })).toBe(
      false,
    );
  });
});
