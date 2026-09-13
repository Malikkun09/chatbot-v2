"use client";

import { useState } from "react";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function Node({
  name,
  value,
  depth,
}: {
  name?: string;
  value: unknown;
  depth: number;
}) {
  const [open, setOpen] = useState(depth < 2);

  if (value === null || typeof value !== "object") {
    return (
      <div className="json-line">
        {name ? <span className="json-key">{name}: </span> : null}
        <span className="json-scalar">{JSON.stringify(value)}</span>
      </div>
    );
  }

  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : Object.entries(value);
  const label = Array.isArray(value) ? `Array(${value.length})` : "Object";

  return (
    <div className="json-block">
      <button type="button" className="json-toggle" onClick={() => setOpen((prev) => !prev)}>
        <span aria-hidden>{open ? "▾" : "▸"}</span>
        {name ? <span className="json-key">{name}</span> : null}
        <span className="json-meta">{label}</span>
      </button>
      {open ? (
        <div className="json-children">
          {entries.map(([key, child]) => (
            <Node key={key} name={key} value={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function JsonViewer({ value }: { value: string }) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    return null;
  }

  if (!isRecord(parsed) && !Array.isArray(parsed)) return null;

  return (
    <div className="json-viewer" data-testid="json-viewer">
      <Node value={parsed} depth={0} />
    </div>
  );
}
