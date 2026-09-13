import type { Attachment } from "@/lib/chat/types";
import { isPdfAttachment } from "@/lib/attachments/validate";

export function attachmentKindLabel(attachment: Attachment): string {
  if (attachment.kind === "image") return "Image";
  if (attachment.kind === "text") return "Text";
  if (isPdfAttachment(attachment)) return "PDF";
  return "File";
}

export function attachmentProcessingLabel(attachment: Attachment): string | undefined {
  if (attachment.status !== "processing") return undefined;
  return attachment.kind === "image" ? "compressing…" : "reading…";
}

export function attachmentStatusNote(attachment: Attachment): string | undefined {
  if (attachment.kind === "image") return undefined;
  if (attachment.kind === "text") return "Sent as text";
  if (isPdfAttachment(attachment)) {
    if (attachment.visionPages && attachment.visionPages > 0) {
      return `Vision · ${attachment.visionPages} page${attachment.visionPages === 1 ? "" : "s"}`;
    }
    if (attachment.extractionStatus === "ok") {
      const parts = ["Read"];
      if (attachment.pageCount) {
        parts.push(`${attachment.pageCount} page${attachment.pageCount === 1 ? "" : "s"}`);
      }
      if (attachment.extractedChars != null) {
        parts.push(`${attachment.extractedChars.toLocaleString()} chars`);
      }
      if (attachment.extractedTruncated) parts.push("truncated");
      return parts.join(" · ");
    }
    if (attachment.extractionStatus === "empty") return "No text · likely scanned";
    if (attachment.extractionStatus === "failed") return "Could not read";
    return "Text extracted on send";
  }
  return "Metadata only";
}
