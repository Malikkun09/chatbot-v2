import {
  MAX_EXTRACTED_TEXT_CHARS,
  MAX_TEXT_FILE_BYTES,
  PDF_VISION_DEFAULT_PAGES,
} from "@/lib/attachments/config";
import { isPdfAttachment, isTextAttachment } from "@/lib/attachments/validate";
import { errorMessage } from "@/lib/chat/errors";
import type { ApiAttachment, ApiTurn } from "@/lib/chat/types";
import { bytesToUtf8, decodeAttachmentBytes } from "@/lib/extract/bytes";
import {
  capExtractedText,
  formatDocumentContext,
  formatDocumentVision,
} from "@/lib/extract/format";
import { extractPdfDataUrl } from "@/lib/extract/pdf";
import { pdfPageAttachmentName, renderPdfPageImages } from "@/lib/extract/render";
import type {
  DocumentReadInfo,
  HydrationError,
  PdfExtractStatus,
  PdfRenderResult,
} from "@/lib/extract/types";

export type PageRenderer = (
  bytes: Uint8Array,
  options?: { maxPages?: number },
) => Promise<PdfRenderResult>;

export interface HydrateDocumentOptions {
  renderPages?: PageRenderer;
  onStatus?: (message: string) => void;
  maxPages?: number;
}

export interface HydrateDocumentResult {
  turns: ApiTurn[];
  documents: DocumentReadInfo[];
  visionPages: number;
  error?: HydrationError;
}

export function needsDocumentHydration(turns: ApiTurn[]): boolean {
  return turns.some((turn) =>
    turn.attachments?.some(
      (item) => Boolean(item.dataUrl) && (isPdfAttachment(item) || isTextAttachment(item)),
    ),
  );
}

function pdfReadMessage(status: PdfExtractStatus): string | undefined {
  if (status === "empty") {
    return "No selectable text was found. This PDF is likely scanned images.";
  }
  if (status === "failed") {
    return "Could not extract text from this PDF.";
  }
  return undefined;
}

function visionFailure(name: string): HydrationError {
  return {
    category: "pdf_unreadable",
    message: `${name}: ${errorMessage("pdf_unreadable")}`,
  };
}

function pageImagesFromRender(
  filename: string,
  rendered: PdfRenderResult,
): ApiAttachment[] {
  return rendered.pages.map((page) => ({
    name: pdfPageAttachmentName(filename, page.pageNumber),
    mimeType: page.mimeType,
    kind: "image" as const,
    dataUrl: page.dataUrl,
    source: "pdf-page" as const,
    pageNumber: page.pageNumber,
  }));
}

async function hydratePdf(
  attachment: ApiAttachment,
  options: HydrateDocumentOptions,
): Promise<{
  block: string;
  info: DocumentReadInfo;
  images: ApiAttachment[];
  error?: HydrationError;
}> {
  const result = await extractPdfDataUrl(attachment.dataUrl as string);
  if (result.status === "ok") {
    return {
      block: formatDocumentContext(attachment.name, result.text),
      info: {
        name: attachment.name,
        status: "ok",
        pageCount: result.pageCount,
        chars: result.chars,
        truncated: result.truncated,
        text: result.text,
      },
      images: [],
    };
  }

  options.onStatus?.("Reading scanned pages…");
  let bytes: Uint8Array;
  try {
    bytes = decodeAttachmentBytes(attachment.dataUrl as string);
  } catch {
    return {
      block: "",
      info: {
        name: attachment.name,
        status: result.status,
        pageCount: result.pageCount || undefined,
        message: pdfReadMessage(result.status),
      },
      images: [],
      error: visionFailure(attachment.name),
    };
  }

  const renderPages = options.renderPages ?? renderPdfPageImages;
  const rendered = await renderPages(bytes, {
    maxPages: options.maxPages ?? PDF_VISION_DEFAULT_PAGES,
  });
  if (!rendered.pages.length) {
    return {
      block: "",
      info: {
        name: attachment.name,
        status: result.status,
        pageCount: rendered.pageCount || result.pageCount || undefined,
        message: pdfReadMessage(result.status),
      },
      images: [],
      error: visionFailure(attachment.name),
    };
  }

  const images = pageImagesFromRender(attachment.name, rendered);
  return {
    block: formatDocumentVision(attachment.name, images.length, rendered.pageCount || result.pageCount),
    info: {
      name: attachment.name,
      status: result.status,
      pageCount: rendered.pageCount || result.pageCount,
      message: pdfReadMessage(result.status),
      visionPages: images.length,
    },
    images,
  };
}

function hydrateTextPayload(attachment: ApiAttachment): { block: string; info: DocumentReadInfo } {
  let raw = attachment.textContent ?? "";
  if (!raw && attachment.dataUrl) {
    try {
      raw = bytesToUtf8(decodeAttachmentBytes(attachment.dataUrl));
    } catch {
      raw = "";
    }
  }
  const limited = raw.length > MAX_TEXT_FILE_BYTES ? raw.slice(0, MAX_TEXT_FILE_BYTES) : raw;
  const capped = capExtractedText(limited.trim(), MAX_EXTRACTED_TEXT_CHARS);
  if (!capped.text) {
    return {
      block: formatDocumentContext(
        attachment.name,
        "[Could not read this text file. Paste the contents instead.]",
      ),
      info: {
        name: attachment.name,
        status: "failed",
        message: "Could not read this text file.",
      },
    };
  }
  return {
    block: formatDocumentContext(attachment.name, capped.text),
    info: {
      name: attachment.name,
      status: "ok",
      chars: capped.text.length,
      truncated: capped.truncated,
      text: capped.text,
    },
  };
}

async function hydrateTurn(
  turn: ApiTurn,
  options: HydrateDocumentOptions,
): Promise<{ turn: ApiTurn; documents: DocumentReadInfo[]; error?: HydrationError; visionPages: number }> {
  const attachments = turn.attachments ?? [];
  if (attachments.length === 0) return { turn, documents: [], visionPages: 0 };

  const blocks: string[] = [];
  const documents: DocumentReadInfo[] = [];
  const kept: ApiAttachment[] = [];
  const pageImages: ApiAttachment[] = [];
  let error: HydrationError | undefined;
  let visionPages = 0;

  for (const attachment of attachments) {
    if (isPdfAttachment(attachment) && attachment.dataUrl) {
      const hydrated = await hydratePdf(attachment, options);
      documents.push(hydrated.info);
      if (hydrated.error) {
        error ??= hydrated.error;
        continue;
      }
      blocks.push(hydrated.block);
      pageImages.push(...hydrated.images);
      visionPages += hydrated.images.length;
      continue;
    }
    if (isTextAttachment(attachment) && (attachment.dataUrl || attachment.textContent)) {
      const alreadyInlined =
        Boolean(attachment.textContent) && turn.content.includes(attachment.textContent as string);
      if (!alreadyInlined) {
        const { block, info } = hydrateTextPayload(attachment);
        blocks.push(block);
        documents.push(info);
      }
      continue;
    }
    if (attachment.dataUrl && !isPdfAttachment(attachment)) {
      kept.push(attachment);
    }
  }

  const content = [...blocks, turn.content.trim()].filter(Boolean).join("\n\n");
  const nextAttachments = [...kept, ...pageImages];
  return {
    turn: {
      ...turn,
      content,
      attachments: nextAttachments.length ? nextAttachments : undefined,
    },
    documents,
    error,
    visionPages,
  };
}

export async function hydrateDocumentTurns(
  turns: ApiTurn[],
  options: HydrateDocumentOptions = {},
): Promise<HydrateDocumentResult> {
  const next: ApiTurn[] = [];
  const documents: DocumentReadInfo[] = [];
  let error: HydrationError | undefined;
  let visionPages = 0;
  for (const turn of turns) {
    const hydrated = await hydrateTurn(turn, options);
    next.push(hydrated.turn);
    documents.push(...hydrated.documents);
    visionPages += hydrated.visionPages;
    error ??= hydrated.error;
  }
  return { turns: next, documents, visionPages, error };
}
