"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import { CloseIcon, PaperclipIcon, SendIcon, StopIcon } from "@/components/icons";
import type { Attachment, ChatStatus } from "@/lib/chat/types";
import { MAX_ATTACHMENTS } from "@/lib/constants";

export function ChatInput({
  draft,
  attachments,
  status,
  onDraftChange,
  onSend,
  onStop,
  onFiles,
  onRemoveAttachment,
}: {
  draft: string;
  attachments: Attachment[];
  status: ChatStatus;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onFiles: (files: FileList | null) => void;
  onRemoveAttachment: (id: string) => void;
}) {
  const fileId = useId();
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const busy = status === "submitting" || status === "streaming";
  const canSend = (draft.trim().length > 0 || attachments.some((item) => item.dataUrl)) && !busy;

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
      {attachments.length ? (
        <ul className="composer-files">
          {attachments.map((attachment) => (
            <li key={attachment.id} className={attachment.error ? "file-error" : undefined}>
              {attachment.dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={attachment.dataUrl} alt="" />
              ) : (
                <span className="file-ph" />
              )}
              <span className="file-name">{attachment.error || attachment.name}</span>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remove ${attachment.name}`}
                onClick={() => onRemoveAttachment(attachment.id)}
              >
                <CloseIcon />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="composer-row">
        <label className="icon-btn attach" htmlFor={fileId}>
          <PaperclipIcon />
          <span className="sr-only">Attach image</span>
        </label>
        <input
          id={fileId}
          className="sr-only"
          type="file"
          accept="image/*"
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
      <p className="composer-hint">Enter to send · Shift+Enter for a new line</p>
    </form>
  );
}
