import { afterEach, describe, expect, it } from "vitest";
import { clearKeyCooldowns, isKeyCooling, markKeyCooldown, preferFreshKeys } from "./cooldown";

describe("key cooldown", () => {
  afterEach(() => {
    clearKeyCooldowns();
  });

  it("skips cooling keys when a fresh one exists", () => {
    markKeyCooldown("hot", 10_000);
    expect(isKeyCooling("hot")).toBe(true);
    expect(preferFreshKeys(["hot", "cold"])).toEqual(["cold"]);
  });

  it("falls back to the cooling set when every key is cooling", () => {
    markKeyCooldown("a", 10_000);
    markKeyCooldown("b", 10_000);
    expect(preferFreshKeys(["a", "b"])).toEqual(["a", "b"]);
  });
});
