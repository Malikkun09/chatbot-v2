const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF

export function looksLikePdf(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_MAGIC.length) return false;
  return PDF_MAGIC.every((value, index) => bytes[index] === value);
}

export function decodeAttachmentBytes(input: string): Uint8Array {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Empty attachment payload");

  if (trimmed.startsWith("data:")) {
    const comma = trimmed.indexOf(",");
    if (comma === -1) throw new Error("Invalid data URL");
    const meta = trimmed.slice(5, comma);
    const payload = trimmed.slice(comma + 1).replace(/\s/g, "");
    if (/;base64/i.test(meta)) {
      return uint8FromBase64(payload);
    }
    return new TextEncoder().encode(decodeURIComponent(payload));
  }

  return uint8FromBase64(trimmed.replace(/\s/g, ""));
}

export function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function uint8FromBase64(payload: string): Uint8Array {
  const buffer = Buffer.from(payload, "base64");
  if (!payload || buffer.length === 0) throw new Error("Invalid base64 payload");
  return new Uint8Array(buffer);
}
