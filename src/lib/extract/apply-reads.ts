import { isPdfAttachment } from "@/lib/attachments/validate";
import type { ChatMessage } from "@/lib/chat/types";
import type { DocumentReadInfo } from "@/lib/extract/types";

export function applyDocumentReads(messages: ChatMessage[], items: DocumentReadInfo[]): ChatMessage[] {
  if (!items.length) return messages;
  let lastUser = -1;
  for (let index = 0; index < messages.length; index += 1) {
    if (messages[index]?.role === "user") lastUser = index;
  }
  if (lastUser < 0) return messages;

  const queue = [...items];
  return messages.map((message, index) => {
    if (index !== lastUser || !message.attachments?.length) return message;
    return {
      ...message,
      attachments: message.attachments.map((attachment) => {
        if (!isPdfAttachment(attachment)) return attachment;
        const match = queue.findIndex((item) => item.name === attachment.name);
        const info = match >= 0 ? queue.splice(match, 1)[0] : undefined;
        if (!info) return attachment;
        const usedVision = (info.visionPages ?? 0) > 0;
        return {
          ...attachment,
          dataUrl: info.status === "ok" ? undefined : attachment.dataUrl,
          textContent: info.text ?? attachment.textContent,
          extractionStatus: info.status,
          pageCount: info.pageCount,
          extractedChars: info.chars,
          extractedTruncated: info.truncated,
          visionPages: info.visionPages,
          error: usedVision || info.status === "ok" ? undefined : info.message,
        };
      }),
    };
  });
}
