"use client";

import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { ErrorBlock } from "@/components/chat/ErrorBlock";
import { Metrics } from "@/components/chat/Metrics";
import { ThinkingBlock } from "@/components/chat/ThinkingBlock";
import { ToolCallBlock } from "@/components/chat/ToolCallBlock";
import type { ChatMessage } from "@/lib/chat/types";

export function ChatMessageView({
  message,
  toolCalls,
  onRetry,
}: {
  message: ChatMessage;
  toolCalls?: Array<{ id?: string; name: string; arguments?: string }>;
  onRetry?: () => void;
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
          {message.attachments.map((attachment) => (
            <li key={attachment.id}>
              {attachment.dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={attachment.dataUrl} alt={attachment.name} />
              ) : (
                <span>{attachment.name}</span>
              )}
            </li>
          ))}
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
