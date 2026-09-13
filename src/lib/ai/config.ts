import {
  DEFAULT_NVIDIA_BASE_URL,
  DEFAULT_NVIDIA_MODEL,
} from "@/lib/constants";

export function nvidiaBaseUrl(): string {
  const raw = process.env.NVIDIA_BASE_URL?.trim() || DEFAULT_NVIDIA_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export function nvidiaModel(): string {
  return process.env.NVIDIA_MODEL?.trim() || DEFAULT_NVIDIA_MODEL;
}

export function nvidiaKeys(): string[] {
  const fromList =
    process.env.NVIDIA_API_KEYS?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? [];
  const primary = process.env.NVIDIA_API_KEY?.trim();
  const keys = [...fromList];
  if (primary && !keys.includes(primary)) keys.unshift(primary);
  return keys;
}

export function shouldFailover(status: number): boolean {
  return status === 401 || status === 403 || status === 429 || (status >= 500 && status <= 504);
}
