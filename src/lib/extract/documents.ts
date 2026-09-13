import {
  MAX_EXTRACTED_TEXT_CHARS,
  MAX_TEXT_FILE_BYTES,
} from "@/lib/attachments/config";
import { isPdfAttachment, isTextAttachment } from "@/lib/attachments/validate";
import type { ApiAttachment, ApiTurn } from "@/lib/chat/types";
import { bytesToUtf8, decodeAttachmentBytes } from "@/lib/extract/bytes";
import {
  capExtractedText,
  formatDocumentContext,
  formatDocumentEmpty,
  formatDocumentFailed,
} from "@/lib/extract/format";
import { extractPdfDataUrl } from "@/lib/extract/pdf";
import type { DocumentReadInfo, PdfExtractStatus } from "@/lib/extract/types";

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

async function hydratePdf(attachment: ApiAttachment): Promise<{ block: string; info: DocumentReadInfo }> {
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
    };
  }
  const block =
    result.status === "empty"
      ? formatDocumentEmpty(attachment.name)
      : formatDocumentFailed(attachment.name);
  return {
    block,
    info: {
      name: attachment.name,
      status: result.status,
      pageCount: result.pageCount || undefined,
      message: pdfReadMessage(result.status),
    },
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

async function hydrateTurn(turn: ApiTurn): Promise<{ turn: ApiTurn; documents: DocumentReadInfo[] }> {
  const attachments = turn.attachments ?? [];
  if (attachments.length === 0) return { turn, documents: [] };

  const blocks: string[] = [];
  const documents: DocumentReadInfo[] = [];
  const kept: ApiAttachment[] = [];

  for (const attachment of attachments) {
    if (isPdfAttachment(attachment) && attachment.dataUrl) {
      const { block, info } = await hydratePdf(attachment);
      blocks.push(block);
      documents.push(info);
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
      continue;
    }
  }

  const content = [...blocks, turn.content.trim()].filter(Boolean).join("\n\n");
  return {
    turn: {
      ...turn,
      content,
      attachments: kept.length ? kept : undefined,
    },
    documents,
  };
}

export async function hydrateDocumentTurns(
  turns: ApiTurn[],
): Promise<{ turns: ApiTurn[]; documents: DocumentReadInfo[] }> {
  const next: ApiTurn[] = [];
  const documents: DocumentReadInfo[] = [];
  for (const turn of turns) {
    const hydrated = await hydrateTurn(turn);
    next.push(hydrated.turn);
    documents.push(...hydrated.documents);
  }
  return { turns: next, documents };
}
