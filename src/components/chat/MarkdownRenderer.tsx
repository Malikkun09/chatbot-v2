"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { markdownComponents } from "@/components/chat/markdown/md-components";
import { remarkCallouts } from "@/lib/markdown/remark-callouts";
import { sanitizeSchema } from "@/lib/markdown/sanitize-schema";

export function MarkdownRenderer({
  content,
  isStreaming = false,
}: {
  content: string;
  isStreaming?: boolean;
}) {
  if (!content) {
    return (
      <div
        className="md-root"
        data-testid="markdown-root"
        data-streaming={isStreaming ? "true" : "false"}
      />
    );
  }

  return (
    <div
      className="md-root"
      data-testid="markdown-root"
      data-streaming={isStreaming ? "true" : "false"}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkCallouts]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
