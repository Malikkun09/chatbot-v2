/** Hard cap below Vercel's 4.5MB function payload limit. */
export const MAX_REQUEST_BYTES = 3_500_000;

export const CLIENT_PAYLOAD_WARN_BYTES = 3_000_000;

export const RECENT_MESSAGE_COUNT = 16;
export const STUB_CHARS = 240;

export const SESSION_STORAGE_KEY = "chatbot-v2:session";
export const SESSION_MAX_BYTES = 1_500_000;

export const DEFAULT_NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const DEFAULT_NVIDIA_MODEL =
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";

export const NVIDIA_TIMEOUT_MS = 55_000;
export const COPY_FEEDBACK_MS = 1600;

export const NEAR_BOTTOM_PX = 96;
export const KEY_COOLDOWN_MS = 30_000;
