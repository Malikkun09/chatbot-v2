import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_MODEL_ID } from "@/lib/ai/catalog";
import { SESSION_MODEL_KEY } from "@/lib/ai/constants";
import { loadSelectedModel, saveSelectedModel } from "./model-preference";

describe("model preference", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("defaults to Omni when nothing is stored", () => {
    expect(loadSelectedModel()).toBe(DEFAULT_MODEL_ID);
  });

  it("persists a catalog id and ignores unknown ids", () => {
    saveSelectedModel("nvidia/nemotron-3-super-120b-a12b:free");
    expect(sessionStorage.getItem(SESSION_MODEL_KEY)).toContain("super");
    expect(loadSelectedModel()).toBe("nvidia/nemotron-3-super-120b-a12b:free");

    sessionStorage.setItem(SESSION_MODEL_KEY, "not-a-model");
    expect(loadSelectedModel()).toBe(DEFAULT_MODEL_ID);
  });
});
