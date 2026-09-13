export function ThinkingBlock({
  text,
  streaming,
}: {
  text: string;
  streaming?: boolean;
}) {
  if (!text && !streaming) return null;
  return (
    <details className="thinking" data-testid="thinking-block" open={streaming || undefined}>
      <summary className="thinking-summary">{streaming ? "Thinking…" : "Thinking"}</summary>
      <pre className="thinking-body">{text || " "}</pre>
    </details>
  );
}
