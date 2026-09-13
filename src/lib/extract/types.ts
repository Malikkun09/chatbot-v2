import type { ErrorCategory } from "@/lib/chat/types";

export type PdfExtractStatus = "ok" | "empty" | "failed";

export interface PdfExtractResult {
  status: PdfExtractStatus;
  text: string;
  pageCount: number;
  chars: number;
  truncated: boolean;
}

export interface RenderedPdfPage {
  pageNumber: number;
  mimeType: "image/jpeg" | "image/png";
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export interface PdfRenderResult {
  pages: RenderedPdfPage[];
  pageCount: number;
  error?: string;
}

export interface DocumentReadInfo {
  name: string;
  status: PdfExtractStatus;
  pageCount?: number;
  chars?: number;
  truncated?: boolean;
  message?: string;
  text?: string;
  visionPages?: number;
}

export interface HydrationError {
  category: ErrorCategory;
  message: string;
}
