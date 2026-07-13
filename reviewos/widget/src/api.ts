import type { AiSummary, AttributeDef, Product, Review, Summary, Sort } from "./types";

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`request failed: ${res.status}`);
  return res.json();
}

export async function fetchProduct(apiBase: string, slug: string) {
  const data = await getJSON<{ product: Product }>(
    `${apiBase}/api/products/${encodeURIComponent(slug)}`
  );
  return data.product;
}

export async function fetchSummary(apiBase: string, slug: string) {
  const data = await getJSON<{ summary: Summary }>(
    `${apiBase}/api/reviews/summary?product=${encodeURIComponent(slug)}`
  );
  return data.summary;
}

export async function fetchAttributes(apiBase: string, category: string) {
  const data = await getJSON<{ attributes: AttributeDef[] }>(
    `${apiBase}/api/attributes?category=${encodeURIComponent(category)}`
  );
  return data.attributes.filter((a) => a.display);
}

export type ListReviewsArgs = {
  productSlug: string;
  rating: number | null;
  attrFilters: Record<string, string>;
  sort: Sort;
  page: number;
  pageSize: number;
};

export async function fetchReviews(apiBase: string, args: ListReviewsArgs) {
  const params = new URLSearchParams();
  params.set("product", args.productSlug);
  params.set("sort", args.sort);
  params.set("page", String(args.page));
  params.set("pageSize", String(args.pageSize));
  if (args.rating) params.set("rating", String(args.rating));
  for (const [key, value] of Object.entries(args.attrFilters)) {
    params.set(key, value);
  }
  const data = await getJSON<{
    reviews: Review[];
    total: number;
    page: number;
    pageSize: number;
  }>(`${apiBase}/api/reviews?${params.toString()}`);
  return data;
}

export async function fetchAiSummary(
  apiBase: string,
  productSlug: string,
  attrFilters: Record<string, string>
) {
  const params = new URLSearchParams();
  params.set("product", productSlug);
  for (const [key, value] of Object.entries(attrFilters)) {
    params.set(key, value);
  }
  const data = await getJSON<{ summary: AiSummary | null }>(
    `${apiBase}/api/ai/summary?${params.toString()}`
  );
  return data.summary;
}

export async function postHelpful(apiBase: string, reviewId: string) {
  const res = await fetch(
    `${apiBase}/api/reviews/${encodeURIComponent(reviewId)}/helpful`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error(`request failed: ${res.status}`);
  return res.json();
}

export type CreateReviewPayload = {
  productSlug: string;
  customerName: string;
  customerEmail?: string;
  rating: number;
  title?: string;
  body: string;
  attributes: Record<string, string>;
};

export async function postReview(apiBase: string, payload: CreateReviewPayload) {
  const res = await fetch(`${apiBase}/api/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `request failed: ${res.status}`);
  }
  return res.json();
}
