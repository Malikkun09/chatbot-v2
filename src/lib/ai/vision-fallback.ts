import { defaultVisionModel } from "@/lib/ai/catalog";
import { resolveModel, type ResolvedModel } from "@/lib/ai/routing";

export function resolveVisionFallback(
  current: ResolvedModel,
  visionPages: number,
): { model: ResolvedModel; switched: boolean } {
  if (visionPages <= 0 || current.multimodal) {
    return { model: current, switched: false };
  }
  return { model: resolveModel(defaultVisionModel().id), switched: true };
}
