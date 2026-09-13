import type { ReactNode } from "react";

export function List({
  ordered,
  children,
  className,
}: {
  ordered: boolean;
  children: ReactNode;
  className?: string;
}) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={["md-list", ordered ? "md-ol" : "md-ul", className].filter(Boolean).join(" ")}>
      {children}
    </Tag>
  );
}

export function ListItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <li className={["md-li", className].filter(Boolean).join(" ")}>{children}</li>;
}

export function TaskCheckbox({ checked }: { checked?: boolean }) {
  return (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      disabled
      readOnly
      tabIndex={-1}
      className="md-task"
      aria-hidden
    />
  );
}
