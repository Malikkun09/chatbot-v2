import type { Components } from "react-markdown";
import { ChartRenderer } from "@/components/chat/ChartRenderer";
import { CodeBlock } from "@/components/chat/CodeBlock";
import { JsonViewer } from "@/components/chat/JsonViewer";
import { Blockquote } from "@/components/chat/markdown/Blockquote";
import { Heading } from "@/components/chat/markdown/Heading";
import { MarkdownImage } from "@/components/chat/markdown/Image";
import { MarkdownLink } from "@/components/chat/markdown/Link";
import { List, ListItem, TaskCheckbox } from "@/components/chat/markdown/List";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/chat/markdown/Table";
import { InlineCode, TextParagraph, ThematicBreak } from "@/components/chat/markdown/Text";
import { looksLikeJson, parseChartSpec } from "@/lib/markdown/chart-spec";

function Fence({ language, text }: { language?: string; text: string }) {
  const lang = language?.toLowerCase();
  if (lang === "chart") {
    const spec = parseChartSpec(text);
    if (spec) return <ChartRenderer spec={spec} />;
  }
  if (lang === "json" || (!lang && looksLikeJson(text))) {
    const spec = parseChartSpec(text);
    if (spec) return <ChartRenderer spec={spec} />;
    if (lang === "json") {
      let valid = false;
      try {
        JSON.parse(text);
        valid = true;
      } catch {
        valid = false;
      }
      if (valid) {
        return (
          <div className="json-with-source">
            <JsonViewer value={text} />
            <CodeBlock language="json" code={text} />
          </div>
        );
      }
      return <CodeBlock language="json" code={text} />;
    }
  }
  return <CodeBlock language={lang || "text"} code={text} />;
}

export const markdownComponents: Components = {
  h1: ({ children }) => <Heading level={1}>{children}</Heading>,
  h2: ({ children }) => <Heading level={2}>{children}</Heading>,
  h3: ({ children }) => <Heading level={3}>{children}</Heading>,
  h4: ({ children }) => <Heading level={4}>{children}</Heading>,
  h5: ({ children }) => <Heading level={5}>{children}</Heading>,
  h6: ({ children }) => <Heading level={6}>{children}</Heading>,
  p: ({ children }) => <TextParagraph>{children}</TextParagraph>,
  ul: ({ children, className }) => (
    <List ordered={false} className={className}>
      {children}
    </List>
  ),
  ol: ({ children, className }) => (
    <List ordered className={className}>
      {children}
    </List>
  ),
  li: ({ children, className }) => (
    <ListItem className={className}>{children}</ListItem>
  ),
  input: (props) =>
    props.type === "checkbox" ? <TaskCheckbox checked={Boolean(props.checked)} /> : null,
  blockquote: ({ children, ...props }) => (
    <Blockquote
      data-callout={
        (props as { "data-callout"?: string; dataCallout?: string })["data-callout"] ??
        (props as { dataCallout?: string }).dataCallout
      }
    >
      {children}
    </Blockquote>
  ),
  a: ({ href, children }) => <MarkdownLink href={href}>{children}</MarkdownLink>,
  img: ({ src, alt }) => (
    <MarkdownImage src={typeof src === "string" ? src : undefined} alt={alt} />
  ),
  hr: () => <ThematicBreak />,
  table: ({ children }) => <Table>{children}</Table>,
  thead: ({ children }) => <TableHead>{children}</TableHead>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  th: ({ children, style, align }) => (
    <TableHeaderCell style={style} align={align}>
      {children}
    </TableHeaderCell>
  ),
  td: ({ children, style, align }) => (
    <TableCell style={style} align={align}>
      {children}
    </TableCell>
  ),
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children }) => {
    const text = String(children).replace(/\n$/, "");
    const language = /language-([\w-]+)/.exec(className || "")?.[1];
    const isBlock = Boolean(language) || text.includes("\n");
    if (!isBlock) return <InlineCode>{text}</InlineCode>;
    return <Fence language={language} text={text} />;
  },
};
