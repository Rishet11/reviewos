import type { LoaderFunctionArgs } from "react-router";
import { verifyUnsubscribe } from "../lib/unsubscribe-token.server";
import { prisma } from "../services/db.server";

// Phase 6 Slice C: clicked-email-link unsubscribe. GET (not POST) because
// it's reached by a plain link click from an email client, not a form/fetch.
// ?shop=...&email=...&sig=... - sig is an HMAC over shop:email
// (unsubscribe-token.server.ts), verified before writing anything.
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const email = url.searchParams.get("email");
  const sig = url.searchParams.get("sig");

  if (!shop || !email || !sig || !verifyUnsubscribe(shop, email, sig)) {
    return new Response("Invalid or expired unsubscribe link.", { status: 400 });
  }

  await prisma.emailSuppression.upsert({
    where: { shop_email: { shop, email } },
    update: {},
    create: { shop, email, reason: "unsubscribe" },
  });

  return new Response(
    `<!doctype html><html><body style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:480px;margin:60px auto;text-align:center;">
      <h2>You're unsubscribed</h2>
      <p>You won't receive review request emails from this store again.</p>
    </body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
}
