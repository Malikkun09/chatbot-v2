import { extractText, getDocumentProxy } from "unpdf";
import { MAX_EXTRACTED_TEXT_CHARS } from "@/lib/attachments/config";
import { decodeAttachmentBytes, looksLikePdf } from "@/lib/extract/bytes";
import { capExtractedText } from "@/lib/extract/format";
import type { PdfExtractResult, PdfExtractStatus } from "@/lib/extract/types";

function ensurePromiseWithResolvers(): void {
  if (typeof Promise.withResolvers === "function") return;
  // pdf.js (via unpdf) needs this; Node 20 and some test hosts omit it.
  Promise.withResolvers = function withResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

function emptyResult(status: PdfExtractStatus, pageCount = 0): PdfExtractResult {
  return { status, text: "", pageCount, chars: 0, truncated: false };
}

export async function extractPdfBytes(
  bytes: Uint8Array,
  maxChars = MAX_EXTRACTED_TEXT_CHARS,
): Promise<PdfExtractResult> {
  if (!looksLikePdf(bytes)) return emptyResult("failed");

  ensurePromiseWithResolvers();

  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | undefined;
  try {
    pdf = await getDocumentProxy(bytes);
    const extracted = await extractText(pdf, { mergePages: true });
    const raw = Array.isArray(extracted.text) ? extracted.text.join("\n\n") : extracted.text;
    const normalized = raw.replace(/\u0000/g, "").trim();
    const pageCount = extracted.totalPages;

    if (!normalized) return emptyResult("empty", pageCount);

    const capped = capExtractedText(normalized, maxChars);
    return {
      status: "ok",
      text: capped.text,
      pageCount,
      chars: normalized.length,
      truncated: capped.truncated,
    };
  } catch {
    return emptyResult("failed");
  } finally {
    try {
      await pdf?.cleanup();
    } catch {
      // ignore cleanup failures
    }
  }
}

export async function extractPdfDataUrl(
  dataUrl: string,
  maxChars = MAX_EXTRACTED_TEXT_CHARS,
): Promise<PdfExtractResult> {
  try {
    return await extractPdfBytes(decodeAttachmentBytes(dataUrl), maxChars);
  } catch {
    return emptyResult("failed");
  }
}
