import type { ReactNode } from "react";

export type CalloutKind = "note" | "tip" | "important" | "warning" | "caution";

const LABELS: Record<CalloutKind, string> = {
  note: "Note",
  tip: "Tip",
  important: "Important",
  warning: "Warning",
  caution: "Caution",
};

export function Callout({ kind, children }: { kind: CalloutKind; children: ReactNode }) {
  return (
    <aside className={`md-callout md-callout-${kind}`} data-testid="callout">
      <strong className="md-callout-label">{LABELS[kind]}</strong>
      <div className="md-callout-body">{children}</div>
    </aside>
  );
}
