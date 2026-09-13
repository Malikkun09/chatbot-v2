import {
  DEFAULT_NVIDIA_BASE_URL,
  DEFAULT_NVIDIA_MODEL,
} from "@/lib/constants";
import {
  DEFAULT_OPENROUTER_APP_NAME,
  DEFAULT_OPENROUTER_BASE_URL,
  DEFAULT_OPENROUTER_SITE_URL,
} from "@/lib/ai/constants";
import { parseKeys } from "@/lib/ai/keys";

export function nvidiaBaseUrl(): string {
  const raw = process.env.NVIDIA_BASE_URL?.trim() || DEFAULT_NVIDIA_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export function nvidiaModel(): string {
  return process.env.NVIDIA_MODEL?.trim() || DEFAULT_NVIDIA_MODEL;
}

export function nvidiaKeys(): string[] {
  return parseKeys(process.env.NVIDIA_API_KEY, process.env.NVIDIA_API_KEYS);
}

export function openrouterBaseUrl(): string {
  const raw = process.env.OPENROUTER_BASE_URL?.trim() || DEFAULT_OPENROUTER_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export function openrouterKeys(): string[] {
  return parseKeys(process.env.OPENROUTER_API_KEY, process.env.OPENROUTER_API_KEYS);
}

export function openrouterHeaders(): Record<string, string> {
  const referer = process.env.OPENROUTER_SITE_URL?.trim() || DEFAULT_OPENROUTER_SITE_URL;
  const title = process.env.OPENROUTER_APP_NAME?.trim() || DEFAULT_OPENROUTER_APP_NAME;
  return {
    "HTTP-Referer": referer,
    "X-Title": title,
  };
}
