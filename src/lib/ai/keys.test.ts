import { describe, expect, it } from "vitest";
import { parseKeys, rotateKeys, shouldFailover } from "./keys";

describe("parseKeys", () => {
  it("splits comma-separated keys and drops empties", () => {
    expect(parseKeys(undefined, " a, b , ,c ")).toEqual(["a", "b", "c"]);
  });

  it("puts the primary key first without duplicating", () => {
    expect(parseKeys("a", "a, b")).toEqual(["a", "b"]);
    expect(parseKeys("z", "a, b")).toEqual(["z", "a", "b"]);
  });
});

describe("rotateKeys", () => {
  it("rotates up to the max attempts", () => {
    const rotated = rotateKeys(["a", "b", "c", "d"], 3, () => 0);
    expect(rotated).toEqual(["a", "b", "c"]);
    expect(new Set(rotateKeys(["a", "b"], 3)).size).toBe(2);
  });
});

describe("shouldFailover", () => {
  it("fails over on retryable statuses and auth", () => {
    expect(shouldFailover(401)).toBe(true);
    expect(shouldFailover(429)).toBe(true);
    expect(shouldFailover(503)).toBe(true);
    expect(shouldFailover(400)).toBe(false);
  });
});
