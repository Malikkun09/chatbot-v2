export type PdfExtractStatus = "ok" | "empty" | "failed";

export interface PdfExtractResult {
  status: PdfExtractStatus;
  text: string;
  pageCount: number;
  chars: number;
  truncated: boolean;
}

export interface DocumentReadInfo {
  name: string;
  status: PdfExtractStatus;
  pageCount?: number;
  chars?: number;
  truncated?: boolean;
  message?: string;
  text?: string;
}
