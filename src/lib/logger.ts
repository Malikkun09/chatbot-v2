export function logChat(
  event: string,
  fields: Record<string, string | number | boolean | undefined | null> = {},
): void {
  const parts = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${value}`);
  console.info(`[chat] ${event}${parts.length ? ` ${parts.join(" ")}` : ""}`);
}
