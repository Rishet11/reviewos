// Phase 6 Slice C: dispatch (send-eligible-emails) side of review requests.
// No queue/Redis infra exists yet (deferred to Phase 8) - this module is
// trigger-agnostic on purpose. Production trigger: a Render Cron Job hitting
// app/routes/api.review-requests.dispatch.tsx every ~15 min. Dev trigger:
// manual curl against the same route. When Phase 8's BullMQ+Redis lands,
// only the trigger swaps to a queue processor calling
// dispatchDueReviewRequests() directly - the function itself doesn't change.

import { prisma } from "./db.server";
import { signVerificationToken } from "./order-verification.server";
import { signUnsubscribe } from "../lib/unsubscribe-token.server";
import { buildReviewRequestEmail } from "./email/templates/review-request";
import { sendEmail } from "./email/resend.server";

type PrismaClientLike = typeof prisma;

const MAX_SENT_COUNT = 3;
const MAX_FAILED_ATTEMPTS = 5;
const RESEND_INTERVAL_MS = 7 * 86_400_000;

export async function findDueReviewRequests(
  now = new Date(),
  limit = 100,
  client: PrismaClientLike = prisma,
) {
  return client.reviewRequest.findMany({
    where: { status: "pending", scheduledSendAt: { lte: now }, sentCount: { lt: MAX_SENT_COUNT } },
    take: limit,
    include: { product: true },
  });
}

type DueReviewRequest = Awaited<ReturnType<typeof findDueReviewRequests>>[number];

export async function dispatchReviewRequest(
  rr: DueReviewRequest,
  client: PrismaClientLike = prisma,
  now = new Date(),
) {
  const suppressed = await client.emailSuppression.findUnique({
    where: { shop_email: { shop: rr.shop, email: rr.customerEmail } },
  });
  if (suppressed) {
    await client.reviewRequest.update({ where: { id: rr.id }, data: { status: "suppressed" } });
    return { id: rr.id, result: "suppressed" as const };
  }

  const converted = await client.review.findFirst({
    where: { shop: rr.shop, productId: rr.productId, customerEmail: rr.customerEmail },
  });
  if (converted) {
    await client.reviewRequest.update({
      where: { id: rr.id },
      data: { status: "converted", completedReviewId: converted.id },
    });
    return { id: rr.id, result: "converted" as const };
  }

  if (!rr.product.shopifyProductId) {
    // Shouldn't happen given creation-time filtering (only synced products
    // get a ReviewRequest), but don't crash the batch over one bad row.
    return failAttempt(rr, client, "missing_shopify_product_id", now);
  }

  const appUrl = process.env.SHOPIFY_APP_URL || "";
  const token = signVerificationToken({
    shop: rr.shop,
    shopifyOrderId: rr.shopifyOrderId,
    shopifyProductId: rr.product.shopifyProductId,
    customerEmail: rr.customerEmail,
  });
  const deepLinkUrl = `https://${rr.shop}/products/${rr.product.slug}?vt=${token}`;

  const unsubSig = signUnsubscribe(rr.shop, rr.customerEmail);
  const unsubscribeUrl = `${appUrl}/api/review-requests/unsubscribe?shop=${encodeURIComponent(
    rr.shop,
  )}&email=${encodeURIComponent(rr.customerEmail)}&sig=${unsubSig}`;

  const { subject, html, text } = buildReviewRequestEmail({
    shopName: rr.shop,
    customerName: rr.customerName,
    productTitle: rr.product.name,
    deepLinkUrl,
    unsubscribeUrl,
    cohort: rr.cohort,
  });

  try {
    await sendEmail({ to: rr.customerEmail, subject, html, text, unsubscribeUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_send_error";
    return failAttempt(rr, client, message, now);
  }

  const sentCount = rr.sentCount + 1;
  const exhausted = sentCount >= MAX_SENT_COUNT;
  await client.reviewRequest.update({
    where: { id: rr.id },
    data: {
      sentCount,
      lastSentAt: now,
      status: exhausted ? "exhausted" : "pending",
      ...(exhausted ? {} : { scheduledSendAt: new Date(now.getTime() + RESEND_INTERVAL_MS) }),
    },
  });
  return { id: rr.id, result: exhausted ? ("exhausted" as const) : ("sent" as const) };
}

async function failAttempt(
  rr: DueReviewRequest,
  client: PrismaClientLike,
  message: string,
  now: Date,
) {
  const failedAttempts = rr.failedAttempts + 1;
  const terminal = failedAttempts >= MAX_FAILED_ATTEMPTS;
  await client.reviewRequest.update({
    where: { id: rr.id },
    data: {
      failedAttempts,
      lastError: message,
      // Leave scheduledSendAt alone unless terminal - the next ~15-min tick
      // retries naturally. This doesn't consume a sentCount touch.
      ...(terminal ? { status: "failed" } : {}),
    },
  });
  return terminal
    ? { id: rr.id, result: "failed" as const }
    : { id: rr.id, result: "retry_pending" as const };
}

export async function dispatchDueReviewRequests(client: PrismaClientLike = prisma) {
  const now = new Date();
  const due = await findDueReviewRequests(now, 100, client);
  const results = [];
  for (const rr of due) {
    results.push(await dispatchReviewRequest(rr, client, now));
  }
  return { processed: results.length, results };
}
