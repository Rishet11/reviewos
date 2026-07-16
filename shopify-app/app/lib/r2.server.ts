import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

// Cloudflare R2 adapter (S3-compatible API) for review media uploads.
// Env vars (see .env.example): R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
// R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL.

let client: S3Client | undefined;

export function getR2Client(): S3Client {
  if (client) return client;
  client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return client;
}

export type PresignReviewMediaUploadArgs = {
  shop: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export type PresignReviewMediaUploadResult = {
  uploadUrl: string;
  publicUrl: string;
  storageKey: string;
  expiresIn: number;
};

// Extracts a safe file extension from the client-supplied filename. Falls
// back to no extension if the filename has none / isn't a simple suffix -
// the object is still stored fine without one, this is cosmetic.
function extractExtension(filename: string): string {
  const match = /\.([a-zA-Z0-9]{1,8})$/.exec(filename);
  return match ? match[1].toLowerCase() : "";
}

export async function presignReviewMediaUpload({
  shop,
  filename,
  contentType,
  sizeBytes,
}: PresignReviewMediaUploadArgs): Promise<PresignReviewMediaUploadResult> {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = extractExtension(filename);
  const base = randomUUID();
  const storageKey = `reviews/${shop}/${yyyy}/${mm}/${base}${ext ? `.${ext}` : ""}`;

  const expiresIn = 300;
  // ContentLength is included in the signed request, so the PUT must send
  // an identical Content-Length header (browsers do this automatically from
  // the real file/body size) or R2 rejects it as a signature mismatch. This
  // binds the declared size into the signature so a client can't presign
  // for a small size and then stream a much larger file to the same URL.
  const uploadUrl = await getSignedUrl(
    getR2Client(),
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: storageKey,
      ContentType: contentType,
      ContentLength: sizeBytes,
    }),
    { expiresIn }
  );

  const publicUrl = `${process.env.R2_PUBLIC_BASE_URL}/${storageKey}`;

  return { uploadUrl, publicUrl, storageKey, expiresIn };
}

export async function deleteReviewMediaObject(storageKey: string): Promise<void> {
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: storageKey,
    })
  );
}
