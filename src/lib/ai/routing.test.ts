import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL_ID } from "./catalog";
import { resolveModel } from "./routing";

describe("resolveModel", () => {
  it("sends :free catalog models to OpenRouter", () => {
    const route = resolveModel(DEFAULT_MODEL_ID);
    expect(route.provider).toBe("openrouter");
    expect(route.id).toBe(DEFAULT_MODEL_ID);
    expect(route.multimodal).toBe(true);
  });

  it("sends the text-only Ultra model to OpenRouter without vision", () => {
    const route = resolveModel("nvidia/nemotron-3-ultra-550b-a55b:free");
    expect(route.provider).toBe("openrouter");
    expect(route.multimodal).toBe(false);
  });

  it("keeps NVIDIA NIM for non-:free / direct ids", () => {
    const route = resolveModel("nvidia/nemotron-3-nano-omni-30b-a3b-reasoning");
    expect(route.provider).toBe("nvidia");
    expect(route.multimodal).toBe(true);
  });

  it("falls back to the default catalog model for unknown ids", () => {
    const route = resolveModel("garbage-model");
    expect(route.id).toBe(DEFAULT_MODEL_ID);
    expect(route.provider).toBe("openrouter");
  });
});
