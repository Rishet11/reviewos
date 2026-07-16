import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { requireProxy } from "../lib/proxy-verify.server";
import { createReview, listReviews } from "../services/reviews.server";
import { resolveProductForShop } from "../services/products.server";
import { matchOrderForReview } from "../services/order-verification.server";
import { prisma } from "../services/db.server";

// Origin + path-prefix check, not a raw string prefix: "startsWith(base)"
// alone would accept "https://pub-xxx.r2.dev.evil.com/x" for a base of
// "https://pub-xxx.r2.dev". Parsing both as URLs and comparing origin
// closes that off.
function isUnderPublicBase(url: string, base: string): boolean {
  try {
    const u = new URL(url);
    const b = new URL(base);
    if (u.origin !== b.origin) return false;
    const basePrefix = b.pathname.endsWith("/") ? b.pathname : `${b.pathname}/`;
    return u.pathname === b.pathname || u.pathname.startsWith(basePrefix);
  } catch {
    return false;
  }
}

const KNOWN_PARAMS = new Set([
  "product",
  "rating",
  "sort",
  "page",
  "pageSize",
  "status",
  "shop",
  "path_prefix",
  "timestamp",
  "signature",
  "logged_in_customer_id",
]);

export async function loader({ request }: LoaderFunctionArgs) {
  const { shop } = requireProxy(request);

  const url = new URL(request.url);
  const params = url.searchParams;

  const productSlug = params.get("product");
  if (!productSlug) {
    return Response.json({ error: "product param required" }, { status: 400 });
  }

  const filters: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (!KNOWN_PARAMS.has(key)) {
      filters[key] = value;
    }
  }

  const ratingParam = params.get("rating");
  const pageParam = params.get("page");
  const pageSizeParam = params.get("pageSize");

  const rating = Number(ratingParam);
  const page = Math.max(1, Math.trunc(Number(pageParam)) || 1);
  const pageSize = Math.min(200, Math.max(1, Math.trunc(Number(pageSizeParam)) || 10));

  const result = await listReviews(shop, {
    productSlug,
    filters,
    rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : undefined,
    sort: (params.get("sort") as any) ?? "recent",
    page,
    pageSize,
    status: params.get("status") ?? "approved",
  });

  return Response.json(result, {
    headers: { "Content-Type": "application/json" },
  });
}

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

  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const reviewBody = typeof body.body === "string" ? body.body.trim() : "";
  if (!customerName || !reviewBody) {
    return Response.json({ error: "name_and_body_required" }, { status: 400 });
  }
  if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
    return Response.json({ error: "rating_must_be_1_to_5" }, { status: 400 });
  }
  if (typeof body.productSlug !== "string" || !body.productSlug) {
    return Response.json({ error: "productSlug_required" }, { status: 400 });
  }

  let media: Array<{ type: string; url: string; storageKey?: string; mimeType?: string; sizeBytes?: number }> | undefined;
  if (body.media !== undefined) {
    if (!Array.isArray(body.media)) {
      return Response.json({ error: "invalid_media" }, { status: 400 });
    }
    const r2Base = process.env.R2_PUBLIC_BASE_URL ?? "";
    for (const item of body.media) {
      if (
        !item ||
        (item.type !== "image" && item.type !== "video") ||
        typeof item.url !== "string" ||
        typeof item.storageKey !== "string" ||
        !item.storageKey ||
        !(r2Base && isUnderPublicBase(item.url, r2Base))
      ) {
        return Response.json({ error: "invalid_media" }, { status: 400 });
      }
    }
    media = body.media;
  }

  const product = await resolveProductForShop(shop, body.productSlug);

  const verificationToken =
    typeof body.verificationToken === "string" ? body.verificationToken : null;
  const orderMatch = await matchOrderForReview(shop, {
    shopifyProductId: product.shopifyProductId,
    customerEmail: typeof body.customerEmail === "string" ? body.customerEmail : null,
    verificationToken,
  });

  let review;
  try {
    review = await createReview(shop, {
      productId: product.id,
      customerName,
      customerEmail: body.customerEmail,
      rating: body.rating,
      title: body.title,
      body: reviewBody,
      attributes: body.attributes ? JSON.stringify(body.attributes) : "{}",
      source: body.source ?? "website",
      media,
      verifiedBuyer: orderMatch.verified,
      verifiedOrderId: orderMatch.orderCaptureId ?? null,
    });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("invalid_media")) {
      return Response.json({ error: "invalid_media" }, { status: 400 });
    }
    throw err;
  }

  // Slice C: a verified submission that matches an outstanding ReviewRequest
  // converts it, so the dispatch job stops emailing this customer about this
  // order/product. Best-effort - never let this block the review response.
  if (orderMatch.verified && orderMatch.orderCaptureId) {
    try {
      const orderCapture = await prisma.orderCapture.findUnique({
        where: { id: orderMatch.orderCaptureId },
      });
      if (orderCapture) {
        await prisma.reviewRequest.updateMany({
          where: { shop, shopifyOrderId: orderCapture.shopifyOrderId, productId: product.id },
          data: { status: "converted", completedReviewId: review.id },
        });
      }
    } catch (err) {
      console.error("review-request conversion update failed", err);
    }
  }

  return Response.json(
    { review },
    { status: 201, headers: { "Content-Type": "application/json" } }
  );
}
