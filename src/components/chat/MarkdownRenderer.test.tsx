import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorBlock } from "@/components/chat/ErrorBlock";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";

function renderMd(content: string, isStreaming = false) {
  return render(<MarkdownRenderer content={content} isStreaming={isStreaming} />);
}

const LONG_CODE = Array.from({ length: 80 }, (_, index) => `console.log(${index});`).join("\n");

const LONG_RESPONSE = `# Report

This is a long assistant response with several sections, enough text to exercise the parser without using replace-based Markdown hacks.

## Findings

- First observation
- Second observation
  - Nested detail
  - Another nested detail

> Quoted remark with **bold** context.

\`\`\`ts
export const n = 42;
\`\`\`

| Metric | Value |
| --- | ---: |
| Latency | 12 |
| Tokens | 4096 |

And a closing paragraph after the table.
`;

describe("MarkdownRenderer", () => {
  it("renders plain text", () => {
    renderMd("Hello there.");
    expect(screen.getByText("Hello there.")).toBeInTheDocument();
  });

  it("renders headings h1–h6", () => {
    renderMd(`# One\n## Two\n### Three\n#### Four\n##### Five\n###### Six`);
    expect(screen.getByRole("heading", { level: 1, name: "One" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Two" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 6, name: "Six" })).toBeInTheDocument();
  });

  it("renders bold, italic, and strike", () => {
    renderMd("**bold** *italic* ~~gone~~");
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("italic").tagName).toBe("EM");
    expect(screen.getByText("gone").tagName).toBe("DEL");
  });

  it("renders nested lists", () => {
    renderMd(`- alpha\n  - beta\n    - gamma\n1. one\n   1. nested`);
    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("beta")).toBeInTheDocument();
    expect(screen.getByText("gamma")).toBeInTheDocument();
    expect(screen.getByText("nested")).toBeInTheDocument();
    expect(document.querySelectorAll("ul").length).toBeGreaterThan(1);
  });

  it("renders a blockquote", () => {
    renderMd("> quoted line");
    expect(screen.getByText("quoted line").closest("blockquote")).toBeTruthy();
  });

  it("renders inline and fenced JavaScript", () => {
    renderMd("Use `n++` then\n\n```js\nconst n = 1;\n```");
    expect(screen.getByText("n++")).toBeInTheDocument();
    expect(screen.getByTestId("code-block")).toHaveTextContent("const n = 1;");
    expect(screen.getByText("js")).toBeInTheDocument();
  });

  it("renders fenced Python", () => {
    renderMd("```py\ndef hello():\n    return 1\n```");
    expect(screen.getByTestId("code-block")).toHaveTextContent("def hello():");
    expect(screen.getByText("py")).toBeInTheDocument();
  });

  it("renders long code with preserved structure", () => {
    renderMd(`\`\`\`js\n${LONG_CODE}\n\`\`\``);
    const block = screen.getByTestId("code-block");
    expect(block.querySelector("pre")).toBeTruthy();
    expect(block.textContent).toContain("console.log(79);");
  });

  it("renders a simple table", () => {
    renderMd(`| Name | Age |\n| --- | --- |\n| Ada | 36 |`);
    const table = screen.getByRole("table");
    expect(within(table).getByText("Ada")).toBeInTheDocument();
    expect(within(table).getByText("36")).toBeInTheDocument();
  });

  it("wraps wide tables for horizontal scroll inside the container", () => {
    const header = Array.from({ length: 12 }, (_, index) => `C${index + 1}`).join(" | ");
    const divider = Array.from({ length: 12 }, () => "---").join(" | ");
    const row = Array.from({ length: 12 }, (_, index) => `v${index + 1}`).join(" | ");
    renderMd(`| ${header} |\n| ${divider} |\n| ${row} |`);
    const wrap = document.querySelector(".md-table-wrap");
    expect(wrap).toBeTruthy();
    expect(wrap?.className).toContain("md-table-wrap");
    expect(screen.getByText("C12")).toBeInTheDocument();
  });

  it("renders long text inside table cells", () => {
    const long = "word ".repeat(40).trim();
    renderMd(`| Title | Notes |\n| --- | --- |\n| Keep | ${long} |`);
    expect(screen.getByText(long)).toBeInTheDocument();
  });

  it("renders numeric tables", () => {
    renderMd(`| Metric | N |\n| --- | ---: |\n| Loss | 0.013 |\n| Acc | 99 |`);
    expect(screen.getByText("0.013")).toBeInTheDocument();
    expect(screen.getByText("99")).toBeInTheDocument();
  });

  it("renders multiple tables", () => {
    renderMd(`| A | B |\n| --- | --- |\n| 1 | 2 |\n\nbetween\n\n| C | D |\n| --- | --- |\n| 3 | 4 |`);
    expect(screen.getAllByRole("table")).toHaveLength(2);
    expect(screen.getByText("between")).toBeInTheDocument();
  });

  it("renders code plus surrounding text", () => {
    renderMd(`Before\n\n\`\`\`js\nconst ok = true;\n\`\`\`\n\nAfter`);
    expect(screen.getByText("Before")).toBeInTheDocument();
    expect(screen.getByText("After")).toBeInTheDocument();
    expect(screen.getByTestId("code-block")).toHaveTextContent("const ok = true;");
  });

  it("renders a table plus surrounding text", () => {
    renderMd(`Intro\n\n| X | Y |\n| --- | --- |\n| 1 | 2 |\n\nOutro`);
    expect(screen.getByText("Intro")).toBeInTheDocument();
    expect(screen.getByText("Outro")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders a heading plus table", () => {
    renderMd(`## Scores\n\n| P | Q |\n| --- | --- |\n| 8 | 9 |`);
    expect(screen.getByRole("heading", { level: 2, name: "Scores" })).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders a list plus code", () => {
    renderMd(`- item\n- two\n\n\`\`\`py\nprint("x")\n\`\`\``);
    expect(screen.getByText("item")).toBeInTheDocument();
    expect(screen.getByTestId("code-block")).toHaveTextContent('print("x")');
  });

  it("renders a quote plus code", () => {
    renderMd(`> note this\n\n\`\`\`js\n1 + 1\n\`\`\``);
    expect(screen.getByText("note this").closest("blockquote")).toBeTruthy();
    expect(screen.getByTestId("code-block")).toBeInTheDocument();
  });

  it("renders a markdown image", () => {
    renderMd("![diagram](https://example.com/chart.png)");
    const image = screen.getByAltText("diagram");
    expect(image).toHaveAttribute("src", "https://example.com/chart.png");
  });

  it("blocks javascript: links", () => {
    renderMd("[xss](javascript:alert(1))");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("xss")).toBeInTheDocument();
  });

  it("renders a chart stub from a chart fence", () => {
    renderMd(
      "```chart\n{\"type\":\"bar\",\"title\":\"Visits\",\"illustrative\":true,\"data\":[{\"label\":\"Jan\",\"value\":3},{\"label\":\"Feb\",\"value\":5}]}\n```",
    );
    expect(screen.getByTestId("chart-renderer")).toBeInTheDocument();
    expect(screen.getByText("Visits")).toBeInTheDocument();
    expect(screen.getByText(/Illustrative data/)).toBeInTheDocument();
  });

  it("renders a long mixed response", () => {
    renderMd(LONG_RESPONSE);
    expect(screen.getByRole("heading", { level: 1, name: "Report" })).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByTestId("code-block")).toBeInTheDocument();
  });

  it("renders streaming partial markdown without throwing", () => {
    expect(() =>
      renderMd("| Name | Age |\n| --- | --- |\n| Ada", true),
    ).not.toThrow();
    expect(screen.getByTestId("markdown-root")).toHaveAttribute("data-streaming", "true");
  });

  it("renders malformed markdown as best-effort text", () => {
    expect(() => renderMd("**unclosed\n\n```js\nconst x =")).not.toThrow();
    expect(screen.getByTestId("markdown-root")).toBeInTheDocument();
  });

  it("renders an empty document", () => {
    renderMd("");
    expect(screen.getByTestId("markdown-root")).toBeEmptyDOMElement();
  });

  it("does not treat raw HTML as markup", () => {
    renderMd("Paragraph\n\n<script>alert(1)</script>\n\n**still here**");
    expect(document.querySelector("script")).toBeNull();
    expect(screen.getByText("still here").tagName).toBe("STRONG");
    expect(screen.getByTestId("markdown-root").textContent).not.toContain("alert(1)");
  });
});

describe("ErrorBlock", () => {
  it("shows a human-readable error", () => {
    render(<ErrorBlock message="The response stream dropped before it finished. Retry to continue." />);
    expect(screen.getByTestId("error-block")).toHaveTextContent("stream dropped");
  });
});
