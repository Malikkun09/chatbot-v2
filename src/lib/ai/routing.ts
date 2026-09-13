import { DEFAULT_NVIDIA_DIRECT_MODEL } from "@/lib/ai/constants";
import {
  DEFAULT_MODEL_ID,
  getCatalogModel,
  isCatalogModelId,
  type CatalogModel,
  type ModelProviderId,
} from "@/lib/ai/catalog";

export interface ResolvedModel extends CatalogModel {
  source: "catalog" | "nvidia-direct";
}

export function isOpenRouterModelId(id: string): boolean {
  return id.includes(":free") || isCatalogModelId(id);
}

export function isNvidiaDirectId(id: string, envModel?: string): boolean {
  if (id.includes(":free")) return false;
  const nim = envModel?.trim() || DEFAULT_NVIDIA_DIRECT_MODEL;
  return id === nim || id === DEFAULT_NVIDIA_DIRECT_MODEL;
}

export function resolveModel(
  requested: string | undefined | null,
  envNvidiaModel?: string,
): ResolvedModel {
  if (requested && isCatalogModelId(requested)) {
    return { ...getCatalogModel(requested), source: "catalog" };
  }
  if (requested && isNvidiaDirectId(requested, envNvidiaModel)) {
    const id = envNvidiaModel?.trim() || requested || DEFAULT_NVIDIA_DIRECT_MODEL;
    return {
      id,
      label: "Nemotron Omni (NIM)",
      hint: "Direct NVIDIA",
      provider: "nvidia",
      multimodal: true,
      reasoning: true,
      source: "nvidia-direct",
    };
  }
  return { ...getCatalogModel(DEFAULT_MODEL_ID), source: "catalog" };
}

export function providerFor(model: ResolvedModel): ModelProviderId {
  return model.provider;
}
