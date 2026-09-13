"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { defaultVisionModel, getCatalogModel, type ModelProviderId } from "@/lib/ai/catalog";
import { MAX_ATTACHMENTS } from "@/lib/attachments/config";
import { ingestFiles, revokePreview } from "@/lib/attachments/ingest";
import { classifyFile, hasImageAttachments } from "@/lib/attachments/validate";
import { MAX_REQUEST_BYTES } from "@/lib/constants";
import { classifyHttpStatus, classifyThrown, makeError } from "@/lib/chat/errors";
import { fitPayload } from "@/lib/chat/context";
import { loadSelectedModel, saveSelectedModel } from "@/lib/chat/model-preference";
import { clearSession, loadSession, saveSession } from "@/lib/chat/session";
import type {
  Attachment,
  ChatMessage,
  ChatStatus,
  ErrorCategory,
  MessageMetrics,
  TokenUsage,
} from "@/lib/chat/types";
import { readSse } from "@/lib/ai/sse";
import { createId } from "@/lib/id";

const LIMIT_ID = "attachment-limit";

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

function isCancel(category: ErrorCategory): boolean {
  return category === "user_cancelled";
}

function readyAttachments(items: Attachment[]): Attachment[] {
  return items.filter((item) => item.status === "ready" && item.id !== LIMIT_ID);
}

export function useChatController() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedModel, setSelectedModel] = useState(loadSelectedModel);
  const [connectionNotice, setConnectionNotice] = useState<string | null>(null);
  const [toolCalls, setToolCalls] = useState<Record<string, ToolCall[]>>({});
  const [hydrated, setHydrated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  const attachmentsRef = useRef(attachments);
  const originalsRef = useRef(new Map<string, File>());
  const selectedModelRef = useRef(selectedModel);
  const isClient = useIsClient();

  if (isClient && !hydrated) {
    setHydrated(true);
    setMessages(loadSession());
    setSelectedModel(loadSelectedModel());
  }

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    selectedModelRef.current = selectedModel;
  }, [selectedModel]);

  useEffect(() => {
    if (hydrated) saveSession(messages);
  }, [messages, hydrated]);

  useEffect(() => {
    return () => {
      for (const item of attachmentsRef.current) revokePreview(item.previewUrl);
    };
  }, []);

  const selectModel = useCallback((id: string) => {
    const next = getCatalogModel(id).id;
    setSelectedModel(next);
    saveSelectedModel(next);
  }, []);

  const switchToVisionModel = useCallback(() => {
    selectModel(defaultVisionModel().id);
  }, [selectModel]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    for (const item of attachmentsRef.current) revokePreview(item.previewUrl);
    originalsRef.current.clear();
    setMessages([]);
    setDraft("");
    setAttachments([]);
    setToolCalls({});
    setStatus("idle");
    setConnectionNotice(null);
    clearSession();
  }, []);

  const addFiles = useCallback(async (files: FileList | File[] | null) => {
    if (!files || (files instanceof FileList && !files.length) || (Array.isArray(files) && !files.length)) {
      return;
    }
    const incoming = Array.from(files);
    const usable = attachmentsRef.current.filter((item) => item.id !== LIMIT_ID);
    const space = Math.max(0, MAX_ATTACHMENTS - usable.length);
    const take = incoming.slice(0, space);
    const overflow = incoming.length > take.length;
    const batch = take.map((file) => {
      const classified = classifyFile(file);
      const id = createId();
      originalsRef.current.set(id, file);
      const previewUrl =
        classified.kind === "image" && !classified.error ? URL.createObjectURL(file) : undefined;
      const placeholder: Attachment = {
        id,
        kind: classified.kind,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        status: classified.error ? "error" : "processing",
        error: classified.error,
        sizeBytes: file.size,
        previewUrl,
        progress: classified.error ? undefined : 0.2,
      };
      return { file, placeholder };
    });

    setAttachments([
      ...usable,
      ...batch.map((item) => item.placeholder),
      ...(overflow
        ? [
            {
              id: LIMIT_ID,
              kind: "document" as const,
              name: "limit",
              mimeType: "application/octet-stream",
              status: "error" as const,
              error: `You can attach up to ${MAX_ATTACHMENTS} files.`,
            },
          ]
        : []),
    ]);

    const pending = batch.filter((item) => item.placeholder.status === "processing");
    const ingested = await Promise.all(
      pending.map(async ({ file, placeholder }) => {
        const [result] = await ingestFiles([file]);
        return { id: placeholder.id, previewUrl: placeholder.previewUrl, result };
      }),
    );

    setAttachments((current) =>
      current.map((item) => {
        const found = ingested.find((entry) => entry.id === item.id);
        if (!found?.result) return item;
        if (item.previewUrl && found.result.status === "ready") {
          revokePreview(item.previewUrl);
        }
        return {
          ...found.result,
          id: item.id,
          previewUrl: found.result.status === "ready" ? undefined : found.result.previewUrl || item.previewUrl,
          progress: found.result.status === "ready" ? 1 : item.progress,
        };
      }),
    );
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => {
      const target = current.find((item) => item.id === id);
      revokePreview(target?.previewUrl);
      originalsRef.current.delete(id);
      return current.filter((item) => item.id !== id);
    });
  }, []);

  const retryAttachment = useCallback(async (id: string) => {
    const file = originalsRef.current.get(id);
    if (!file) return;
    setAttachments((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, status: "processing", error: undefined, progress: 0.2 }
          : item,
      ),
    );
    const [result] = await ingestFiles([file]);
    if (!result) return;
    setAttachments((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        if (item.previewUrl && result.status === "ready") revokePreview(item.previewUrl);
        return {
          ...result,
          id,
          previewUrl: result.status === "ready" ? undefined : result.previewUrl || item.previewUrl,
          progress: result.status === "ready" ? 1 : 0.2,
        };
      }),
    );
  }, []);

  const removeImages = useCallback(() => {
    setAttachments((current) => {
      for (const item of current) {
        if (item.kind === "image") {
          revokePreview(item.previewUrl);
          originalsRef.current.delete(item.id);
        }
      }
      return current.filter((item) => item.kind !== "image");
    });
  }, []);

  const sendMessages = useCallback(async (history: ChatMessage[]) => {
    const { turns, bytes } = fitPayload(history);
    if (bytes > MAX_REQUEST_BYTES) {
      return { error: makeError("payload_too_large"), keep: true };
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("submitting");
    setConnectionNotice(null);

    let response: Response;
    try {
      response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: turns, model: selectedModelRef.current }),
        signal: controller.signal,
      });
    } catch (error) {
      const category = classifyThrown(error);
      setStatus(isCancel(category) ? "cancelled" : "error");
      return { error: makeError(category), keep: true };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("text/event-stream")) {
      let category = classifyHttpStatus(response.status);
      try {
        const payload = (await response.json()) as {
          error?: { category?: ErrorCategory; message?: string };
        };
        if (payload.error?.category) category = payload.error.category;
        setStatus("error");
        return { error: makeError(category, payload.error?.message), keep: true };
      } catch {
        setStatus("error");
        return { error: makeError(category), keep: true };
      }
    }

    setStatus("streaming");
    if (!response.body) {
      setStatus("error");
      return { error: makeError("stream_drop"), keep: true };
    }

    let usage: TokenUsage | undefined;
    let latency: MessageMetrics = {};
    let streamModel: string | undefined;
    let streamProvider: ModelProviderId | undefined;
    let sawDelta = false;

    try {
      for await (const event of readSse(response.body)) {
        if (event.event === "meta") {
          const meta = JSON.parse(event.data) as { model?: string; provider?: ModelProviderId };
          streamModel = meta.model;
          streamProvider = meta.provider;
          continue;
        }
        if (event.event === "status") {
          const payload = JSON.parse(event.data) as { message?: string };
          if (payload.message) setConnectionNotice(payload.message);
          continue;
        }
        if (event.event === "thinking") {
          sawDelta = true;
          setConnectionNotice(null);
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
          setConnectionNotice(null);
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
          const payload = JSON.parse(event.data) as {
            category?: ErrorCategory;
            message?: string;
            keepPartial?: boolean;
          };
          const error = makeError(payload.category || "unknown", payload.message, streamProvider);
          setStatus(isCancel(error.category) ? "cancelled" : "error");
          setConnectionNotice(null);
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
        }
      }
    } catch (error) {
      const category = classifyThrown(error);
      setStatus(isCancel(category) ? "cancelled" : "error");
      setConnectionNotice(null);
      return { error: makeError(category), usage, latency, model: streamModel, keep: sawDelta };
    }

    if (!sawDelta) {
      setStatus("error");
      setConnectionNotice(null);
      return { error: makeError("stream_drop"), keep: true };
    }

    setStatus("completed");
    setConnectionNotice(null);
    return { usage, latency, model: streamModel, keep: true };
  }, []);

  const send = useCallback(
    async (text?: string, files?: Attachment[]) => {
      const content = (text ?? draft).trim();
      const nextAttachments = readyAttachments(files ?? attachments);
      const catalog = getCatalogModel(selectedModelRef.current);
      if (hasImageAttachments(nextAttachments) && !catalog.multimodal) {
        return;
      }
      if (!content && nextAttachments.length === 0) return;

      const previous = messagesRef.current;
      const userMessage: ChatMessage = {
        id: createId(),
        role: "user",
        content,
        status: "completed",
        createdAt: Date.now(),
        attachments: nextAttachments,
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
      for (const item of attachmentsRef.current) {
        if (!nextAttachments.some((attachment) => attachment.id === item.id)) {
          revokePreview(item.previewUrl);
        }
      }
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
              status: isCancel(result.error.category) ? "cancelled" : "error",
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
    if (
      hasImageAttachments(lastUser.attachments) &&
      !getCatalogModel(selectedModelRef.current).multimodal
    ) {
      setAttachments(lastUser.attachments ?? []);
      setDraft(lastUser.content);
      return;
    }
    const base = next.filter((message) => message.id !== lastUser.id);
    messagesRef.current = base;
    setMessages(base);
    void send(lastUser.content, lastUser.attachments);
  }, [send]);

  const visionBlocked =
    hasImageAttachments(attachments) && !getCatalogModel(selectedModel).multimodal;

  return {
    messages,
    status,
    draft,
    attachments,
    selectedModel,
    connectionNotice,
    visionBlocked,
    toolCalls,
    setDraft,
    selectModel,
    switchToVisionModel,
    send,
    stop,
    retry,
    newChat,
    addFiles,
    removeAttachment,
    retryAttachment,
    removeImages,
  };
}
