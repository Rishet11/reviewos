import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { requireProxy } from "../lib/proxy-verify.server";
import { createReview, listReviews } from "../services/reviews.server";
import { resolveProductForShop } from "../services/products.server";

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

  const product = await resolveProductForShop(shop, body.productSlug);

  const review = await createReview(shop, {
    productId: product.id,
    customerName,
    customerEmail: body.customerEmail,
    rating: body.rating,
    title: body.title,
    body: reviewBody,
    attributes: body.attributes ? JSON.stringify(body.attributes) : "{}",
    source: body.source ?? "website",
  });

  return Response.json(
    { review },
    { status: 201, headers: { "Content-Type": "application/json" } }
  );
}
