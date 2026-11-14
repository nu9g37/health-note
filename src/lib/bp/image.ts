export const BP_IMAGE_BUCKET = "bp-images";
export const BP_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const BP_IMAGE_SIGNED_URL_TTL_SECONDS = 60 * 60;
export const BP_IMAGE_MAX_DIMENSION = 1280;
export const BP_IMAGE_COMPRESSION_QUALITY = 0.8;

export const BP_IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export type AllowedBpImageMimeType = (typeof BP_IMAGE_ALLOWED_MIME_TYPES)[number];

export const BP_IMAGE_ACCEPT = [
  ...BP_IMAGE_ALLOWED_MIME_TYPES,
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
].join(",");

const ALLOWED_IMAGE_MIME_SET = new Set<string>(BP_IMAGE_ALLOWED_MIME_TYPES);
const ALLOWED_IMAGE_EXTENSION_SET = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
]);

/** Normalizes MIME aliases (such as `image/jpg`) to canonical values. */
export function normalizeImageMimeType(mimeType: string): string {
  const normalized = mimeType.trim().toLowerCase();
  return normalized === "image/jpg" ? "image/jpeg" : normalized;
}

function getFileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) return "";
  return filename.slice(dotIndex + 1).trim().toLowerCase();
}

/** Returns true when a file appears to be HEIC/HEIF by MIME type or extension. */
export function isHeicFile(file: Pick<File, "type" | "name">): boolean {
  const mime = normalizeImageMimeType(file.type);
  if (mime === "image/heic" || mime === "image/heif") return true;
  const ext = getFileExtension(file.name);
  return ext === "heic" || ext === "heif";
}

/** Checks whether a selected file's MIME type or extension is an allowed BP image type. */
export function isAllowedBpImageFile(
  file: Pick<File, "type" | "name">,
): boolean {
  const mime = normalizeImageMimeType(file.type);
  if (mime) return ALLOWED_IMAGE_MIME_SET.has(mime);
  return ALLOWED_IMAGE_EXTENSION_SET.has(getFileExtension(file.name));
}

/** Duck-typed guard for File instances across server and browser FormData runtimes. */
export function isUploadedFile(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "size" in value &&
    typeof value.size === "number" &&
    "type" in value &&
    typeof value.type === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "arrayBuffer" in value &&
    typeof value.arrayBuffer === "function"
  );
}

/** Formats byte counts for compact UI display (e.g. `245 KB`). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
