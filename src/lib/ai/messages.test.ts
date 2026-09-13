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
});
