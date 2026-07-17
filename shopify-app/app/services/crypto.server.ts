// Slice 5: AES-256-GCM helper for at-rest secrets that need to be decrypted
// again later (WhatsApp access token / app secret) - unlike the sha256/
// timingSafeEqual signing helpers elsewhere, these are recoverable, not just
// verifiable. Key comes from SECRETS_KEY (32 raw bytes, hex-encoded = 64 hex
// chars). Output format is `iv:authTag:ciphertext`, all hex.

import crypto from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;

function getKey(): Buffer {
  const hex = process.env.SECRETS_KEY;
  if (!hex) {
    throw new Error("SECRETS_KEY env var is required to encrypt/decrypt secrets");
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("SECRETS_KEY must be a 32-byte value, hex-encoded (64 hex chars)");
  }
  return key;
}

export function encryptSecret(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

// Slice 5: per-shop verify token for the Meta WhatsApp webhook handshake.
// Deterministic (same shop -> same token) so it can be recomputed on the fly
// instead of stored, and shown to the merchant in app.channels.tsx to paste
// into the Meta app dashboard.
export function deriveVerifyToken(shop: string): string {
  return crypto.createHmac("sha256", getKey()).update(shop).digest("hex");
}

export function decryptSecret(blob: string): string {
  const key = getKey();
  const parts = blob.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted secret blob");
  }
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}
