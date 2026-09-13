import { looksLikeJson } from "@/lib/markdown/chart-spec";
import { JsonViewer } from "@/components/chat/JsonViewer";

export function ToolCallBlock({
  name,
  args,
}: {
  name: string;
  args?: string;
}) {
  const json = Boolean(args && looksLikeJson(args));
  return (
    <section className="tool-call" data-testid="tool-call-block">
      <header className="tool-call-head">Tool · {name}</header>
      {json && args ? <JsonViewer value={args} /> : args ? <pre className="thinking-body">{args}</pre> : (
        <p className="tool-call-empty">No arguments</p>
      )}
    </section>
  );
}
