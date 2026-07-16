import type { ActionFunctionArgs } from "react-router";
import { requireProxy } from "../lib/proxy-verify.server";
import { validateMediaUpload, recordPendingReviewMedia } from "../services/media.server";
import { presignReviewMediaUpload } from "../lib/r2.server";

export async function action({ request }: ActionFunctionArgs) {
  const { shop } = requireProxy(request);

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

  const { uploadUrl, publicUrl, storageKey, expiresIn } = await presignReviewMediaUpload({
    shop,
    filename,
    contentType,
    sizeBytes,
  });

  await recordPendingReviewMedia(shop, {
    storageKey,
    url: publicUrl,
    mimeType: contentType,
    sizeBytes,
  });

  return Response.json(
    {
      uploadUrl,
      method: "PUT",
      headers: { "Content-Type": contentType },
      publicUrl,
      storageKey,
      type: validation.type,
      expiresIn,
    },
    { headers: { "Content-Type": "application/json" } }
  );
}
