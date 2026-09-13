import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL_ID } from "./catalog";
import { resolveModel } from "./routing";
import { resolveVisionFallback } from "./vision-fallback";

describe("resolveVisionFallback", () => {
  it("keeps a vision model when page images are present", () => {
    const current = resolveModel(DEFAULT_MODEL_ID);
    const result = resolveVisionFallback(current, 2);
    expect(result.switched).toBe(false);
    expect(result.model.id).toBe(current.id);
    expect(result.model.multimodal).toBe(true);
  });

  it("switches Super to Omni for this request only", () => {
    const current = resolveModel("nvidia/nemotron-3-super-120b-a12b:free");
    expect(current.multimodal).toBe(false);
    const result = resolveVisionFallback(current, 1);
    expect(result.switched).toBe(true);
    expect(result.model.id).toBe(DEFAULT_MODEL_ID);
    expect(result.model.multimodal).toBe(true);
  });

  it("does not switch when no page images were produced", () => {
    const current = resolveModel("nvidia/nemotron-3-ultra-550b-a55b:free");
    const result = resolveVisionFallback(current, 0);
    expect(result.switched).toBe(false);
    expect(result.model.id).toBe(current.id);
  });
});
