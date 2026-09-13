"use client";

import { CloseIcon } from "@/components/icons";
import { formatSize } from "@/lib/attachments/ingest";
import {
  attachmentKindLabel,
  attachmentProcessingLabel,
  attachmentStatusNote,
} from "@/lib/attachments/labels";
import type { Attachment } from "@/lib/chat/types";

export function AttachmentTray({
  attachments,
  onRemove,
  onRetry,
  onOpenImage,
}: {
  attachments: Attachment[];
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
  onOpenImage: (attachment: Attachment) => void;
}) {
  if (!attachments.length) return null;

  return (
    <ul className="composer-files">
      {attachments.map((attachment) => {
        const src = attachment.kind === "image" ? attachment.previewUrl || attachment.dataUrl : undefined;
        const isImage = Boolean(src);
        const processing = attachmentProcessingLabel(attachment);
        const note = attachmentStatusNote(attachment);
        return (
          <li
            key={attachment.id}
            className={attachment.status === "error" || attachment.error ? "file-error" : undefined}
            data-kind={attachment.kind}
            data-status={attachment.status}
          >
            {isImage ? (
              <button
                type="button"
                className="thumb-btn"
                onClick={() => onOpenImage(attachment)}
                aria-label={`View ${attachment.name}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" />
              </button>
            ) : (
              <div className="file-card">
                <span className="file-kind">{attachmentKindLabel(attachment)}</span>
                {note ? <span className="file-vision-note">{note}</span> : null}
              </div>
            )}
            <span className="file-name">
              {attachment.error || attachment.name}
              {processing ? ` · ${processing}` : ""}
              {attachment.sizeBytes && !attachment.error ? ` · ${formatSize(attachment.sizeBytes)}` : ""}
            </span>
            {attachment.status === "error" && onRetry ? (
              <button type="button" className="file-retry" onClick={() => onRetry(attachment.id)}>
                Retry
              </button>
            ) : null}
            <button
              type="button"
              className="icon-btn"
              aria-label={`Remove ${attachment.name}`}
              onClick={() => onRemove(attachment.id)}
            >
              <CloseIcon />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
