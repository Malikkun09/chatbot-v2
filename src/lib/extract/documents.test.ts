// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { hydrateDocumentTurns, needsDocumentHydration } from "./documents";

const fixturePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/tiny.pdf");

function pdfDataUrl(): string {
  const bytes = readFileSync(fixturePath);
  return `data:application/pdf;base64,${Buffer.from(bytes).toString("base64")}`;
}

describe("hydrateDocumentTurns", () => {
  it("injects extracted PDF text and strips binary before the model", async () => {
    const dataUrl = pdfDataUrl();
    expect(needsDocumentHydration([{ role: "user", content: "ringkasin", attachments: [{ name: "brief.pdf", mimeType: "application/pdf", kind: "document", dataUrl }] }])).toBe(true);

    const { turns, documents } = await hydrateDocumentTurns([
      {
        role: "user",
        content: "ringkasin",
        attachments: [
          {
            name: "brief.pdf",
            mimeType: "application/pdf",
            kind: "document",
            dataUrl,
          },
          {
            name: "shot.png",
            mimeType: "image/png",
            kind: "image",
            dataUrl: "data:image/png;base64,aa",
          },
        ],
      },
    ]);

    expect(turns[0]?.content).toContain("Document: brief.pdf");
    expect(turns[0]?.content).toContain("Hello Chatbot V2");
    expect(turns[0]?.content).toContain("ringkasin");
    expect(turns[0]?.attachments).toEqual([
      {
        name: "shot.png",
        mimeType: "image/png",
        kind: "image",
        dataUrl: "data:image/png;base64,aa",
      },
    ]);
    expect(documents[0]?.status).toBe("ok");
    expect(documents[0]?.pageCount).toBe(1);
  });

  it("inlines text-file bytes when they were not already in the prompt", async () => {
    const payload = Buffer.from("alpha beta", "utf8").toString("base64");
    const { turns } = await hydrateDocumentTurns([
      {
        role: "user",
        content: "summarize",
        attachments: [
          {
            name: "notes.txt",
            mimeType: "text/plain",
            kind: "text",
            dataUrl: `data:text/plain;base64,${payload}`,
          },
        ],
      },
    ]);
    expect(turns[0]?.content).toContain("Document: notes.txt");
    expect(turns[0]?.content).toContain("alpha beta");
    expect(turns[0]?.attachments).toBeUndefined();
  });
});
