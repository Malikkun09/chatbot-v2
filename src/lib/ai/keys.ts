import { MAX_FAILOVER_ATTEMPTS } from "@/lib/ai/constants";

export function parseKeys(primary?: string, csv?: string): string[] {
  const fromList =
    csv
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? [];
  const keys = [...fromList];
  const head = primary?.trim();
  if (head && !keys.includes(head)) keys.unshift(head);
  return keys;
}

/** Rotate from a random start; cap attempts so extra keys are failover, not quota stacking. */
export function rotateKeys(
  keys: string[],
  maxAttempts = MAX_FAILOVER_ATTEMPTS,
  random = Math.random,
): string[] {
  if (keys.length === 0) return [];
  const start = Math.floor(random() * keys.length);
  const rotated = [...keys.slice(start), ...keys.slice(0, start)];
  return rotated.slice(0, Math.min(maxAttempts, rotated.length));
}

export function shouldFailover(status: number): boolean {
  return status === 401 || status === 403 || status === 429 || (status >= 500 && status <= 504);
}
