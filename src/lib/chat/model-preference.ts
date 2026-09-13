import { SESSION_MODEL_KEY } from "@/lib/ai/constants";
import { DEFAULT_MODEL_ID, getCatalogModel, isCatalogModelId } from "@/lib/ai/catalog";

export function loadSelectedModel(): string {
  if (typeof window === "undefined") return DEFAULT_MODEL_ID;
  try {
    const stored = sessionStorage.getItem(SESSION_MODEL_KEY);
    if (stored && isCatalogModelId(stored)) return stored;
  } catch {
    // private mode / blocked storage
  }
  return DEFAULT_MODEL_ID;
}

export function saveSelectedModel(id: string): void {
  if (typeof window === "undefined") return;
  const resolved = isCatalogModelId(id) ? id : getCatalogModel(id).id;
  try {
    sessionStorage.setItem(SESSION_MODEL_KEY, resolved);
  } catch {
    // ignore quota / private mode
  }
}
