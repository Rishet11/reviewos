import { randomUUID } from "node:crypto";
import { validateMediaUpload } from "~/services/media.server";

// Demo-app presign: no real object storage, just a same-origin PUT target
// that api.media.upload.$key.ts writes to local disk. Contract shape
// (uploadUrl/method/headers/publicUrl/storageKey/type/expiresIn) matches the
// shopify-app R2 presign route so the shared widget code works unmodified
// against either backend.
function extractExtension(filename: string): string {
  const match = /\.([a-zA-Z0-9]{1,8})$/.exec(filename);
  return match ? match[1].toLowerCase() : "";
}

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const filename = typeof body.filename === "string" ? body.filename : "";
  const contentType = typeof body.contentType === "string" ? body.contentType : "";
  const sizeBytes = Number(body.sizeBytes);

  if (!filename || !contentType) {
    return Response.json({ error: "filename_and_contentType_required" }, { status: 400 });
  }

  const validation = validateMediaUpload(contentType, sizeBytes);
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const ext = extractExtension(filename);
  const storageKey = `${randomUUID()}${ext ? `.${ext}` : ""}`;

  return Response.json({
    uploadUrl: `/api/media/upload/${storageKey}`,
    method: "PUT",
    headers: { "Content-Type": contentType },
    publicUrl: `/uploads/reviews/${storageKey}`,
    storageKey,
    type: validation.type,
    expiresIn: 300,
  });
}
