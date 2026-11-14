"use client";

import {
  BP_IMAGE_COMPRESSION_QUALITY,
  BP_IMAGE_MAX_BYTES,
  BP_IMAGE_MAX_DIMENSION,
  isAllowedBpImageFile,
  isHeicFile,
  normalizeImageMimeType,
} from "@/lib/bp/image";

export interface CompressedBpImageResult {
  file: File;
  compressed: boolean;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

async function encodeCanvas(
  bitmap: ImageBitmap,
  width: number,
  height: number,
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(bitmap, 0, 0, width, height);
    const webpBlob = await canvasToBlob(
      canvas,
      "image/webp",
      BP_IMAGE_COMPRESSION_QUALITY,
    );
    if (webpBlob && webpBlob.type === "image/webp") {
      return webpBlob;
    }

    // Fill transparent regions with white before encoding as JPEG.
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";

    return await canvasToBlob(
      canvas,
      "image/jpeg",
      BP_IMAGE_COMPRESSION_QUALITY,
    );
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

/**
 * Resizes and compresses a BP monitor photo in the browser using Canvas API.
 * Falls back to the original file for browser-unreadable HEIC files within 5 MB.
 */
export async function compressBpImage(
  file: File,
): Promise<CompressedBpImageResult> {
  if (!isAllowedBpImageFile(file)) {
    throw new Error("Image must be a JPEG, PNG, WebP, or HEIC file");
  }
  if (file.size === 0) {
    throw new Error("Image file is empty");
  }

  if (typeof createImageBitmap !== "function") {
    if (file.size <= BP_IMAGE_MAX_BYTES) {
      return { file, compressed: false };
    }
    throw new Error(
      "Image exceeds 5 MB and cannot be compressed in this browser",
    );
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (isHeicFile(file)) {
      if (file.size <= BP_IMAGE_MAX_BYTES) {
        return { file, compressed: false };
      }
      throw new Error(
        "HEIC images cannot be compressed in this browser and exceed the 5 MB limit. Please choose a smaller photo or JPEG/PNG.",
      );
    }
    throw new Error(
      "Unable to read this image file. Please choose another image.",
    );
  }

  try {
    const scale = Math.min(
      1,
      BP_IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
    const targetHeight = Math.max(1, Math.round(bitmap.height * scale));
    const resized =
      targetWidth !== bitmap.width || targetHeight !== bitmap.height;

    const blob = await encodeCanvas(bitmap, targetWidth, targetHeight);
    if (!blob) {
      if (file.size <= BP_IMAGE_MAX_BYTES) {
        return { file, compressed: false };
      }
      throw new Error("Unable to compress this image");
    }

    const originalMime = normalizeImageMimeType(file.type);
    const isWebSafeOriginal =
      originalMime === "image/jpeg" ||
      originalMime === "image/png" ||
      originalMime === "image/webp";

    if (
      !resized &&
      blob.size >= file.size &&
      file.size <= BP_IMAGE_MAX_BYTES &&
      isWebSafeOriginal
    ) {
      return { file, compressed: false };
    }

    if (blob.size > BP_IMAGE_MAX_BYTES) {
      throw new Error("Compressed image still exceeds the 5 MB limit");
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "bp-image";
    const extension = blob.type === "image/webp" ? "webp" : "jpg";
    const compressedFile = new File([blob], `${baseName}.${extension}`, {
      type: blob.type,
      lastModified: Date.now(),
    });

    return { file: compressedFile, compressed: true };
  } finally {
    bitmap.close();
  }
}
