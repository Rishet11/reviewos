// Slice 5: WhatsApp channel provider - BYO Meta Cloud API. Each shop brings
// its own WhatsApp Business Account (WhatsAppConnection), so this is a thin
// wrapper around the Meta Graph "send template message" call. Never logs the
// decrypted access token.

import { prisma } from "../db.server";
import { decryptSecret } from "../crypto.server";
import type { ChannelProvider } from "./provider";

type PrismaClientLike = typeof prisma;

const GRAPH_VERSION = "v21.0";

// Canonical vars a template body can reference, in the order the merchant's
// templateVarOrder JSON array names them.
type CanonicalVars = {
  customerName: string;
  productName: string;
  reviewUrl: string;
};

export async function sendWhatsApp(
  args: {
    shop: string;
    to: string;
    customerName: string;
    productName: string;
    reviewUrl: string;
    unsubscribeUrl: string;
  },
  client: PrismaClientLike = prisma,
): Promise<{ ok: boolean; error?: string }> {
  const connection = await client.whatsAppConnection.findUnique({
    where: { shop: args.shop },
  });
  if (!connection || !connection.enabled) {
    return { ok: false, error: "no_enabled_whatsapp_connection" };
  }

  const suppressed = await client.channelSuppression.findUnique({
    where: {
      shop_channel_identifier: { shop: args.shop, channel: "whatsapp", identifier: args.to },
    },
  });
  if (suppressed) {
    return { ok: false, error: "suppressed" };
  }

  const vars: CanonicalVars = {
    customerName: args.customerName,
    productName: args.productName,
    reviewUrl: args.reviewUrl,
  };

  let varOrder: string[];
  try {
    varOrder = JSON.parse(connection.templateVarOrder);
  } catch {
    return { ok: false, error: "invalid_template_var_order" };
  }

  const parameters = varOrder.map((key) => ({
    type: "text",
    text: vars[key as keyof CanonicalVars] ?? "",
  }));

  let response: Response;
  try {
    const accessToken = decryptSecret(connection.accessTokenEnc);
    response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${connection.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: args.to,
          type: "template",
          template: {
            name: connection.templateName,
            language: { code: connection.templateLanguage },
            components: [{ type: "body", parameters }],
          },
        }),
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "whatsapp_fetch_failed";
    return { ok: false, error: message };
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "whatsapp_send_failed");
    return { ok: false, error: errorText };
  }

  return { ok: true };
}

export const whatsappProvider: ChannelProvider = {
  key: "whatsapp",
  send: (args) => sendWhatsApp(args),
};
