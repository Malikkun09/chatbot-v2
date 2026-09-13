import type { ReactNode } from "react";
import { Callout, type CalloutKind } from "@/components/chat/Callout";

const KINDS: CalloutKind[] = ["note", "tip", "important", "warning", "caution"];

function asKind(value: unknown): CalloutKind | null {
  if (typeof value !== "string") return null;
  const kind = value.toLowerCase() as CalloutKind;
  return KINDS.includes(kind) ? kind : null;
}

export function Blockquote({
  children,
  ...props
}: {
  children: ReactNode;
  "data-callout"?: string;
  dataCallout?: string;
}) {
  const kind = asKind(props["data-callout"] ?? props.dataCallout);
  if (kind) {
    return <Callout kind={kind}>{children}</Callout>;
  }
  return <blockquote className="md-quote">{children}</blockquote>;
}
