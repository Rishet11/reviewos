// Phase 6 Slice C: thin Resend wrapper. Env: RESEND_API_KEY, RESEND_FROM_EMAIL
// (see .env.example). Bounce/complaint webhook handling is out of scope for
// this slice - EmailSuppression already has room for a future reason:"bounce"
// row with no migration needed.

import { Resend } from "resend";

let client: Resend | undefined;

function getClient(): Resend {
  if (client) return client;
  client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
}) {
  const result = await getClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL || "ReviewOS <reviews@reviewos.app>",
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
    headers: {
      "List-Unsubscribe": `<${args.unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
  if (result.error) throw new Error(result.error.message ?? "resend_send_failed");
  return result.data;
}
