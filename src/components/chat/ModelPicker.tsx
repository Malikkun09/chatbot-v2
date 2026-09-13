"use client";

import { MODEL_CATALOG } from "@/lib/ai/catalog";

export function ModelPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="model-picker-wrap">
      <span className="sr-only">Model</span>
      <select
        className="model-picker"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {MODEL_CATALOG.map((model) => (
          <option key={model.id} value={model.id}>
            {model.label} · {model.hint}
          </option>
        ))}
      </select>
    </label>
  );
}
