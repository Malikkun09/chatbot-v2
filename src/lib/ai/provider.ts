import { createNvidiaProvider } from "@/lib/ai/nvidia";
import type { ChatProvider } from "@/lib/ai/types";

/** Single factory so a future provider can replace NVIDIA without touching the route. */
export function getChatProvider(): ChatProvider {
  return createNvidiaProvider();
}
