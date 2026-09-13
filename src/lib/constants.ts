/** Hard cap below Vercel's 4.5MB function payload limit. */
export const MAX_REQUEST_BYTES = 3_500_000;

/** Client-side warning threshold before we even POST. */
export const CLIENT_PAYLOAD_WARN_BYTES = 3_000_000;

export const RECENT_MESSAGE_COUNT = 16;
export const STUB_CHARS = 240;

export const MAX_IMAGE_EDGE = 1440;
export const IMAGE_QUALITY = 0.8;
export const MAX_ATTACHMENTS = 4;
export const MAX_SOURCE_IMAGE_BYTES = 12 * 1024 * 1024;
export const MAX_COMPRESSED_IMAGE_BYTES = 700_000;

export const SESSION_STORAGE_KEY = "chatbot-v2:session";
export const SESSION_MAX_BYTES = 1_500_000;

export const DEFAULT_NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const DEFAULT_NVIDIA_MODEL =
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";

export const NVIDIA_TIMEOUT_MS = 55_000;
export const COPY_FEEDBACK_MS = 1600;
