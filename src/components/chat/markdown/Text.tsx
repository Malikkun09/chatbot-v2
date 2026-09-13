import type { ReactNode } from "react";

export function TextParagraph({ children }: { children: ReactNode }) {
  return <p className="md-p">{children}</p>;
}

export function InlineCode({ children }: { children: ReactNode }) {
  return <code className="md-inline-code">{children}</code>;
}

export function ThematicBreak() {
  return <hr className="md-hr" />;
}
