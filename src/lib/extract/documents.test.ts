// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { hydrateDocumentTurns, needsDocumentHydration, type PageRenderer } from "./documents";
import { buildMinimalPdf, pdfDataUrlFromBytes } from "./fixtures/minimal-pdf";

const fixturePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/tiny.pdf");

function pdfDataUrl(): string {
  const bytes = readFileSync(fixturePath);
  return `data:application/pdf;base64,${Buffer.from(bytes).toString("base64")}`;
}

function fakePage(pageNumber: number): Awaited<ReturnType<PageRenderer>>["pages"][number] {
  return {
    pageNumber,
    mimeType: "image/jpeg",
    dataUrl: `data:image/jpeg;base64,QQ${pageNumber}`,
    width: 800,
    height: 1000,
    sizeBytes: 1200,
  };
}

describe("hydrateDocumentTurns", () => {
  it("injects extracted PDF text and strips binary before the model", async () => {
    const dataUrl = pdfDataUrl();
    const renderPages = vi.fn();
    expect(
      needsDocumentHydration([
        {
          role: "user",
          content: "ringkasin",
          attachments: [{ name: "brief.pdf", mimeType: "application/pdf", kind: "document", dataUrl }],
        },
      ]),
    ).toBe(true);

    const { turns, documents, visionPages } = await hydrateDocumentTurns(
      [
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
      ],
      { renderPages },
    );

    expect(renderPages).not.toHaveBeenCalled();
    expect(turns[0]?.content).toContain("Document: brief.pdf");
    expect(turns[0]?.content).toContain("Hello Chatbot V2");
    expect(turns[0]?.content).toContain("ringkasin");
    expect(turns[0]?.content).not.toMatch(/page images/i);
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
    expect(visionPages).toBe(0);
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

  it("renders scanned PDF pages as vision image attachments when text is empty", async () => {
    const dataUrl = pdfDataUrlFromBytes(buildMinimalPdf(""));
    const renderPages = vi.fn<PageRenderer>().mockResolvedValue({
      pages: [fakePage(1), fakePage(2)],
      pageCount: 4,
    });

    const { turns, documents, visionPages, error } = await hydrateDocumentTurns(
      [
        {
          role: "user",
          content: "jelaskan pdf ini",
          attachments: [
            {
              name: "cert.pdf",
              mimeType: "application/pdf",
              kind: "document",
              dataUrl,
            },
          ],
        },
      ],
      { renderPages, maxPages: 2 },
    );

    expect(renderPages).toHaveBeenCalledOnce();
    expect(renderPages.mock.calls[0]?.[1]).toEqual({ maxPages: 2 });
    expect(error).toBeUndefined();
    expect(visionPages).toBe(2);
    expect(documents[0]?.status).toBe("empty");
    expect(documents[0]?.visionPages).toBe(2);
    expect(turns[0]?.content).toMatch(/scanned/i);
    expect(turns[0]?.content).toMatch(/page images/i);
    expect(turns[0]?.content).not.toMatch(/paste the text/i);
    expect(turns[0]?.content).toContain("jelaskan pdf ini");
    expect(turns[0]?.attachments).toEqual([
      {
        name: "cert.pdf · page 1",
        mimeType: "image/jpeg",
        kind: "image",
        dataUrl: "data:image/jpeg;base64,QQ1",
        source: "pdf-page",
        pageNumber: 1,
      },
      {
        name: "cert.pdf · page 2",
        mimeType: "image/jpeg",
        kind: "image",
        dataUrl: "data:image/jpeg;base64,QQ2",
        source: "pdf-page",
        pageNumber: 2,
      },
    ]);
  });

  it("does not send a paste-the-text prompt when vision rasterize also fails", async () => {
    const dataUrl = pdfDataUrlFromBytes(buildMinimalPdf(""));
    const renderPages = vi.fn<PageRenderer>().mockResolvedValue({
      pages: [],
      pageCount: 1,
      error: "fail",
    });

    const { turns, error, visionPages } = await hydrateDocumentTurns(
      [
        {
          role: "user",
          content: "jelaskan pdf ini",
          attachments: [
            {
              name: "cert.pdf",
              mimeType: "application/pdf",
              kind: "document",
              dataUrl,
            },
          ],
        },
      ],
      { renderPages },
    );

    expect(visionPages).toBe(0);
    expect(error?.category).toBe("pdf_unreadable");
    expect(error?.message).toMatch(/scanned|page images/i);
    expect(turns[0]?.content).not.toMatch(/paste the text/i);
    expect(turns[0]?.attachments).toBeUndefined();
  });
});
