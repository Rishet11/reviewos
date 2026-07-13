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

  const result = await listReviews({
    productSlug,
    filters,
    rating: ratingParam ? Number(ratingParam) : undefined,
    sort: (params.get("sort") as any) ?? "recent",
    page: pageParam ? Number(pageParam) : 1,
    pageSize: pageSizeParam ? Number(pageSizeParam) : 10,
    status: params.get("status") ?? "approved",
  });

  return Response.json(result);
}

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  const body = await request.json();

  const product = await prisma.product.findUnique({
    where: { slug: body.productSlug },
  });

  if (!product) {
    return Response.json({ error: "product_not_found" }, { status: 404 });
  }

  const review = await createReview({
    productId: product.id,
    customerName: body.customerName,
    customerEmail: body.customerEmail,
    rating: body.rating,
    title: body.title,
    body: body.body,
    attributes: body.attributes ? JSON.stringify(body.attributes) : "{}",
    source: body.source ?? "website",
  });

  return Response.json({ review }, { status: 201 });
}
