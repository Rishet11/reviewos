// Framework-free upload helper shared by both widget variants (widget.ts for
// the demo, shopify/mount.ts for the Theme App Extension). Each variant
// supplies its own `presign` function (api.ts / shopify/api.ts) matching
// PresignFn - same shape returned by both backends' presign routes.

// Mirrors MAX_MEDIA_PER_REVIEW in both app/services/media.server.ts files -
// duplicated here (not imported) because those are server modules and this
// file ships in the client widget bundle.
export const MAX_MEDIA_PER_REVIEW = 5;

export type PresignFn = (file: {
  filename: string;
  contentType: string;
  sizeBytes: number;
}) => Promise<{
  uploadUrl: string;
  method: string;
  headers: Record<string, string>;
  publicUrl: string;
  storageKey: string;
  type: string;
}>;

export type UploadedMedia = {
  type: string;
  url: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
};

// The widget re-renders its whole innerHTML on every store.setState, so a
// naive `URL.createObjectURL(file)` inside a render function would mint a
// new blob URL (and leak the old one) on every unrelated state change while
// the write-review modal is open. Cache by File identity instead, and have
// callers revoke explicitly when a file is removed from state.
const previewUrlCache = new WeakMap<File, string>();

export function getPreviewUrl(file: File): string {
  let url = previewUrlCache.get(file);
  if (!url) {
    url = URL.createObjectURL(file);
    previewUrlCache.set(file, url);
  }
  return url;
}

export function revokePreviewUrl(file: File): void {
  const url = previewUrlCache.get(file);
  if (url) {
    URL.revokeObjectURL(url);
    previewUrlCache.delete(file);
  }
}

export function revokeAllPreviewUrls(files: File[]): void {
  for (const file of files) revokePreviewUrl(file);
}

export async function uploadReviewMedia(files: File[], presign: PresignFn): Promise<UploadedMedia[]> {
  const results: UploadedMedia[] = [];
  // Sequential, not Promise.all - cap is 5 files, this simplifies
  // partial-failure handling (we know exactly which file failed and can stop
  // immediately instead of racing several in-flight uploads).
  for (const file of files) {
    const presigned = await presign({
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    });
    const res = await fetch(presigned.uploadUrl, {
      method: presigned.method,
      headers: presigned.headers,
      body: file,
    });
    if (!res.ok) throw new Error(`upload_failed:${file.name}`);
    results.push({
      type: presigned.type,
      url: presigned.publicUrl,
      storageKey: presigned.storageKey,
      mimeType: file.type,
      sizeBytes: file.size,
    });
  }
  return results;
}
