import { describe, expect, it } from "vitest";
import {
  DEFAULT_MODEL_ID,
  getCatalogModel,
  isCatalogModelId,
  MODEL_CATALOG,
  textModels,
  visionModels,
} from "./catalog";

describe("model catalog", () => {
  it("defaults to the multimodal Omni model", () => {
    expect(DEFAULT_MODEL_ID).toBe(
      "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    );
    expect(getCatalogModel(DEFAULT_MODEL_ID).multimodal).toBe(true);
  });

  it("lists picker models with honest capabilities", () => {
    expect(MODEL_CATALOG).toHaveLength(4);
    expect(visionModels()).toHaveLength(2);
    expect(textModels()).toHaveLength(2);
    expect(MODEL_CATALOG.find((model) => model.id.includes("ultra"))?.hint).toMatch(/slow/i);
    expect(MODEL_CATALOG.find((model) => model.id.includes("super"))?.hint).toMatch(/fastest/i);
  });

  it("treats unknown ids as not in the picker catalog", () => {
    expect(isCatalogModelId("totally-unknown")).toBe(false);
    expect(getCatalogModel("totally-unknown").id).toBe(DEFAULT_MODEL_ID);
  });
});
