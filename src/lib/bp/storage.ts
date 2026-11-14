import {
  BP_IMAGE_BUCKET,
  BP_IMAGE_MAX_BYTES,
  BP_IMAGE_SIGNED_URL_TTL_SECONDS,
  type AllowedBpImageMimeType,
} from "@/lib/bp/image";
import type { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

interface DetectedImageFormat {
  mimeType: AllowedBpImageMimeType;
  extension: string;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis"]);
const HEIF_BRANDS = new Set(["mif1", "msf1"]);

function readAscii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

/** Verifies actual image file signatures rather than trusting client headers or extensions. */
function detectImageFormat(bytes: Uint8Array): DetectedImageFormat | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }

  if (
    bytes.length >= PNG_SIGNATURE.length &&
    PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)
  ) {
    return { mimeType: "image/png", extension: "png" };
  }

  if (
    bytes.length >= 12 &&
    readAscii(bytes, 0, 4) === "RIFF" &&
    readAscii(bytes, 8, 12) === "WEBP"
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }

  if (bytes.length >= 12 && readAscii(bytes, 4, 8) === "ftyp") {
    const brand = readAscii(bytes, 8, 12).toLowerCase();
    if (HEIC_BRANDS.has(brand)) {
      return { mimeType: "image/heic", extension: "heic" };
    }
    if (HEIF_BRANDS.has(brand)) {
      return { mimeType: "image/heif", extension: "heif" };
    }
  }

  return null;
}

/** Validates and uploads a BP image to the private per-user Storage folder. */
export async function uploadBpImage(
  supabase: ServerSupabaseClient,
  userId: string,
  file: File,
): Promise<{ path: string } | { error: string }> {
  if (file.size === 0) return { error: "Image file is empty" };
  if (file.size > BP_IMAGE_MAX_BYTES) {
    return { error: "Image must be 5 MB or smaller" };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectImageFormat(bytes);
  if (!detected) {
    return {
      error:
        "Unsupported or invalid image file. Allowed formats: JPEG, PNG, WebP, HEIC.",
    };
  }

  const path = `${userId}/${crypto.randomUUID()}.${detected.extension}`;
  const { error } = await supabase.storage
    .from(BP_IMAGE_BUCKET)
    .upload(path, bytes, {
      contentType: detected.mimeType,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) return { error: error.message };
  return { path };
}

/** Best-effort removal of a Storage object; logs failures without throwing. */
export async function removeBpImageSafely(
  supabase: ServerSupabaseClient,
  path: string,
): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(BP_IMAGE_BUCKET)
      .remove([path]);
    if (error) {
      console.warn("[bp] Failed to remove storage image:", error.message);
    }
  } catch (error) {
    console.warn(
      "[bp] Storage image removal threw:",
      error instanceof Error ? error.message : "unknown error",
    );
  }
}

/** Batch-generates short-lived signed URLs for private BP image paths. */
export async function createSignedImageUrlMap(
  supabase: ServerSupabaseClient,
  paths: string[],
): Promise<Map<string, string>> {
  const uniquePaths = Array.from(new Set(paths));
  const urlMap = new Map<string, string>();
  if (uniquePaths.length === 0) return urlMap;

  try {
    const { data, error } = await supabase.storage
      .from(BP_IMAGE_BUCKET)
      .createSignedUrls(uniquePaths, BP_IMAGE_SIGNED_URL_TTL_SECONDS);

    if (error || !data) {
      if (error) {
        console.warn("[bp] Failed to sign image URLs:", error.message);
      }
      return urlMap;
    }

    for (const item of data) {
      if (item.path && item.signedUrl && !item.error) {
        urlMap.set(item.path, item.signedUrl);
      }
    }
  } catch (error) {
    console.warn(
      "[bp] Signed URL generation threw:",
      error instanceof Error ? error.message : "unknown error",
    );
  }

  return urlMap;
}
