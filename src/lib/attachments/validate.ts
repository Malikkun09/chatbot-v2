import {
  DOCUMENT_EXTENSIONS,
  DOCUMENT_MIME_ALLOW,
  IMAGE_EXTENSIONS,
  MAX_DOCUMENT_BYTES,
  MAX_PDF_BYTES,
  MAX_SOURCE_IMAGE_BYTES,
  MAX_TEXT_FILE_BYTES,
  TEXT_EXTENSIONS,
  TEXT_MIME_ALLOW,
} from "@/lib/attachments/config";
import type { AttachmentKind } from "@/lib/chat/types";

export interface FileLike {
  name: string;
  type: string;
  size: number;
}

export interface ClassifiedFile {
  kind: AttachmentKind;
  error?: string;
}

function extension(name: string): string {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? (parts.pop() ?? "") : "";
}

export function isPdfAttachment(item: {
  kind?: AttachmentKind;
  mimeType?: string;
  name?: string;
}): boolean {
  const mime = (item.mimeType ?? "").toLowerCase();
  const name = (item.name ?? "").toLowerCase();
  return mime === "application/pdf" || name.endsWith(".pdf");
}

export function isTextAttachment(item: {
  kind?: AttachmentKind;
  mimeType?: string;
  name?: string;
}): boolean {
  if (item.kind === "text") return true;
  const mime = (item.mimeType ?? "").toLowerCase();
  const name = (item.name ?? "").toLowerCase();
  const ext = extension(name);
  return TEXT_MIME_ALLOW.has(mime) || TEXT_EXTENSIONS.has(ext);
}

export function isImageAttachment(item: {
  kind?: AttachmentKind;
  mimeType?: string;
  name?: string;
  dataUrl?: string;
}): boolean {
  if (item.kind === "image") return true;
  if (item.kind === "text" || item.kind === "document") return false;
  if (isPdfAttachment(item) || isTextAttachment(item)) return false;
  const mime = (item.mimeType ?? "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  return Boolean(item.dataUrl?.startsWith("data:image/"));
}

export function classifyFile(file: FileLike): ClassifiedFile {
  const ext = extension(file.name);
  const mime = (file.type || "").toLowerCase();

  const isImage = mime.startsWith("image/") || IMAGE_EXTENSIONS.has(ext);
  const isText = TEXT_MIME_ALLOW.has(mime) || TEXT_EXTENSIONS.has(ext);
  const isDocument = DOCUMENT_MIME_ALLOW.has(mime) || DOCUMENT_EXTENSIONS.has(ext);

  if (isImage) {
    if (file.size > MAX_SOURCE_IMAGE_BYTES) {
      return { kind: "image", error: "Image is too large to attach (max 12MB before compression)." };
    }
    return { kind: "image" };
  }

  if (isText) {
    if (file.size > MAX_TEXT_FILE_BYTES) {
      return { kind: "text", error: "Text file is too large (max 80KB). Trim it or paste an excerpt." };
    }
    return { kind: "text" };
  }

  if (isDocument) {
    if (isPdfAttachment({ name: file.name, mimeType: mime })) {
      if (file.size > MAX_PDF_BYTES) {
        return {
          kind: "document",
          error: "PDF is too large to send (max 2MB). Try a smaller file or fewer pages.",
        };
      }
      return { kind: "document" };
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      return { kind: "document", error: "Document is too large to attach (max 8MB)." };
    }
    return { kind: "document" };
  }

  return {
    kind: "document",
    error: "This file type is not supported. Attach an image, text/JSON, or PDF.",
  };
}

export function hasImageAttachments(
  items:
    | Array<{ kind?: AttachmentKind; mimeType?: string; name?: string; dataUrl?: string }>
    | undefined,
): boolean {
  return Boolean(items?.some((item) => isImageAttachment(item)));
}
