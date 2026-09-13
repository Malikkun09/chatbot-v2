export type ModelProviderId = "openrouter" | "nvidia";

export interface CatalogModel {
  id: string;
  label: string;
  hint: string;
  provider: ModelProviderId;
  multimodal: boolean;
  reasoning: boolean;
}

export const MODEL_CATALOG: readonly CatalogModel[] = [
  {
    id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    label: "Nemotron Omni",
    hint: "Vision · default",
    provider: "openrouter",
    multimodal: true,
    reasoning: true,
  },
  {
    id: "dots-studio/dots-3-note-preview:free",
    label: "Dots 3 Note",
    hint: "Vision",
    provider: "openrouter",
    multimodal: true,
    reasoning: false,
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    label: "Nemotron Ultra",
    hint: "Text · can be slow",
    provider: "openrouter",
    multimodal: false,
    reasoning: true,
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    label: "Nemotron Super",
    hint: "Text · fastest",
    provider: "openrouter",
    multimodal: false,
    reasoning: true,
  },
] as const;

export const DEFAULT_MODEL_ID = MODEL_CATALOG[0].id;

export function getCatalogModel(id: string | undefined | null): CatalogModel {
  if (!id) return MODEL_CATALOG[0];
  return MODEL_CATALOG.find((model) => model.id === id) ?? MODEL_CATALOG[0];
}

export function isCatalogModelId(id: string): boolean {
  return MODEL_CATALOG.some((model) => model.id === id);
}

export function visionModels(): CatalogModel[] {
  return MODEL_CATALOG.filter((model) => model.multimodal);
}

export function textModels(): CatalogModel[] {
  return MODEL_CATALOG.filter((model) => !model.multimodal);
}

export function defaultVisionModel(): CatalogModel {
  return MODEL_CATALOG.find((model) => model.multimodal) ?? MODEL_CATALOG[0];
}
