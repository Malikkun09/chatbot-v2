import { KEY_COOLDOWN_MS } from "@/lib/constants";

const until = new Map<string, number>();

export function markKeyCooldown(key: string, ms = KEY_COOLDOWN_MS): void {
  until.set(key, Date.now() + ms);
}

export function isKeyCooling(key: string, now = Date.now()): boolean {
  const exp = until.get(key);
  if (!exp) return false;
  if (now >= exp) {
    until.delete(key);
    return false;
  }
  return true;
}

export function preferFreshKeys(keys: string[], now = Date.now()): string[] {
  const fresh = keys.filter((key) => !isKeyCooling(key, now));
  return fresh.length > 0 ? fresh : keys;
}

export function clearKeyCooldowns(): void {
  until.clear();
}
