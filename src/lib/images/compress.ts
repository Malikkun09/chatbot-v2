import {
  IMAGE_QUALITY,
  MAX_ATTACHMENTS,
  MAX_COMPRESSED_IMAGE_BYTES,
  MAX_IMAGE_EDGE,
  MAX_SOURCE_IMAGE_BYTES,
} from "@/lib/constants";
import type { Attachment } from "@/lib/chat/types";
import { createId } from "@/lib/id";

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Image compression failed."));
    }, type, quality);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read compressed image."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

async function encode(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<{ blob: Blob; mimeType: string }> {
  try {
    const webp = await canvasToBlob(canvas, "image/webp", quality);
    if (webp.size > 0 && webp.type === "image/webp") {
      return { blob: webp, mimeType: "image/webp" };
    }
  } catch {
    // fall through to jpeg
  }
  const jpeg = await canvasToBlob(canvas, "image/jpeg", quality);
  return { blob: jpeg, mimeType: "image/jpeg" };
}

export async function compressImageFile(file: File): Promise<Attachment> {
  if (!file.type.startsWith("image/")) {
    return {
      id: createId(),
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      error: "Only image files can be attached.",
    };
  }

  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    return {
      id: createId(),
      name: file.name,
      mimeType: file.type,
      error: "Image is too large to attach (max 12MB before compression).",
    };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return {
        id: createId(),
        name: file.name,
        mimeType: file.type,
        error: "Could not compress this image in the browser.",
      };
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    let quality = IMAGE_QUALITY;
    let encoded = await encode(canvas, quality);
    while (encoded.blob.size > MAX_COMPRESSED_IMAGE_BYTES && quality > 0.45) {
      quality -= 0.15;
      encoded = await encode(canvas, quality);
    }

    if (encoded.blob.size > MAX_COMPRESSED_IMAGE_BYTES) {
      return {
        id: createId(),
        name: file.name,
        mimeType: file.type,
        error: "Compressed image is still too large. Try a smaller photo.",
      };
    }

    const dataUrl = await blobToDataUrl(encoded.blob);
    return {
      id: createId(),
      name: file.name,
      mimeType: encoded.mimeType,
      dataUrl,
      width,
      height,
      sizeBytes: encoded.blob.size,
    };
  } catch {
    return {
      id: createId(),
      name: file.name,
      mimeType: file.type,
      error: "Could not read or compress this image.",
    };
  }
}

export function canAddAttachments(currentCount: number, incomingCount: number): boolean {
  return currentCount + incomingCount <= MAX_ATTACHMENTS;
}
