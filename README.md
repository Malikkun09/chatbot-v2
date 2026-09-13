# Chatbot V2

Standalone AI chatbot for **[chatbot.malikfajar.me](https://chatbot.malikfajar.me)**.

Owner: **Muhammad Malik Fajar** ([Malikkun09](https://github.com/Malikkun09)).

This is a new product. It is not a fork of the portfolio chatbot at `malikfajar.me/projects/chatbot` (V1). V1 is legacy; this app has its own UI, API, Markdown pipeline, and provider adapter.

## Stack

- **Next.js 16** App Router + React 19 + TypeScript
- **Vercel** Node.js route handlers with SSE streaming
- **Tailwind CSS v4** — OLED black, technical typography, almost no decoration
- **pnpm** (lockfile committed)

Next.js is the default because it maps cleanly onto Vercel streaming functions, keeps provider keys on the server, and ships App Router layouts without extra infra.

### Markdown

Production GFM via `react-markdown` + `remark-gfm` + `rehype-sanitize`. Tables, lists, and fences are parsed — not reconstructed with `String.replace` chains.

Syntax highlighting uses **highlight.js** (subset of languages, registered explicitly). It is lighter than Shiki, has no WASM engine, and runs in Vitest/jsdom. Structure (tables/code) matters more here than theme-accurate tokens.

### AI providers

```
Browser → POST /api/chat → OpenRouter or NVIDIA NIM → SSE → browser
```

Picker models (OpenRouter `:free` ids). Last pick is stored in `sessionStorage` (`chatbot-v2:model`).

| Id | Label | Capability |
| --- | --- | --- |
| `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | Nemotron Omni (default) | Multimodal |
| `dots-studio/dots-3-note-preview:free` | Dots 3 Note | Multimodal |
| `nvidia/nemotron-3-ultra-550b-a55b:free` | Nemotron Ultra (can be slow) | Text |
| `nvidia/nemotron-3-super-120b-a12b:free` | Nemotron Super (fastest) | Text |

`:free` / catalog ids go to `https://openrouter.ai/api/v1/chat/completions`. Non-`:free` NVIDIA ids (for example `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`) stay on NVIDIA NIM.

Images are never sent to text-only models. The composer blocks send and offers **Use Omni** or **Remove images**.

`OPENROUTER_API_KEYS` / `NVIDIA_API_KEYS` (comma-separated) are reliability failover only: random rotate, **max 3 attempts**, and only **before any thinking or content token**. After tokens start, the app keeps the partial reply and shows Retry. Cancel does not failover. Keys are never logged or sent to the browser.

## Architecture

```
src/
  app/api/chat/route.ts           SSE route, payload 413, capability check
  lib/ai/                         catalog, routing, OpenRouter + NIM, failover stream
  lib/attachments/                MIME/size limits, ingest, validation
  lib/extract/                    server-side PDF/text extraction (unpdf)
  lib/scroll/                     follow-mode helpers (no scrollIntoView)
  lib/chat/                       types, trim, session, errors, model preference
  lib/markdown/                   sanitize schema, chart spec, safe URLs
  lib/images/compress.ts          client-side resize before upload
  components/chat/                shell, picker, scroll container, viewer, markdown
  hooks/use-chat-controller.ts
```

- **UI state ≠ API payload.** The transcript can keep older images as stubs; the POST body only includes recent turns and the latest image/PDF bytes. Text files are inlined on the client. PDFs are decoded on the server with `unpdf` (no shell CLI) and injected as `Document:` text; raw PDF bytes are never sent to the model.
- **Thinking ≠ answer.** `<think>` / `reasoning_content` is stored on `message.thinking` and rendered by `ThinkingBlock`, never dumped into Markdown.
- **Streaming:** raw text is the source of truth while tokens arrive. When the stream completes, `MarkdownRenderer` remounts so tables/fences/lists re-parse as a whole.
- **Scroll:** one `overflow-y` pane (`ChatScrollContainer`). Auto-follow only when near the bottom. Scrolling up pauses follow and shows **New content**. Image viewer is a portal and does not reset chat scroll.
- **Memory:** sessionStorage only. No database.

## Setup

```bash
pnpm install
cp .env.example .env.local
# paste OPENROUTER_API_KEY (server-only, no NEXT_PUBLIC_)
# optional: NVIDIA_API_KEY for direct NIM ids
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
| `OPENROUTER_API_KEY` | yes (default picker) | Server-only OpenRouter key |
| `OPENROUTER_API_KEYS` | no | Extra keys for failover (max 3 attempts) |
| `OPENROUTER_SITE_URL` | no | `HTTP-Referer` header (defaults to the chatbot origin) |
| `OPENROUTER_APP_NAME` | no | `X-Title` header (defaults to `Chatbot V2`) |
| `OPENROUTER_BASE_URL` | no | Defaults to `https://openrouter.ai/api/v1` |
| `NVIDIA_API_KEY` | no | Server-only NIM key for direct NVIDIA ids |
| `NVIDIA_API_KEYS` | no | Extra NIM keys for failover |
| `NVIDIA_MODEL` | no | Direct NIM id, default `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` |
| `NVIDIA_BASE_URL` | no | Defaults to `https://integrate.api.nvidia.com/v1` |

Never put keys in `NEXT_PUBLIC_*`, client bundles, sessionStorage, or query strings.

### Vercel

1. Import this GitHub repo into Vercel (framework: Next.js).
2. Project Settings → Environment Variables → add `OPENROUTER_API_KEY` for Production, Preview, and Development.
3. Optional: `OPENROUTER_API_KEYS`, `NVIDIA_API_KEY`, `NVIDIA_MODEL`.
4. Deploy. Confirm `/api/chat` is a serverless function (max duration 60s in the route module).

Do **not** expose keys in build logs. Server logs record `start`, `model`, `provider`, `ttft`, `duration`, `usage`, `failover`, and `error category` only.

## Custom domain (chatbot.malikfajar.me)

1. Vercel → Project → Settings → Domains → add `chatbot.malikfajar.me`.
2. In Cloudflare DNS for `malikfajar.me`:
   - **CNAME** `chatbot` → `cname.vercel-dns.com` (use the target Vercel shows if different).
   - Proxy status: **DNS only** (grey cloud). Vercel needs to terminate TLS.
3. If Vercel asks for A records instead, use the IPs it lists; do not point the apex by accident.
4. Wait for TLS. Visit `https://chatbot.malikfajar.me`.

This hostname is independent of the portfolio site.

## Product notes

- Enter sends, Shift+Enter newline, Stop cancels in-flight generation (no failover), Retry on failed assistant turns.
- Model picker is in the header. Text-only models cannot send images.
- Attachments: file picker, drag-and-drop, clipboard screenshots (text paste still works). Images compress in the browser (max edge 1440, WebP/JPEG ~0.8). PDFs are sent as base64 (max 2MB) and read as text on the server. Click a thumbnail for an in-app viewer (not browser fullscreen).
- Oversized bodies return **413** JSON early (`payload_too_large`) instead of Vercel `FUNCTION_PAYLOAD_TOO_LARGE`.
- Charts are JSON specs rendered as SVG by `ChartRenderer` (bar/line/pie/scatter), marked illustrative. Models are instructed not to emit raw SVG.
- Metrics: TTFT is time-to-first-token; tok/s uses post-TTFT generation time. They are not mixed.
- Failover before the first token shows a quiet “Trying another connection…”. Partial streams are never concatenated across keys or models.

## License

Private project unless the owner publishes otherwise.
