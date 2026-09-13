import { MAX_EXTRACTED_TEXT_CHARS } from "@/lib/attachments/config";

export function capExtractedText(
  text: string,
  maxChars = MAX_EXTRACTED_TEXT_CHARS,
): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  return {
    text: `${text.slice(0, maxChars).trimEnd()}\n\n[Extracted text truncated to ${maxChars} characters.]`,
    truncated: true,
  };
}

export function formatDocumentContext(filename: string, body: string): string {
  return `Document: ${filename}\n\n${body}`;
}

export function formatDocumentEmpty(filename: string): string {
  return formatDocumentContext(
    filename,
    "[No selectable text was found. This PDF is likely scanned images. Paste the text or attach a text-based PDF.]",
  );
}

export function formatDocumentFailed(filename: string): string {
  return formatDocumentContext(
    filename,
    "[Could not extract text from this PDF. Paste the text or attach a text-based PDF.]",
  );
}
