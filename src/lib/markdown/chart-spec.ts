export type ChartType = "bar" | "line" | "pie" | "scatter";

export interface ChartPoint {
  label?: string;
  value?: number;
  x?: number;
  y?: number;
}

export interface ChartSpec {
  type: ChartType;
  title?: string;
  xLabel?: string;
  yLabel?: string;
  illustrative: boolean;
  data: ChartPoint[];
}

const TYPES: ChartType[] = ["bar", "line", "pie", "scatter"];

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function asPoints(value: unknown): ChartPoint[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const points: ChartPoint[] = [];
  for (const item of value) {
    if (typeof item === "number" && Number.isFinite(item)) {
      points.push({ value: item, label: String(points.length + 1) });
      continue;
    }
    if (!item || typeof item !== "object") return null;
    const record = item as Record<string, unknown>;
    const point: ChartPoint = {
      label: typeof record.label === "string" ? record.label : typeof record.name === "string" ? record.name : undefined,
      value: asNumber(record.value) ?? asNumber(record.y),
      x: asNumber(record.x),
      y: asNumber(record.y),
    };
    if (point.value === undefined && point.x === undefined && point.y === undefined) {
      return null;
    }
    points.push(point);
  }
  return points;
}

function asType(value: unknown): ChartType | null {
  if (typeof value !== "string") return null;
  const next = value.toLowerCase() as ChartType;
  return TYPES.includes(next) ? next : null;
}

export function parseChartSpec(raw: string): ChartSpec | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }

  if (Array.isArray(parsed)) {
    const data = asPoints(parsed);
    if (!data) return null;
    return { type: "bar", illustrative: true, data };
  }

  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Record<string, unknown>;
  const nested =
    record.chart && typeof record.chart === "object"
      ? (record.chart as Record<string, unknown>)
      : record;

  const type = asType(nested.type) ?? asType(nested.chartType) ?? asType(nested.kind);
  const data =
    asPoints(nested.data) ??
    asPoints(nested.points) ??
    asPoints(nested.values) ??
    asPoints(nested.series);
  if (!type || !data) return null;

  return {
    type,
    title: typeof nested.title === "string" ? nested.title : undefined,
    xLabel: typeof nested.xLabel === "string" ? nested.xLabel : undefined,
    yLabel: typeof nested.yLabel === "string" ? nested.yLabel : undefined,
    illustrative: nested.illustrative !== false,
    data,
  };
}

export function looksLikeJson(raw: string): boolean {
  const trimmed = raw.trim();
  return (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  );
}
