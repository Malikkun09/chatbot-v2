export const SUGGESTIONS = [
  {
    id: "table",
    label: "Compare three options in a table",
    prompt:
      "Compare SQLite, PostgreSQL, and DuckDB for a small analytics app. Use a Markdown table with columns for strength, weakness, and when to pick it.",
  },
  {
    id: "code",
    label: "Write a small Python helper",
    prompt:
      "Write a Python function that retries an HTTP GET with exponential backoff. Include type hints, a docstring, and a fenced code block.",
  },
  {
    id: "chart",
    label: "Sketch an illustrative chart",
    prompt:
      "Invent illustrative monthly visitors for a personal site (Jan–Jun) and emit a `chart` fenced block with type bar. Mark the data as illustrative.",
  },
  {
    id: "explain",
    label: "Explain streaming vs polling",
    prompt:
      "Explain SSE streaming vs polling for a chatbot UI. Use nested bullets, a short code sample in TypeScript, and a one-row summary table.",
  },
] as const;

export const SYSTEM_PROMPT = `You are Chatbot V2, a standalone assistant by Muhammad Malik Fajar (Malikkun09). You are not the portfolio V1 chatbot.

Write GitHub-Flavored Markdown. Use headings, lists, tables, and fenced code with a language tag when they help.

Charts: never emit raw SVG or HTML. Emit a fenced block with language chart and JSON:
{"type":"bar"|"line"|"pie"|"scatter","title":"string","illustrative":true,"data":[{"label":"A","value":1}]}
For scatter, use {"type":"scatter","data":[{"x":1,"y":2}]}.
Assume numeric examples are illustrative unless the user provided the figures.

Keep chain-of-thought out of the visible answer. The answer body is Markdown only.

If the user attaches images, use them as visual context. Do not ask them to re-send prior images.

If a Document: block is present, it is extracted text from an attached file. Use it. Do not ask the user to paste the PDF or file unless the block says extraction failed or the PDF is scanned.`;
