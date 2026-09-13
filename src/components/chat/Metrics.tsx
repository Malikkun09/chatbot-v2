import type { MessageMetrics, TokenUsage } from "@/lib/chat/types";

function formatMs(value?: number): string | null {
  if (value === undefined || Number.isNaN(value)) return null;
  if (value < 1000) return `${Math.round(value)}ms`;
  return `${(value / 1000).toFixed(1)}s`;
}

export function Metrics({
  latency,
  usage,
  model,
}: {
  latency?: MessageMetrics;
  usage?: TokenUsage;
  model?: string;
}) {
  const bits: string[] = [];
  const ttft = formatMs(latency?.ttftMs);
  if (ttft) bits.push(`TTFT ${ttft}`);
  if (latency?.tokensPerSecond) {
    bits.push(`${latency.tokensPerSecond.toFixed(1)} tok/s`);
  }
  const gen = formatMs(latency?.generationMs ?? latency?.durationMs);
  if (gen) bits.push(`${gen} gen`);
  if (usage?.promptTokens !== undefined || usage?.completionTokens !== undefined) {
    bits.push(`${usage.promptTokens ?? "?"}→${usage.completionTokens ?? "?"} tok`);
  }

  if (bits.length === 0 && !model) return null;

  return (
    <p className="metrics" data-testid="metrics">
      {model ? <span className="metrics-model">{model}</span> : null}
      {bits.length ? <span>{bits.join(" · ")}</span> : null}
    </p>
  );
}
