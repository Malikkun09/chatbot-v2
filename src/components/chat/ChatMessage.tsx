"use client";

import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { ErrorBlock } from "@/components/chat/ErrorBlock";
import { Metrics } from "@/components/chat/Metrics";
import { ThinkingBlock } from "@/components/chat/ThinkingBlock";
import { ToolCallBlock } from "@/components/chat/ToolCallBlock";
import { formatSize } from "@/lib/attachments/ingest";
import type { Attachment, ChatMessage } from "@/lib/chat/types";

export function ChatMessageView({
  message,
  toolCalls,
  onRetry,
  onOpenImage,
}: {
  message: ChatMessage;
  toolCalls?: Array<{ id?: string; name: string; arguments?: string }>;
  onRetry?: () => void;
  onOpenImage: (attachment: Attachment) => void;
}) {
  const streaming = message.status === "streaming" || message.status === "submitting";

  return (
    <article
      className={`message message-${message.role}`}
      data-status={message.status}
      aria-busy={streaming || undefined}
    >
      <p className="message-role">{message.role === "user" ? "You" : "Assistant"}</p>
      {message.attachments?.length ? (
        <ul className="message-thumbs">
          {message.attachments.map((attachment) => {
            const src = attachment.previewUrl || attachment.dataUrl;
            if (attachment.kind === "image" && src) {
              return (
                <li key={attachment.id}>
                  <button
                    type="button"
                    className="thumb-btn"
                    onClick={() => onOpenImage(attachment)}
                    aria-label={`View ${attachment.name}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={attachment.name} />
                  </button>
                </li>
              );
            }
            return (
              <li key={attachment.id} className="file-chip">
                <span className="file-kind">{attachment.kind === "text" ? "Text" : "File"}</span>
                <span>{attachment.name}</span>
                {attachment.sizeBytes ? <span>{formatSize(attachment.sizeBytes)}</span> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {message.role === "assistant" ? (
        <ThinkingBlock text={message.thinking ?? ""} streaming={streaming && !message.content} />
      ) : null}
      {message.role === "user" ? (
        <div className="user-bubble">
          <p>{message.content}</p>
        </div>
      ) : (
        <MarkdownRenderer
          key={`${message.id}-${streaming ? "stream" : "final"}`}
          content={message.content}
          isStreaming={streaming}
        />
      )}
      {toolCalls?.map((call, index) => (
        <ToolCallBlock key={call.id || `${call.name}-${index}`} name={call.name} args={call.arguments} />
      ))}
      {message.error ? (
        <ErrorBlock
          message={message.error.message}
          onRetry={message.role === "assistant" ? onRetry : undefined}
        />
      ) : null}
      {message.role === "assistant" && message.status === "completed" ? (
        <Metrics latency={message.latency} usage={message.usage} model={message.model} />
      ) : null}
    </article>
  );
}
