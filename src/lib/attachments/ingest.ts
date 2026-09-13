import { MAX_ATTACHMENTS } from "@/lib/attachments/config";
import { classifyFile } from "@/lib/attachments/validate";
import { compressImageFile } from "@/lib/images/compress";
import type { Attachment } from "@/lib/chat/types";
import { createId } from "@/lib/id";

function extLang(name: string): string {
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "md") return "md";
  if (ext === "json") return "json";
  if (ext === "csv") return "csv";
  if (ext === "xml" || ext === "html" || ext === "htm") return "xml";
  return "txt";
}

export function formatSize(bytes?: number): string {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function documentStub(attachment: Attachment): string {
  const size = formatSize(attachment.sizeBytes);
  return `[Attached file: ${attachment.name} (${attachment.mimeType}${size ? `, ${size}` : ""}) — binary is not sent to the model. Paste or export text if you need it read.]`;
}

export function textFence(attachment: Attachment): string {
  const body = attachment.textContent?.trim() ?? "";
  return `Attached \`${attachment.name}\`:\n\n\`\`\`${extLang(attachment.name)}\n${body}\n\`\`\``;
}

export function mergeAttachmentText(base: string, attachments: Attachment[]): string {
  const extras: string[] = [];
  for (const attachment of attachments) {
    if (attachment.kind === "text" && attachment.textContent) extras.push(textFence(attachment));
    if (attachment.kind === "document") extras.push(documentStub(attachment));
  }
  return [base.trim(), ...extras].filter(Boolean).join("\n\n");
}

export function revokePreview(url?: string): void {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

export async function ingestFiles(files: File[]): Promise<Attachment[]> {
  const results: Attachment[] = [];
  for (const file of files) {
    const classified = classifyFile(file);
    if (classified.error) {
      results.push({
        id: createId(),
        kind: classified.kind,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        status: "error",
        error: classified.error,
        sizeBytes: file.size,
      });
      continue;
    }
    if (classified.kind === "image") {
      const previewUrl = URL.createObjectURL(file);
      const compressed = await compressImageFile(file);
      if (compressed.status === "ready") {
        revokePreview(previewUrl);
        results.push(compressed);
      } else {
        results.push({ ...compressed, previewUrl });
      }
      continue;
    }
    if (classified.kind === "text") {
      try {
        const textContent = await file.text();
        results.push({
          id: createId(),
          kind: "text",
          name: file.name,
          mimeType: file.type || "text/plain",
          status: "ready",
          textContent,
          sizeBytes: file.size,
        });
      } catch {
        results.push({
          id: createId(),
          kind: "text",
          name: file.name,
          mimeType: file.type || "text/plain",
          status: "error",
          error: "Could not read this text file.",
          sizeBytes: file.size,
        });
      }
      continue;
    }
    results.push({
      id: createId(),
      kind: "document",
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      status: "ready",
      sizeBytes: file.size,
    });
  }
  return results;
}

export function canAddAttachments(currentCount: number, incomingCount: number): boolean {
  return currentCount + incomingCount <= MAX_ATTACHMENTS;
}

export function clipboardImages(event: ClipboardEvent): File[] {
  const items = event.clipboardData?.items;
  if (!items) return [];
  const files: File[] = [];
  for (const item of items) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }
  return files;
}

export function dataTransferFiles(data: DataTransfer | null): File[] {
  if (!data?.files?.length) return [];
  return Array.from(data.files);
}
