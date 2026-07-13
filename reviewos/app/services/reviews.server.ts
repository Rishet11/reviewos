import { prisma } from "./db.server";

export type ReviewSort = "recent" | "helpful" | "rating_desc" | "rating_asc";

export type ListReviewsArgs = {
  productSlug: string;
  filters?: Record<string, string>;
  rating?: number;
  sort?: ReviewSort;
  page?: number;
  pageSize?: number;
  status?: string;
};

export async function listReviews({
  productSlug,
  filters = {},
  rating,
  sort = "recent",
  page = 1,
  pageSize = 10,
  status = "approved",
}: ListReviewsArgs) {
  const product = await prisma.product.findUnique({
    where: { slug: productSlug },
  });

  if (!product) {
    return { reviews: [], total: 0, page, pageSize };
  }

  // NOTE: SQLite has no indexed JSON query support usable generically across
  // arbitrary attribute keys, so at demo scale we fetch all reviews matching
  // productId + status from the DB, then filter/sort in JS. This keeps the
  // service category-agnostic (no attribute key names hardcoded here). At
  // production scale this should move to indexed columns, a proper JSON
  // query (Postgres jsonb operators), or a search index.
  const all = await prisma.review.findMany({
    where: { productId: product.id, status },
    include: { media: true },
  });

  let filtered = all.filter((review) => {
    if (rating && review.rating !== rating) return false;

    const attrs = safeParse(review.attributes) ?? {};
    for (const [key, value] of Object.entries(filters)) {
      if (String(attrs[key]) !== value) return false;
    }
    return true;
  });

  filtered = sortReviews(filtered, sort);

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  return { reviews: paged, total, page, pageSize };
}

function sortReviews<T extends { createdAt: Date; helpfulCount: number; rating: number }>(
  reviews: T[],
  sort: ReviewSort
): T[] {
  const copy = [...reviews];
  switch (sort) {
    case "helpful":
      return copy.sort((a, b) => b.helpfulCount - a.helpfulCount);
    case "rating_desc":
      return copy.sort((a, b) => b.rating - a.rating);
    case "rating_asc":
      return copy.sort((a, b) => a.rating - b.rating);
    case "recent":
    default:
      return copy.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

function safeParse(json: string): Record<string, unknown> | null {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function getRatingSummary(productSlug: string) {
  const product = await prisma.product.findUnique({
    where: { slug: productSlug },
  });

  if (!product) {
    return { average: 0, count: 0, byStar: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  }

  const reviews = await prisma.review.findMany({
    where: { productId: product.id, status: "approved" },
    select: { rating: true },
  });

  const byStar: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const r of reviews) {
    byStar[r.rating] = (byStar[r.rating] ?? 0) + 1;
    sum += r.rating;
  }

  const count = reviews.length;
  const average = count > 0 ? sum / count : 0;

  return { average, count, byStar };
}

export type CreateReviewInput = {
  productId: string;
  customerName: string;
  customerEmail?: string;
  rating: number;
  title?: string;
  body: string;
  attributes?: string;
  source?: string;
};

export async function createReview(data: CreateReviewInput) {
  return prisma.review.create({
    data: {
      productId: data.productId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      rating: data.rating,
      title: data.title,
      body: data.body,
      attributes: data.attributes ?? "{}",
      source: data.source ?? "website",
      status: "pending",
    },
  });
}

export async function voteHelpful(reviewId: string) {
  return prisma.review.update({
    where: { id: reviewId },
    data: { helpfulCount: { increment: 1 } },
  });
}
