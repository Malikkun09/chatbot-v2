import { SYSTEM_PROMPT } from "@/lib/chat/prompt";
import type { ApiTurn } from "@/lib/chat/types";
import type { NvidiaChatMessage, NvidiaContentPart } from "@/lib/ai/types";

export function toNvidiaMessages(turns: ApiTurn[]): NvidiaChatMessage[] {
  const messages: NvidiaChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];

  for (const turn of turns) {
    if (turn.role === "assistant") {
      messages.push({ role: "assistant", content: turn.content });
      continue;
    }

    const images = turn.attachments?.filter((item) => item.dataUrl) ?? [];
    if (images.length === 0) {
      messages.push({ role: "user", content: turn.content || "(empty)" });
      continue;
    }

    const parts: NvidiaContentPart[] = [];
    if (turn.content.trim()) {
      parts.push({ type: "text", text: turn.content });
    }
    for (const image of images) {
      parts.push({ type: "image_url", image_url: { url: image.dataUrl as string } });
    }
    messages.push({ role: "user", content: parts });
  }

  return messages;
}
