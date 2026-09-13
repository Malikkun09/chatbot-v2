import { nvidiaModel } from "@/lib/ai/config";
import { createNvidiaProvider } from "@/lib/ai/nvidia";
import { createOpenRouterProvider } from "@/lib/ai/openrouter";
import { resolveModel, type ResolvedModel } from "@/lib/ai/routing";
import type { ChatProvider } from "@/lib/ai/types";

export function getChatProvider(requested?: string): { provider: ChatProvider; model: ResolvedModel } {
  const model = resolveModel(requested, nvidiaModel());
  if (model.provider === "openrouter") {
    return { provider: createOpenRouterProvider(model), model };
  }
  return { provider: createNvidiaProvider(model.id), model };
}
