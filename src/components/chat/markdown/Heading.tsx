import type { ReactNode } from "react";

const TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

export function Heading({
  level,
  children,
}: {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: ReactNode;
}) {
  const Tag = TAGS[level - 1];
  return <Tag className={`md-h md-h${level}`}>{children}</Tag>;
}
