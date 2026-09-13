"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MAX_ATTACHMENTS, MAX_REQUEST_BYTES } from "@/lib/constants";
import { classifyHttpStatus, classifyThrown, makeError } from "@/lib/chat/errors";
import { fitPayload } from "@/lib/chat/context";
import { clearSession, loadSession, saveSession } from "@/lib/chat/session";
import type {
  Attachment,
  ChatMessage,
  ChatStatus,
  MessageMetrics,
  TokenUsage,
} from "@/lib/chat/types";
import { readSse } from "@/lib/ai/sse";
import { canAddAttachments, compressImageFile } from "@/lib/images/compress";
import { createId } from "@/lib/id";

type ToolCall = { id?: string; name: string; arguments?: string };

interface DoneEvent {
  model?: string;
  durationMs?: number;
  ttftMs?: number;
  generationMs?: number;
  usage?: TokenUsage;
}

function tokensPerSecond(usage?: TokenUsage, generationMs?: number): number | undefined {
  if (!usage?.completionTokens || !generationMs || generationMs <= 0) return undefined;
  return usage.completionTokens / (generationMs / 1000);
}

function useIsClient() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

export function useChatController() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [model, setModel] = useState<string | undefined>();
  const [toolCalls, setToolCalls] = useState<Record<string, ToolCall[]>>({});
  const [hydrated, setHydrated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  const isClient = useIsClient();

  if (isClient && !hydrated) {
    setHydrated(true);
    setMessages(loadSession());
  }

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (hydrated) saveSession(messages);
  }, [messages, hydrated]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setDraft("");
    setAttachments([]);
    setToolCalls({});
    setStatus("idle");
    clearSession();
  }, []);

  const addFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    const incoming = Array.from(files);
    setAttachments((current) => {
      if (!canAddAttachments(current.length, incoming.length)) {
        return [
          ...current,
          {
            id: createId(),
            name: "limit",
            mimeType: "application/octet-stream",
            error: `You can attach up to ${MAX_ATTACHMENTS} images.`,
          },
        ].slice(0, MAX_ATTACHMENTS + 1);
      }
      return current;
    });
    const compressed = await Promise.all(incoming.map((file) => compressImageFile(file)));
    setAttachments((current) => {
      const usable = current.filter((item) => item.name !== "limit");
      return [...usable, ...compressed].slice(0, MAX_ATTACHMENTS);
    });
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => current.filter((item) => item.id !== id));
  }, []);

  const sendMessages = useCallback(async (history: ChatMessage[]) => {
    const { turns, bytes } = fitPayload(history);
    if (bytes > MAX_REQUEST_BYTES) {
      return { error: makeError("payload_too_large") };
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("submitting");

    let response: Response;
    try {
      response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: turns }),
        signal: controller.signal,
      });
    } catch (error) {
      const category = classifyThrown(error);
      setStatus(category === "cancelled" ? "cancelled" : "error");
      return { error: makeError(category) };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("text/event-stream")) {
      let category = classifyHttpStatus(response.status);
      try {
        const payload = (await response.json()) as { error?: { category?: string; message?: string } };
        if (payload.error?.category) {
          category = payload.error.category as typeof category;
        }
        setStatus("error");
        return { error: makeError(category, payload.error?.message) };
      } catch {
        setStatus("error");
        return { error: makeError(category) };
      }
    }

    setStatus("streaming");
    if (!response.body) {
      setStatus("error");
      return { error: makeError("stream_drop") };
    }

    let usage: TokenUsage | undefined;
    let latency: MessageMetrics = {};
    let streamModel: string | undefined;
    let sawDelta = false;

    try {
      for await (const event of readSse(response.body)) {
        if (event.event === "meta") {
          const meta = JSON.parse(event.data) as { model?: string };
          streamModel = meta.model;
          if (meta.model) setModel(meta.model);
          continue;
        }
        if (event.event === "thinking") {
          sawDelta = true;
          const payload = JSON.parse(event.data) as { delta?: string };
          const delta = payload.delta ?? "";
          setMessages((current) =>
            current.map((message, index) =>
              index === current.length - 1 && message.role === "assistant"
                ? {
                    ...message,
                    status: "streaming",
                    thinking: `${message.thinking ?? ""}${delta}`,
                  }
                : message,
            ),
          );
          continue;
        }
        if (event.event === "content") {
          sawDelta = true;
          const payload = JSON.parse(event.data) as { delta?: string };
          const delta = payload.delta ?? "";
          setMessages((current) =>
            current.map((message, index) =>
              index === current.length - 1 && message.role === "assistant"
                ? {
                    ...message,
                    status: "streaming",
                    content: `${message.content}${delta}`,
                  }
                : message,
            ),
          );
          continue;
        }
        if (event.event === "tool_call") {
          const call = JSON.parse(event.data) as ToolCall;
          const last = messagesRef.current[messagesRef.current.length - 1];
          if (last) {
            setToolCalls((existing) => ({
              ...existing,
              [last.id]: [...(existing[last.id] ?? []), call],
            }));
          }
          continue;
        }
        if (event.event === "usage") {
          usage = JSON.parse(event.data) as TokenUsage;
          continue;
        }
        if (event.event === "error") {
          const payload = JSON.parse(event.data) as { category?: string; message?: string };
          const error = makeError(
            (payload.category as ReturnType<typeof makeError>["category"]) || "unknown",
            payload.message,
          );
          setStatus(error.category === "cancelled" ? "cancelled" : "error");
          return { error, usage, latency, model: streamModel, keep: true };
        }
        if (event.event === "done") {
          const done = JSON.parse(event.data) as DoneEvent;
          streamModel = done.model || streamModel;
          usage = done.usage ?? usage;
          latency = {
            ttftMs: done.ttftMs,
            durationMs: done.durationMs,
            generationMs: done.generationMs,
            tokensPerSecond: tokensPerSecond(usage, done.generationMs),
          };
          if (done.model) setModel(done.model);
        }
      }
    } catch (error) {
      const category = classifyThrown(error);
      setStatus(category === "cancelled" ? "cancelled" : "error");
      return { error: makeError(category), usage, latency, model: streamModel, keep: true };
    }

    if (!sawDelta) {
      setStatus("error");
      return { error: makeError("stream_drop"), keep: true };
    }

    setStatus("completed");
    return { usage, latency, model: streamModel, keep: true };
  }, []);

  const send = useCallback(
    async (text?: string, files?: Attachment[]) => {
      const content = (text ?? draft).trim();
      const nextAttachments = (files ?? attachments).filter((item) => item.dataUrl || item.error);
      const validAttachments = nextAttachments.filter((item) => item.dataUrl);
      if (!content && validAttachments.length === 0) return;

      const previous = messagesRef.current;
      const userMessage: ChatMessage = {
        id: createId(),
        role: "user",
        content,
        status: "completed",
        createdAt: Date.now(),
        attachments: validAttachments,
      };
      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: "",
        status: "submitting",
        createdAt: Date.now(),
      };
      const history = [...previous, userMessage];
      setMessages([...history, assistantMessage]);
      setDraft("");
      setAttachments([]);

      const result = await sendMessages(history);
      if (result.error && !result.keep) {
        setMessages(previous);
        setDraft(content);
        setAttachments(nextAttachments);
        setStatus("error");
        return;
      }

      setMessages((current) =>
        current.map((message, index) => {
          if (index !== current.length - 1 || message.role !== "assistant") return message;
          if (result.error) {
            return {
              ...message,
              status: result.error.category === "cancelled" ? "cancelled" : "error",
              error: result.error,
              usage: result.usage,
              latency: result.latency,
              model: result.model,
            };
          }
          return {
            ...message,
            status: "completed",
            usage: result.usage,
            latency: result.latency,
            model: result.model,
          };
        }),
      );
      if (!result.error) setStatus("idle");
    },
    [attachments, draft, sendMessages],
  );

  const retry = useCallback(() => {
    const current = messagesRef.current;
    let next = [...current];
    if (next[next.length - 1]?.role === "assistant") next = next.slice(0, -1);
    const lastUser = [...next].reverse().find((message) => message.role === "user");
    if (!lastUser) return;
    const base = next.filter((message) => message.id !== lastUser.id);
    messagesRef.current = base;
    setMessages(base);
    void send(lastUser.content, lastUser.attachments);
  }, [send]);

  return {
    messages,
    status,
    draft,
    attachments,
    model,
    toolCalls,
    setDraft,
    send,
    stop,
    retry,
    newChat,
    addFiles,
    removeAttachment,
  };
}
