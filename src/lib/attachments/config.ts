export const MAX_ATTACHMENTS = 8;

export const MAX_IMAGE_EDGE = 1440;
export const IMAGE_QUALITY = 0.8;
export const MAX_SOURCE_IMAGE_BYTES = 12 * 1024 * 1024;
export const MAX_COMPRESSED_IMAGE_BYTES = 700_000;

export const MAX_TEXT_FILE_BYTES = 80_000;
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

export const IMAGE_MIME_PREFIX = "image/";

export const TEXT_MIME_ALLOW = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/xml",
  "text/xml",
  "text/html",
]);

export const DOCUMENT_MIME_ALLOW = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const TEXT_EXTENSIONS = new Set(["txt", "md", "csv", "json", "xml", "html", "htm", "log"]);
export const DOCUMENT_EXTENSIONS = new Set(["pdf", "doc", "docx"]);
export const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "bmp", "avif"]);

export const FILE_INPUT_ACCEPT = [
  "image/*",
  ...Array.from(TEXT_MIME_ALLOW),
  ...Array.from(DOCUMENT_MIME_ALLOW),
  ...Array.from(TEXT_EXTENSIONS).map((ext) => `.${ext}`),
  ...Array.from(DOCUMENT_EXTENSIONS).map((ext) => `.${ext}`),
].join(",");
