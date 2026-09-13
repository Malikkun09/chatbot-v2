import type { ReactNode } from "react";
import type { ChartSpec } from "@/lib/markdown/chart-spec";

const PALETTE = ["#d4d4d4", "#8a8a8a", "#ececec", "#5c5c5c", "#b4b4b4", "#707070"];

function color(index: number): string {
  return PALETTE[index % PALETTE.length] ?? "#d4d4d4";
}

function numeric(point: { value?: number; y?: number }, fallback = 0): number {
  return point.value ?? point.y ?? fallback;
}

export function ChartRenderer({ spec }: { spec: ChartSpec }) {
  const width = 560;
  const height = 280;
  const pad = { top: 16, right: 16, bottom: 36, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const values = spec.data.map((point) => numeric(point));
  const max = Math.max(1, ...values.map((value) => Math.abs(value)));

  let graphic: ReactNode = null;

  if (spec.type === "pie") {
    const total = values.reduce((sum, value) => sum + Math.abs(value), 0) || 1;
    let angle = -Math.PI / 2;
    const cx = width / 2;
    const cy = height / 2 - 8;
    const r = 86;
    graphic = spec.data.map((point, index) => {
      const slice = (Math.abs(numeric(point)) / total) * Math.PI * 2;
      const start = angle;
      const end = angle + slice;
      angle = end;
      const large = slice > Math.PI ? 1 : 0;
      const x1 = cx + r * Math.cos(start);
      const y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
      return <path key={index} d={d} fill={color(index)} opacity={0.85} />;
    });
  } else if (spec.type === "scatter") {
    const xs = spec.data.map((point) => point.x ?? 0);
    const ys = spec.data.map((point) => point.y ?? point.value ?? 0);
    const minX = Math.min(...xs, 0);
    const maxX = Math.max(...xs, 1);
    const minY = Math.min(...ys, 0);
    const maxY = Math.max(...ys, 1);
    graphic = spec.data.map((point, index) => {
      const x = pad.left + ((point.x ?? 0) - minX) / (maxX - minX || 1) * innerW;
      const y = pad.top + innerH - ((point.y ?? point.value ?? 0) - minY) / (maxY - minY || 1) * innerH;
      return <circle key={index} cx={x} cy={y} r={4} fill={color(index)} />;
    });
  } else if (spec.type === "line") {
    const coords = spec.data.map((point, index) => {
      const x = pad.left + (index / Math.max(spec.data.length - 1, 1)) * innerW;
      const y = pad.top + innerH - (numeric(point) / max) * innerH;
      return `${x},${y}`;
    });
    graphic = (
      <>
        <polyline
          fill="none"
          stroke="#d4d4d4"
          strokeWidth="1.6"
          points={coords.join(" ")}
        />
        {spec.data.map((point, index) => {
          const x = pad.left + (index / Math.max(spec.data.length - 1, 1)) * innerW;
          const y = pad.top + innerH - (numeric(point) / max) * innerH;
          return <circle key={index} cx={x} cy={y} r={3} fill="#ececec" />;
        })}
      </>
    );
  } else {
    const gap = 8;
    const barW = innerW / spec.data.length - gap;
    graphic = spec.data.map((point, index) => {
      const h = (numeric(point) / max) * innerH;
      const x = pad.left + index * (barW + gap);
      const y = pad.top + innerH - h;
      return <rect key={index} x={x} y={y} width={Math.max(barW, 2)} height={h} fill={color(index)} />;
    });
  }

  return (
    <figure className="md-chart" data-testid="chart-renderer">
      {spec.title ? <figcaption className="md-chart-title">{spec.title}</figcaption> : null}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={spec.title || `${spec.type} chart`}
        className="md-chart-svg"
      >
        {spec.type !== "pie" ? (
          <>
            <line
              x1={pad.left}
              y1={pad.top + innerH}
              x2={pad.left + innerW}
              y2={pad.top + innerH}
              stroke="#2a2a2a"
            />
            <line
              x1={pad.left}
              y1={pad.top}
              x2={pad.left}
              y2={pad.top + innerH}
              stroke="#2a2a2a"
            />
          </>
        ) : null}
        {graphic}
        {spec.type !== "pie"
          ? spec.data.map((point, index) => {
              const x = pad.left + (index / Math.max(spec.data.length - 1, 1)) * innerW;
              return (
                <text
                  key={`label-${index}`}
                  x={spec.type === "bar" ? pad.left + index * (innerW / spec.data.length) + 4 : x}
                  y={height - 12}
                  fill="#8a8a8a"
                  fontSize="10"
                >
                  {point.label ?? point.x ?? index + 1}
                </text>
              );
            })
          : null}
      </svg>
      {spec.illustrative ? (
        <p className="md-chart-note">Illustrative data — not a live measurement.</p>
      ) : null}
    </figure>
  );
}
