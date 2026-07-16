import { mkdirSync, createWriteStream, unlink } from "node:fs";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  validateMediaUpload,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from "~/services/media.server";

// Demo-app "object storage": PUT target the presigned uploadUrl points at.
// Writes straight to public/uploads/reviews/<key> so the file is servable
// at /uploads/reviews/<key> by the static file server, mirroring what R2's
// public bucket URL does for shopify-app.
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "reviews");

export async function action({
  params,
  request,
}: {
  params: { key: string };
  request: Request;
}) {
  if (request.method !== "PUT") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  const key = params.key;
  // Reject path traversal / nested paths - key must be a plain filename.
  if (!key || key.includes("/") || key.includes("..") || key.includes("\\")) {
    return Response.json({ error: "invalid_key" }, { status: 400 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  const contentLength = Number(request.headers.get("content-length"));

  const validation = validateMediaUpload(contentType, contentLength);
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  if (!request.body) {
    return Response.json({ error: "empty_body" }, { status: 400 });
  }

  mkdirSync(UPLOAD_DIR, { recursive: true });
  const destPath = path.join(UPLOAD_DIR, key);

  // The Content-Length header is just a client claim, already checked above
  // against validateMediaUpload - but nothing stops a client from lying
  // about it and streaming more bytes than declared. This counts actual
  // bytes written and aborts (deleting the partial file) once the real cap
  // for the classified type is exceeded, independent of the header.
  const maxBytes = validation.type === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  let written = 0;
  const limiter = new Transform({
    transform(chunk, _enc, callback) {
      written += chunk.length;
      if (written > maxBytes) {
        callback(new Error("size_limit_exceeded"));
        return;
      }
      callback(null, chunk);
    },
  });

  try {
    await pipeline(Readable.fromWeb(request.body as any), limiter, createWriteStream(destPath));
  } catch {
    unlink(destPath, () => {});
    return Response.json({ error: "size_limit_exceeded" }, { status: 400 });
  }

  return Response.json({ ok: true, storageKey: key });
}
