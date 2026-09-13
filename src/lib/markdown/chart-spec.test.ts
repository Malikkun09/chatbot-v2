import { describe, expect, it } from "vitest";
import { parseChartSpec } from "@/lib/markdown/chart-spec";

describe("parseChartSpec", () => {
  it("parses a bar spec", () => {
    const spec = parseChartSpec(
      JSON.stringify({
        type: "bar",
        title: "Demo",
        illustrative: true,
        data: [
          { label: "A", value: 1 },
          { label: "B", value: 2 },
        ],
      }),
    );
    expect(spec?.type).toBe("bar");
    expect(spec?.data).toHaveLength(2);
  });

  it("rejects random json", () => {
    expect(parseChartSpec('{"hello":"world"}')).toBeNull();
  });
});
