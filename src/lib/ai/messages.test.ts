import { describe, expect, it } from "vitest";
import { toChatCompletionsMessages } from "./messages";

describe("toChatCompletionsMessages", () => {
  it("does not send PDF binary as an image_url part", () => {
    const messages = toChatCompletionsMessages([
      {
        role: "user",
        content: "Document: brief.pdf\n\nHello Chatbot V2\n\nringkasin",
        attachments: [
          {
            name: "brief.pdf",
            mimeType: "application/pdf",
            kind: "document",
            dataUrl: "data:application/pdf;base64,JVBERi0x",
          },
        ],
      },
    ]);
    const user = messages.find((message) => message.role === "user");
    expect(typeof user?.content).toBe("string");
    expect(user?.content).toContain("Hello Chatbot V2");
  });

  it("keeps image_url parts for real images", () => {
    const messages = toChatCompletionsMessages([
      {
        role: "user",
        content: "look",
        attachments: [
          {
            name: "shot.png",
            mimeType: "image/png",
            kind: "image",
            dataUrl: "data:image/png;base64,aa",
          },
        ],
      },
    ]);
    const user = messages.find((message) => message.role === "user");
    expect(Array.isArray(user?.content)).toBe(true);
    expect(user?.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "image_url" }),
      ]),
    );
  });

  it("sends rasterized scanned PDF pages as image_url parts", () => {
    const messages = toChatCompletionsMessages([
      {
        role: "user",
        content: "Document: cert.pdf\n\n[No selectable text was found. This PDF is likely scanned. Using page images for vision.]\n\njelaskan pdf ini",
        attachments: [
          {
            name: "cert.pdf · page 1",
            mimeType: "image/jpeg",
            kind: "image",
            dataUrl: "data:image/jpeg;base64,QQ",
            source: "pdf-page",
            pageNumber: 1,
          },
        ],
      },
    ]);
    const user = messages.find((message) => message.role === "user");
    expect(Array.isArray(user?.content)).toBe(true);
    expect(user?.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "text" }),
        expect.objectContaining({
          type: "image_url",
          image_url: { url: "data:image/jpeg;base64,QQ" },
        }),
      ]),
    );
  });
});
