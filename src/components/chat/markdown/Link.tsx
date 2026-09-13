import type { ReactNode } from "react";
import { safeHref } from "@/lib/markdown/safe-url";

export function MarkdownLink({
  href,
  children,
}: {
  href?: string;
  children: ReactNode;
}) {
  const safe = safeHref(href);
  if (!safe) {
    return <span className="md-link-blocked">{children}</span>;
  }
  const external = safe.startsWith("http://") || safe.startsWith("https://");
  return (
    <a
      href={safe}
      className="md-link"
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
    >
      {children}
    </a>
  );
}
