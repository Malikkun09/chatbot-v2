import {
  DOCUMENT_EXTENSIONS,
  DOCUMENT_MIME_ALLOW,
  IMAGE_EXTENSIONS,
  MAX_DOCUMENT_BYTES,
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
  items: Array<{ kind?: AttachmentKind; dataUrl?: string }> | undefined,
): boolean {
  return Boolean(items?.some((item) => item.kind === "image" || Boolean(item.dataUrl)));
}
