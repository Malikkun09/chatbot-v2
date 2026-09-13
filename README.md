# Chatbot V2

Standalone AI chatbot for **[chatbot.malikfajar.me](https://chatbot.malikfajar.me)**.

Owner: **Muhammad Malik Fajar** ([Malikkun09](https://github.com/Malikkun09)).

This is a new product. It is not a fork of the portfolio chatbot at `malikfajar.me/projects/chatbot` (V1). V1 is legacy; this app has its own UI, API, Markdown pipeline, and provider adapter.

## Stack

- **Next.js 16** App Router + React 19 + TypeScript
- **Vercel** Node.js route handlers with SSE streaming
- **Tailwind CSS v4** — OLED black, technical typography, almost no decoration
- **pnpm** (lockfile committed)

Next.js is the default because it maps cleanly onto Vercel streaming functions, keeps the NVIDIA key on the server, and ships App Router layouts without extra infra.

### Markdown

Production GFM via `react-markdown` + `remark-gfm` + `rehype-sanitize`. Tables, lists, and fences are parsed — not reconstructed with `String.replace` chains.

Syntax highlighting uses **highlight.js** (subset of languages, registered explicitly). It is lighter than Shiki, has no WASM engine, and runs in Vitest/jsdom. Structure (tables/code) matters more here than theme-accurate tokens.

### AI provider

Primary path:

`Browser → POST /api/chat → NVIDIA NIM (https://integrate.api.nvidia.com/v1/chat/completions) → SSE → browser`

Default model id (overridable):

```
nvidia/nemotron-3-nano-omni-30b-a3b-reasoning
```

Verified against NVIDIA NIM / build.nvidia.com listings for Nemotron 3 Nano Omni reasoning (OpenAI-compatible chat completions, multimodal). If NVIDIA renames the hosted id, set `NVIDIA_MODEL`.

**OpenRouter is not included in V1 of V2.** NVIDIA Omni already accepts images. A second provider would add key surface, routing bugs, and payload size without helping the Markdown/streaming work. The `ChatProvider` adapter in `src/lib/ai/` is the swap point if that changes later.

`NVIDIA_API_KEYS` (comma-separated) is reliability failover only (401/403/429/5xx). It is not a quota-stacking switch.

## Architecture

```
src/
  app/api/chat/route.ts     SSE route, payload 413, logging
  lib/ai/                   provider adapter, NVIDIA client, thinking splitter, SSE
  lib/chat/                 message types, history trim, sessionStorage, errors
  lib/markdown/             sanitize schema, chart spec, safe URLs
  lib/images/compress.ts    client-side resize before upload
  components/chat/          shell, markdown renderers, charts, thinking
  hooks/use-chat-controller.ts
```

- **UI state ≠ API payload.** The transcript can keep older images as stubs; the POST body only includes recent turns and the latest image bytes.
- **Thinking ≠ answer.** `<think>` / `reasoning_content` is stored on `message.thinking` and rendered by `ThinkingBlock`, never dumped into Markdown.
- **Streaming:** raw text is the source of truth while tokens arrive. When the stream completes, `MarkdownRenderer` remounts so tables/fences/lists re-parse as a whole.
- **Memory:** sessionStorage only (phase 1). No database.

## Setup

```bash
pnpm install
cp .env.example .env.local
# paste NVIDIA_API_KEY (server-only, no NEXT_PUBLIC_)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
pnpm test
pnpm build
```

## Environment

| Name | Required | Purpose |
| --- | --- | --- |
| `NVIDIA_API_KEY` | yes | Server-only NIM key |
| `NVIDIA_API_KEYS` | no | Extra keys for failover |
| `NVIDIA_MODEL` | no | Defaults to `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` |
| `NVIDIA_BASE_URL` | no | Defaults to `https://integrate.api.nvidia.com/v1` |

Never put keys in `NEXT_PUBLIC_*`, client bundles, sessionStorage, or query strings.

### Vercel

1. Import this GitHub repo into Vercel (framework: Next.js).
2. Project Settings → Environment Variables → add `NVIDIA_API_KEY` for Production, Preview, and Development.
3. Optional: `NVIDIA_MODEL`, `NVIDIA_API_KEYS`.
4. Deploy. Confirm `/api/chat` is a serverless function (max duration 60s in the route module).

Do **not** expose the key in build logs. Server logs record `start`, `model`, `ttft`, `duration`, `usage`, and `error category` only.

## Custom domain (chatbot.malikfajar.me)

1. Vercel → Project → Settings → Domains → add `chatbot.malikfajar.me`.
2. In Cloudflare DNS for `malikfajar.me`:
   - **CNAME** `chatbot` → `cname.vercel-dns.com` (use the target Vercel shows if different).
   - Proxy status: **DNS only** (grey cloud). Vercel needs to terminate TLS.
3. If Vercel asks for A records instead, use the IPs it lists; do not point the apex by accident.
4. Wait for TLS. Visit `https://chatbot.malikfajar.me`.

This hostname is independent of the portfolio site.

## Product notes

- Enter sends, Shift+Enter newline, Stop cancels in-flight generation, Retry on failed assistant turns, draft restored if the request never starts streaming.
- Images are compressed in the browser (max edge 1440, WebP/JPEG ~0.8) before upload.
- Oversized bodies return **413** JSON early (`payload_too_large`) instead of Vercel `FUNCTION_PAYLOAD_TOO_LARGE`.
- Charts are JSON specs rendered as SVG by `ChartRenderer` (bar/line/pie/scatter), marked illustrative. Models are instructed not to emit raw SVG.
- Metrics: TTFT is time-to-first-token; tok/s uses post-TTFT generation time. They are not mixed.

## License

Private project unless the owner publishes otherwise.
