import { MAX_REQUEST_BYTES } from "@/lib/constants";
import { classifyThrown, errorMessage, makeError } from "@/lib/chat/errors";
import { estimatePayloadBytes, fitPayload, isPayloadTooLarge } from "@/lib/chat/context";
import type { ApiTurn, ChatRequestBody, TokenUsage } from "@/lib/chat/types";
import { getChatProvider } from "@/lib/ai/provider";
import { encodeSse } from "@/lib/ai/sse";
import { logChat } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function jsonError(status: number, category: ReturnType<typeof makeError>["category"]) {
  const error = makeError(category);
  return Response.json(
    { error },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function isApiTurn(value: unknown): value is ApiTurn {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    (record.role === "user" || record.role === "assistant") &&
    typeof record.content === "string"
  );
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
    return jsonError(400, "unknown");
  }

  const rawBytes = estimatePayloadBytes(body);
  if (isPayloadTooLarge(rawBytes)) {
    logChat("error", { category: "payload_too_large", bytes: rawBytes });
    return jsonError(413, "payload_too_large");
  }

  const incoming = Array.isArray(body.messages) ? body.messages.filter(isApiTurn) : [];
  const fitted = fitPayload(
    incoming.map((turn, index) => ({
      id: `req_${index}`,
      role: turn.role,
      content: turn.content,
      status: "completed" as const,
      createdAt: Date.now(),
      attachments: turn.attachments?.map((attachment, attachmentIndex) => ({
        id: `att_${index}_${attachmentIndex}`,
        name: attachment.name,
        mimeType: attachment.mimeType,
        dataUrl: attachment.dataUrl,
      })),
    })),
  );

  if (isPayloadTooLarge(fitted.bytes)) {
    logChat("error", { category: "payload_too_large", bytes: fitted.bytes });
    return jsonError(413, "payload_too_large");
  }

  const provider = getChatProvider();
  logChat("start", {
    model: provider.model,
    turns: fitted.turns.length,
    truncated: fitted.truncated,
    bytes: fitted.bytes,
  });

  const encoder = new TextEncoder();
  let ttftMs: number | undefined;
  let usage: TokenUsage | undefined;
  let sawContent = false;
  const abort = new AbortController();
  const onAbort = () => abort.abort();
  request.signal.addEventListener("abort", onAbort);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(encodeSse(event, data)));
      };

      send("meta", { model: provider.model });

      try {
        for await (const event of provider.stream({
          messages: fitted.turns,
          signal: abort.signal,
        })) {
          if (event.type === "thinking" || event.type === "content") {
            if (ttftMs === undefined) {
              ttftMs = Date.now() - started;
              logChat("ttft", { model: provider.model, ttftMs });
            }
            if (event.type === "content") sawContent = true;
            send(event.type, { delta: event.text });
            continue;
          }
          if (event.type === "tool_call") {
            send("tool_call", {
              id: event.id,
              name: event.name,
              arguments: event.arguments,
            });
            continue;
          }
          if (event.type === "usage") {
            usage = event.usage;
            send("usage", event.usage);
            continue;
          }
          if (event.type === "error") {
            logChat("error", { category: event.category, model: provider.model });
            send("error", {
              category: event.category,
              message: event.message || errorMessage(event.category),
            });
            controller.close();
            return;
          }
        }

        const durationMs = Date.now() - started;
        const generationMs =
          ttftMs !== undefined ? Math.max(0, durationMs - ttftMs) : durationMs;
        logChat("done", {
          model: provider.model,
          durationMs,
          ttftMs,
          promptTokens: usage?.promptTokens,
          completionTokens: usage?.completionTokens,
        });
        send("done", {
          model: provider.model,
          durationMs,
          ttftMs,
          generationMs,
          usage,
        });
        controller.close();
      } catch (error) {
        const category = classifyThrown(error);
        logChat("error", { category, model: provider.model, sawContent });
        send("error", { category, message: errorMessage(category) });
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
