// API client for the Shopify Theme App Extension embed. Separate from
// ../api.ts (used by the standalone demo) because the App Proxy contract is
// intentionally leaner: no /api prefix, no /products, /ai/summary,
// /marketplace, or /reviews/:id/helpful endpoints (not built yet). See
// shopify-app extension README / PORT notes for the endpoint list this
// targets: GET/POST <base>/reviews, GET <base>/summary, GET <base>/distribution,
// GET <base>/attributes.
import type { AttributeDef, MarketplaceStat, Review, Sort } from "../types";

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`request failed: ${res.status}`);
  return res.json();
}

// AI text summary (proxy.summary.tsx). Mirrors shopify-app's
// PublicAiSummary (app/services/ai/summaries.server.ts) since the widget
// cannot import server code across the app boundary.
export type ShopifyAiSummary = {
  pros: string[];
  cons: string[];
  summaryText: string;
  reviewCount: number;
  scope: string;
  cohortKey: string;
};

// Rating stats + histogram (proxy.distribution.tsx). This is the only
// source for average/count/byStar; /summary is AI text only.
export type ShopifyDistribution = {
  average: number;
  count: number;
  byStar: Record<string, number>;
};

export async function fetchSummary(
  apiBase: string,
  productId: string,
  attrFilters: Record<string, string> = {}
) {
  const params = new URLSearchParams({ product: productId });
  for (const [key, value] of Object.entries(attrFilters)) {
    params.set(key, value);
  }
  const data = await getJSON<{ summary: ShopifyAiSummary | null }>(
    `${apiBase}/summary?${params.toString()}`
  );
  return data.summary;
}

export async function fetchDistribution(apiBase: string, productId: string) {
  const params = new URLSearchParams({ product: productId });
  const data = await getJSON<{ distribution: ShopifyDistribution }>(
    `${apiBase}/distribution?${params.toString()}`
  );
  return data.distribution;
}

export async function fetchAttributes(apiBase: string, productId: string) {
  const params = new URLSearchParams({ product: productId });
  const data = await getJSON<{ attributes: AttributeDef[] }>(
    `${apiBase}/attributes?${params.toString()}`
  );
  return data.attributes.filter((a) => a.display);
}

export async function fetchMarketplaceStats(apiBase: string, productId: string) {
  const params = new URLSearchParams({ product: productId });
  const data = await getJSON<{ stats: MarketplaceStat[] }>(
    `${apiBase}/marketplace?${params.toString()}`
  );
  return data.stats;
}

export type ListReviewsArgs = {
  productId: string;
  rating: number | null;
  attrFilters: Record<string, string>;
  sort: Sort;
  page: number;
  pageSize: number;
};

export async function fetchReviews(apiBase: string, args: ListReviewsArgs) {
  const params = new URLSearchParams();
  params.set("product", args.productId);
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
  }>(`${apiBase}/reviews?${params.toString()}`);
  return data;
}

export type CreateReviewPayload = {
  productId: string;
  customerName: string;
  customerEmail?: string;
  rating: number;
  title?: string;
  body: string;
  attributes: Record<string, string>;
};

export async function postReview(apiBase: string, payload: CreateReviewPayload) {
  const res = await fetch(`${apiBase}/reviews`, {
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
