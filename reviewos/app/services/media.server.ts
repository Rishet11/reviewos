// Review media validation. Pure functions, no I/O, so they're portable
// (kept in sync manually with shopify-app/app/services/media.server.ts) and
// trivially unit-testable.

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
export const MAX_MEDIA_PER_REVIEW = 5;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];

export function classifyContentType(contentType: string): "image" | "video" | null {
  if (ALLOWED_IMAGE_TYPES.includes(contentType)) return "image";
  if (ALLOWED_VIDEO_TYPES.includes(contentType)) return "video";
  return null;
}

export function validateMediaUpload(
  contentType: string,
  sizeBytes: number
): { ok: true; type: "image" | "video" } | { ok: false; error: string } {
  const type = classifyContentType(contentType);
  if (!type) {
    return { ok: false, error: "unsupported_content_type" };
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, error: "invalid_size" };
  }
  const max = type === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (sizeBytes > max) {
    return { ok: false, error: type === "image" ? "image_too_large" : "video_too_large" };
  }
  return { ok: true, type };
}
