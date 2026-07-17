// Slice 5: inbound Meta WhatsApp Cloud API webhook. This is Meta's own
// webhook contract (GET verification handshake, POST message events), not a
// Shopify webhook - authenticate.webhook doesn't apply here.
//
// GET handshake: Meta calls this with hub.mode/hub.verify_token/hub.challenge
// and no shop context at all, so there's no way to look up "the" shop's
// verify token directly. Since verify tokens are deterministic per shop
// (deriveVerifyToken(shop) = HMAC-SHA256(shop, SECRETS_KEY)), the simplest
// correct approach is: load every connected shop's derived token and accept
// the handshake if hub.verify_token matches ANY of them. This is a one-time
// setup call (Meta only re-verifies when the merchant re-saves the webhook
// URL in the Meta dashboard), so the full-table scan is cheap and harmless.
//
// POST events: shop is resolved from the WABA id in the payload
// (entry[].id), and the request is authenticated via Meta's
// X-Hub-Signature-256 header (HMAC-SHA256 of the RAW body using that shop's
// decrypted app secret) - so the raw body must be read before any JSON
// parsing.

import crypto from "node:crypto";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { prisma } from "../services/db.server";
import { deriveVerifyToken, decryptSecret } from "../services/crypto.server";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token || !challenge) {
    return new Response("Bad request", { status: 400 });
  }

  const connections = await prisma.whatsAppConnection.findMany({ select: { shop: true } });
  const matches = connections.some((c) => safeEqual(deriveVerifyToken(c.shop), token));
  if (!matches) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response(challenge, { status: 200 });
}

type WhatsAppInboundPayload = {
  entry?: Array<{
    id?: string; // WABA id
    changes?: Array<{
      value?: {
        messages?: Array<{
          from?: string;
          text?: { body?: string };
        }>;
      };
    }>;
  }>;
};

export async function action({ request }: ActionFunctionArgs) {
  const rawBody = await request.text();

  let payload: WhatsAppInboundPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const wabaId = payload.entry?.[0]?.id;
  if (!wabaId) {
    return new Response("Not found", { status: 404 });
  }

  const connection = await prisma.whatsAppConnection.findFirst({ where: { wabaId } });
  if (!connection) {
    return new Response("Not found", { status: 404 });
  }

  const signatureHeader = request.headers.get("x-hub-signature-256") ?? "";
  const [, providedSig] = signatureHeader.split("=");
  const appSecret = decryptSecret(connection.appSecretEnc);
  const expectedSig = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  if (!providedSig || !safeEqual(expectedSig, providedSig)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const messages = payload.entry?.[0]?.changes?.[0]?.value?.messages ?? [];
  for (const message of messages) {
    const from = message.from;
    const body = message.text?.body?.trim().toLowerCase();
    if (!from || (body !== "stop" && body !== "unsubscribe")) continue;

    await prisma.channelSuppression.upsert({
      where: {
        shop_channel_identifier: { shop: connection.shop, channel: "whatsapp", identifier: from },
      },
      update: {},
      create: {
        shop: connection.shop,
        channel: "whatsapp",
        identifier: from,
        reason: "user_stop",
      },
    });
  }

  return new Response("OK", { status: 200 });
}
