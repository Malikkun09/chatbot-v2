import type { CSSProperties, ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="md-table-wrap" role="region" aria-label="Table" tabIndex={0}>
      <table className="md-table">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ children }: { children: ReactNode }) {
  return <tr>{children}</tr>;
}

export function TableHeaderCell({
  children,
  align,
  style,
}: {
  children: ReactNode;
  align?: string;
  style?: CSSProperties;
}) {
  return (
    <th align={align as "left" | "center" | "right" | undefined} style={style} className="md-th">
      {children}
    </th>
  );
}

export function TableCell({
  children,
  align,
  style,
}: {
  children: ReactNode;
  align?: string;
  style?: CSSProperties;
}) {
  return (
    <td align={align as "left" | "center" | "right" | undefined} style={style} className="md-td">
      {children}
    </td>
  );
}
