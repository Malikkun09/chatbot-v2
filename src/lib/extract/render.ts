import { getDocumentProxy, renderPageAsImage } from "unpdf";
import {
  IMAGE_QUALITY,
  MAX_COMPRESSED_IMAGE_BYTES,
  MAX_IMAGE_EDGE,
  PDF_VISION_DEFAULT_PAGES,
  PDF_VISION_MAX_PAGES,
} from "@/lib/attachments/config";
import { looksLikePdf } from "@/lib/extract/bytes";
import { ensurePromiseWithResolvers } from "@/lib/extract/polyfill";
import type { RenderedPdfPage, PdfRenderResult } from "@/lib/extract/types";

function pngBuffer(raw: ArrayBuffer | string): Buffer {
  if (typeof raw === "string") {
    const comma = raw.indexOf(",");
    const payload = comma >= 0 ? raw.slice(comma + 1) : raw;
    return Buffer.from(payload, "base64");
  }
  return Buffer.from(new Uint8Array(raw));
}

async function compressPngBuffer(png: Buffer): Promise<Omit<RenderedPdfPage, "pageNumber"> | undefined> {
  const { createCanvas, loadImage } = await import("@napi-rs/canvas");
  const img = await loadImage(png);
  let quality = Math.round(IMAGE_QUALITY * 100);
  let edge = MAX_IMAGE_EDGE;

  const encodeAt = async (maxEdge: number, jpegQuality: number) => {
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);
    const buf = await canvas.encode("jpeg", jpegQuality);
    return { buf, width, height };
  };

  let encoded = await encodeAt(edge, quality);
  while (encoded.buf.length > MAX_COMPRESSED_IMAGE_BYTES && quality > 45) {
    quality -= 15;
    encoded = await encodeAt(edge, quality);
  }
  while (encoded.buf.length > MAX_COMPRESSED_IMAGE_BYTES && edge > 720) {
    edge = Math.round(edge * 0.75);
    encoded = await encodeAt(edge, quality);
  }
  if (encoded.buf.length > MAX_COMPRESSED_IMAGE_BYTES) return undefined;

  return {
    mimeType: "image/jpeg",
    dataUrl: `data:image/jpeg;base64,${encoded.buf.toString("base64")}`,
    width: encoded.width,
    height: encoded.height,
    sizeBytes: encoded.buf.length,
  };
}

export async function renderPdfPageImages(
  bytes: Uint8Array,
  options?: { maxPages?: number },
): Promise<PdfRenderResult> {
  const requested = options?.maxPages ?? PDF_VISION_DEFAULT_PAGES;
  const maxPages = Math.min(Math.max(1, requested), PDF_VISION_MAX_PAGES);
  if (!looksLikePdf(bytes)) {
    return { pages: [], pageCount: 0, error: "This file is not a readable PDF." };
  }

  ensurePromiseWithResolvers();

  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | undefined;
  try {
    pdf = await getDocumentProxy(bytes);
    const pageCount = pdf.numPages || 0;
    const count = Math.min(maxPages, pageCount);
    const pages: RenderedPdfPage[] = [];

    for (let pageNumber = 1; pageNumber <= count; pageNumber += 1) {
      try {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        const sizeOpts =
          viewport.width >= viewport.height
            ? { width: MAX_IMAGE_EDGE }
            : { height: MAX_IMAGE_EDGE };
        const raw = await renderPageAsImage(pdf, pageNumber, {
          canvasImport: () => import("@napi-rs/canvas"),
          ...sizeOpts,
        });
        const compressed = await compressPngBuffer(pngBuffer(raw));
        if (compressed) pages.push({ pageNumber, ...compressed });
      } catch {
        // skip this page; others may still render
      }
    }

    if (!pages.length) {
      return {
        pages: [],
        pageCount,
        error: "Could not rasterize PDF pages for vision.",
      };
    }
    return { pages, pageCount };
  } catch {
    return { pages: [], pageCount: 0, error: "Could not rasterize PDF pages for vision." };
  } finally {
    try {
      await pdf?.cleanup();
    } catch {
      // ignore cleanup failures
    }
  }
}

export function pdfPageAttachmentName(filename: string, pageNumber: number): string {
  return `${filename} · page ${pageNumber}`;
}
