import { listReviews, createReview } from "~/services/reviews.server";
import { prisma } from "~/services/db.server";

const KNOWN_PARAMS = new Set([
  "product",
  "rating",
  "sort",
  "page",
  "pageSize",
  "status",
]);

export async function loader({ request }: { request: Request }) {
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

  const result = await listReviews({
    productSlug,
    filters,
    rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : undefined,
    sort: (params.get("sort") as any) ?? "recent",
    page,
    pageSize,
    status: params.get("status") ?? "approved",
  });

  return Response.json(result);
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

  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const reviewBody = typeof body.body === "string" ? body.body.trim() : "";
  if (!customerName || !reviewBody) {
    return Response.json({ error: "name_and_body_required" }, { status: 400 });
  }
  if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
    return Response.json({ error: "rating_must_be_1_to_5" }, { status: 400 });
  }

  let media: Array<{ type: string; url: string; storageKey?: string; mimeType?: string; sizeBytes?: number }> | undefined;
  if (body.media !== undefined) {
    if (!Array.isArray(body.media)) {
      return Response.json({ error: "invalid_media" }, { status: 400 });
    }
    for (const item of body.media) {
      if (
        !item ||
        (item.type !== "image" && item.type !== "video") ||
        typeof item.url !== "string" ||
        !item.url.startsWith("/uploads/")
      ) {
        return Response.json({ error: "invalid_media" }, { status: 400 });
      }
    }
    media = body.media;
  }

  const product = await prisma.product.findUnique({
    where: { slug: body.productSlug },
  });

  if (!product) {
    return Response.json({ error: "product_not_found" }, { status: 404 });
  }

  const review = await createReview({
    productId: product.id,
    customerName,
    customerEmail: body.customerEmail,
    rating: body.rating,
    title: body.title,
    body: reviewBody,
    attributes: body.attributes ? JSON.stringify(body.attributes) : "{}",
    source: body.source ?? "website",
    media,
  });

  return Response.json({ review }, { status: 201 });
}
