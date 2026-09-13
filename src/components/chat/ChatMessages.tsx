"use client";

import { useEffect, useRef } from "react";
import { ChatMessageView } from "@/components/chat/ChatMessage";
import { EmptyState } from "@/components/chat/EmptyState";
import type { ChatMessage } from "@/lib/chat/types";

export function ChatMessages({
  messages,
  toolCalls,
  onRetry,
  onSuggestion,
}: {
  messages: ChatMessage[];
  toolCalls: Record<string, Array<{ id?: string; name: string; arguments?: string }>>;
  onRetry: () => void;
  onSuggestion: (prompt: string) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="messages-pane">
        <EmptyState onPick={onSuggestion} />
      </div>
    );
  }

  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");

  return (
    <div className="messages-pane" role="log" aria-live="polite" aria-relevant="additions">
      {messages.map((message) => (
        <ChatMessageView
          key={message.id}
          message={message}
          toolCalls={toolCalls[message.id]}
          onRetry={message.id === lastAssistant?.id ? onRetry : undefined}
        />
      ))}
      <div ref={endRef} />
    </div>
  );
}
