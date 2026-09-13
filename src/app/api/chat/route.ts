import { MAX_REQUEST_BYTES } from "@/lib/constants";
import { classifyThrown, errorMessage, makeError } from "@/lib/chat/errors";
import { clampPdfPageAttachments, estimatePayloadBytes, fitPayload, isPayloadTooLarge } from "@/lib/chat/context";
import type { ApiTurn, ChatRequestBody, TokenUsage } from "@/lib/chat/types";
import { getChatProvider } from "@/lib/ai/provider";
import { resolveVisionFallback } from "@/lib/ai/vision-fallback";
import { hasImageAttachments, isImageAttachment, isTextAttachment } from "@/lib/attachments/validate";
import { hydrateDocumentTurns, needsDocumentHydration } from "@/lib/extract/documents";
import { encodeSse } from "@/lib/ai/sse";
import { logChat } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function jsonError(status: number, category: Parameters<typeof makeError>[0], provider?: "openrouter" | "nvidia") {
  const error = makeError(category, undefined, provider);
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function isApiTurn(value: unknown): value is ApiTurn {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (record.role === "user" || record.role === "assistant") && typeof record.content === "string";
}

function toFitMessages(turns: ApiTurn[]) {
  return turns.map((turn, index) => ({
    id: `req_${index}`,
    role: turn.role,
    content: turn.content,
    status: "completed" as const,
    createdAt: Date.now(),
    attachments: turn.attachments?.map((attachment, attachmentIndex) => ({
      id: `att_${index}_${attachmentIndex}`,
      kind:
        attachment.kind ??
        (isImageAttachment(attachment) ? "image" : isTextAttachment(attachment) ? "text" : "document"),
      name: attachment.name,
      mimeType: attachment.mimeType,
      status: "ready" as const,
      dataUrl: attachment.dataUrl,
      textContent: attachment.textContent,
      source: attachment.source,
      pageNumber: attachment.pageNumber,
    })),
  }));
}

export async function POST(request: Request) {
  const started = Date.now();
  const lengthHeader = request.headers.get("content-length");
  const declared = lengthHeader ? Number(lengthHeader) : 0;
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) {
    logChat("error", { category: "payload_too_large", bytes: declared });
    return jsonError(413, "payload_too_large");
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return jsonError(400, "invalid_request");
  }

  const rawBytes = estimatePayloadBytes(body);
  if (isPayloadTooLarge(rawBytes)) {
    logChat("error", { category: "payload_too_large", bytes: rawBytes });
    return jsonError(413, "payload_too_large");
  }

  const incoming = Array.isArray(body.messages) ? body.messages.filter(isApiTurn) : [];
  let { provider, model } = getChatProvider(typeof body.model === "string" ? body.model : undefined);

  if (!model.multimodal && incoming.some((turn) => hasImageAttachments(turn.attachments))) {
    logChat("error", { category: "not_multimodal", model: model.id });
    return jsonError(400, "not_multimodal", model.provider);
  }

  const encoder = new TextEncoder();
  let ttftMs: number | undefined;
  let usage: TokenUsage | undefined;
  const abort = new AbortController();
  const onAbort = () => abort.abort();
  request.signal.addEventListener("abort", onAbort);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(encodeSse(event, data)));
      };

      try {
        const needsDocs = needsDocumentHydration(incoming);
        if (needsDocs) {
          send("status", { message: "Reading PDF…" });
        }

        const hydrated = needsDocs
          ? await hydrateDocumentTurns(incoming, {
              onStatus: (message) => send("status", { message }),
            })
          : { turns: incoming, documents: [], visionPages: 0, error: undefined };

        if (hydrated.documents.length) {
          send("documents", {
            items: hydrated.documents.map((item) => ({
              name: item.name,
              status: item.status,
              pageCount: item.pageCount,
              chars: item.chars,
              truncated: item.truncated,
              message: item.message,
              text: item.text,
              visionPages: item.visionPages,
            })),
          });
          logChat("extract", {
            model: model.id,
            pdfs: hydrated.documents.length,
            chars: hydrated.documents.reduce((sum, item) => sum + (item.chars ?? 0), 0),
            truncated: hydrated.documents.some((item) => Boolean(item.truncated)),
            visionPages: hydrated.visionPages,
          });
        }

        if (hydrated.error) {
          send("meta", { model: model.id, provider: model.provider, label: model.label });
          logChat("error", { category: hydrated.error.category, model: model.id });
          send("error", {
            category: hydrated.error.category,
            message: hydrated.error.message,
          });
          controller.close();
          return;
        }

        const fallback = resolveVisionFallback(model, hydrated.visionPages);
        if (fallback.switched) {
          send("status", { message: "Scanned PDF — using vision model…" });
          ({ provider, model } = getChatProvider(fallback.model.id));
          logChat("vision_fallback", { model: model.id, visionPages: hydrated.visionPages });
        }

        send("meta", { model: model.id, provider: model.provider, label: model.label });

        let prepared = hydrated.turns;
        if (hydrated.visionPages > 1 && isPayloadTooLarge(estimatePayloadBytes({ messages: prepared }))) {
          prepared = clampPdfPageAttachments(prepared, 1);
        }

        const fitted = fitPayload(toFitMessages(prepared), MAX_REQUEST_BYTES, {
          preserveLastUserImages: hydrated.visionPages > 0,
        });
        if (isPayloadTooLarge(fitted.bytes)) {
          logChat("error", { category: "payload_too_large", bytes: fitted.bytes });
          send("error", {
            category: "payload_too_large",
            message:
              hydrated.visionPages > 0
                ? "Scanned PDF page images are too large to send. Try a 1–2 page file or a smaller scan."
                : errorMessage("payload_too_large", model.provider),
          });
          controller.close();
          return;
        }

        logChat("start", {
          model: model.id,
          provider: model.provider,
          turns: fitted.turns.length,
          truncated: fitted.truncated,
          bytes: fitted.bytes,
        });

        for await (const event of provider.stream({
          messages: fitted.turns,
          signal: abort.signal,
        })) {
          if (event.type === "status") {
            send("status", { message: event.message });
            continue;
          }
          if (event.type === "thinking" || event.type === "content") {
            if (ttftMs === undefined) {
              ttftMs = Date.now() - started;
              logChat("ttft", { model: model.id, ttftMs });
            }
            send(event.type, { delta: event.text });
            continue;
          }
          if (event.type === "tool_call") {
            send("tool_call", { id: event.id, name: event.name, arguments: event.arguments });
            continue;
          }
          if (event.type === "usage") {
            usage = event.usage;
            send("usage", event.usage);
            continue;
          }
          if (event.type === "error") {
            logChat("error", { category: event.category, model: model.id });
            send("error", {
              category: event.category,
              message: event.message || errorMessage(event.category, model.provider),
              keepPartial: event.keepPartial,
            });
            controller.close();
            return;
          }
        }

        const durationMs = Date.now() - started;
        const generationMs = ttftMs !== undefined ? Math.max(0, durationMs - ttftMs) : durationMs;
        logChat("done", {
          model: model.id,
          durationMs,
          ttftMs,
          promptTokens: usage?.promptTokens,
          completionTokens: usage?.completionTokens,
        });
        send("done", {
          model: model.id,
          durationMs,
          ttftMs,
          generationMs,
          usage,
        });
        controller.close();
      } catch (error) {
        const category = classifyThrown(error);
        logChat("error", { category, model: model.id });
        send("error", { category, message: errorMessage(category, model.provider) });
        controller.close();
      } finally {
        request.signal.removeEventListener("abort", onAbort);
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
