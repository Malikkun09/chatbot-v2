"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import { AttachmentTray } from "@/components/chat/AttachmentTray";
import { PaperclipIcon, SendIcon, StopIcon } from "@/components/icons";
import { FILE_INPUT_ACCEPT, MAX_ATTACHMENTS } from "@/lib/attachments/config";
import type { Attachment, ChatStatus } from "@/lib/chat/types";

export function ChatInput({
  draft,
  attachments,
  status,
  visionBlocked,
  onDraftChange,
  onSend,
  onStop,
  onFiles,
  onRemoveAttachment,
  onRetryAttachment,
  onOpenImage,
  onSwitchVisionModel,
  onRemoveImages,
}: {
  draft: string;
  attachments: Attachment[];
  status: ChatStatus;
  visionBlocked: boolean;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onFiles: (files: FileList | File[] | null) => void;
  onRemoveAttachment: (id: string) => void;
  onRetryAttachment: (id: string) => void;
  onOpenImage: (attachment: Attachment) => void;
  onSwitchVisionModel: () => void;
  onRemoveImages: () => void;
}) {
  const fileId = useId();
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const busy = status === "submitting" || status === "streaming";
  const processing = attachments.some((item) => item.status === "processing");
  const ready = attachments.filter((item) => item.status === "ready");
  const canSend =
    (draft.trim().length > 0 || ready.length > 0) && !busy && !processing && !visionBlocked;

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (canSend) onSend();
  }

  return (
    <form
      className="composer"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSend();
      }}
    >
      <AttachmentTray
        attachments={attachments}
        onRemove={onRemoveAttachment}
        onRetry={onRetryAttachment}
        onOpenImage={onOpenImage}
      />
      {visionBlocked ? (
        <div className="capability-banner" role="status">
          <p>This model does not accept images. Switch to Nemotron Omni or Dots, or remove image attachments.</p>
          <div className="capability-actions">
            <button type="button" className="ghost-btn" onClick={onSwitchVisionModel}>
              Use Omni
            </button>
            <button type="button" className="ghost-btn" onClick={onRemoveImages}>
              Remove images
            </button>
          </div>
        </div>
      ) : null}
      <div className="composer-row">
        <label className="icon-btn attach" htmlFor={fileId}>
          <PaperclipIcon />
          <span className="sr-only">Attach files</span>
        </label>
        <input
          id={fileId}
          className="sr-only"
          type="file"
          accept={FILE_INPUT_ACCEPT}
          multiple
          disabled={busy || attachments.length >= MAX_ATTACHMENTS}
          onChange={(event) => {
            onFiles(event.target.files);
            event.currentTarget.value = "";
          }}
        />
        <textarea
          ref={areaRef}
          className="composer-input"
          rows={Math.min(8, Math.max(1, draft.split("\n").length))}
          value={draft}
          placeholder="Message Chatbot V2"
          aria-label="Message"
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {busy ? (
          <button type="button" className="send-btn" onClick={onStop} aria-label="Stop generating">
            <StopIcon />
          </button>
        ) : (
          <button type="submit" className="send-btn" disabled={!canSend} aria-label="Send">
            <SendIcon />
          </button>
        )}
      </div>
      <p className="composer-hint">Enter to send · Shift+Enter for a new line · paste or drop files</p>
    </form>
  );
}
