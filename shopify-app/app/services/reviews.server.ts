import { prisma } from "./db.server";
import { REVIEW_STATUSES, type ReviewStatus } from "./review-status";
import { MAX_MEDIA_PER_REVIEW } from "./media.server";

export { REVIEW_STATUSES, type ReviewStatus };

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

export async function listReviews(
  shop: string,
  {
    productSlug,
    filters = {},
    rating,
    sort = "recent",
    page = 1,
    pageSize = 10,
    status = "approved",
  }: ListReviewsArgs
) {
  const product = await prisma.product.findUnique({
    where: { shop_slug: { shop, slug: productSlug } },
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
    where: { shop, productId: product.id, status },
    include: { media: true },
  });

  let filtered = filterReviews(all, filters, rating);

  filtered = sortReviews(filtered, sort);

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  return { reviews: paged, total, page, pageSize };
}

export function filterReviews<T extends { rating: number; attributes: string }>(
  reviews: T[],
  filters: Record<string, string>,
  rating?: number
): T[] {
  return reviews.filter((review) => {
    if (rating && review.rating !== rating) return false;

    const attrs = safeParse(review.attributes) ?? {};
    for (const [key, value] of Object.entries(filters)) {
      if (String(attrs[key]) !== value) return false;
    }
    return true;
  });
}

// Fetches all approved reviews for a product matching the given attribute
// filters, unpaginated. Used by AI summary generation, which needs the full
// cohort rather than a page of it.
export async function getApprovedReviewsForCohort(
  shop: string,
  productId: string,
  filters: Record<string, string>
) {
  const all = await prisma.review.findMany({
    where: { shop, productId, status: "approved" },
  });
  return filterReviews(all, filters);
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

export async function getRatingSummary(shop: string, productSlug: string) {
  const product = await prisma.product.findUnique({
    where: { shop_slug: { shop, slug: productSlug } },
  });

  if (!product) {
    return { average: 0, count: 0, byStar: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  }

  const reviews = await prisma.review.findMany({
    where: { shop, productId: product.id, status: "approved" },
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

export type CreateReviewMediaInput = {
  type: string;
  url: string;
  storageKey?: string;
  mimeType?: string;
  sizeBytes?: number;
};

export type CreateReviewInput = {
  productId: string;
  customerName: string;
  customerEmail?: string;
  rating: number;
  title?: string;
  body: string;
  attributes?: string;
  source?: string;
  status?: string;
  createdAt?: Date;
  media?: CreateReviewMediaInput[];
  verifiedBuyer?: boolean;
  verifiedOrderId?: string | null;
  importBatchId?: string;
  externalRef?: string;
};

export async function createReview(shop: string, data: CreateReviewInput) {
  // Server-side cap regardless of what the client sent - never trust the
  // client's own count.
  const media = (data.media ?? []).slice(0, MAX_MEDIA_PER_REVIEW);

  return prisma.$transaction(async (tx) => {
    // Ownership check: every claimed media item must correspond to a
    // PendingReviewMedia row this shop actually presigned (recorded by
    // proxy.media.presign.tsx). Without this, the URL-prefix check alone
    // only proves a URL points at our R2 bucket, not that this customer
    // uploaded it - anyone could attach an already-public media URL
    // (another shop's, or another review's) to their own review. A
    // storageKey that isn't in PendingReviewMedia has either never been
    // uploaded through this shop's presign flow or was already claimed by
    // another review, so it's rejected either way.
    if (media.length > 0) {
      const storageKeys = media.map((m) => m.storageKey);
      if (storageKeys.some((k) => !k)) {
        throw new Error("invalid_media: missing storage key");
      }
      const pending = await tx.pendingReviewMedia.findMany({
        where: { shop, storageKey: { in: storageKeys as string[] } },
      });
      const foundKeys = new Set(pending.map((p) => p.storageKey));
      if (storageKeys.some((k) => !foundKeys.has(k as string))) {
        throw new Error("invalid_media: unclaimed storage key");
      }
    }

    const review = await tx.review.create({
      data: {
        shop,
        productId: data.productId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        rating: data.rating,
        title: data.title,
        body: data.body,
        attributes: data.attributes ?? "{}",
        source: data.source ?? "website",
        status: data.status ?? "pending",
        verifiedBuyer: data.verifiedBuyer ?? false,
        verifiedOrderId: data.verifiedOrderId ?? null,
        ...(data.createdAt ? { createdAt: data.createdAt } : {}),
        ...(data.importBatchId ? { importBatchId: data.importBatchId } : {}),
        ...(data.externalRef ? { externalRef: data.externalRef } : {}),
      },
    });

    if (media.length > 0) {
      await tx.reviewMedia.createMany({
        data: media.map((m) => ({
          reviewId: review.id,
          type: m.type,
          url: m.url,
          storageKey: m.storageKey ?? "",
          mimeType: m.mimeType ?? "",
          sizeBytes: m.sizeBytes ?? 0,
        })),
      });

      // Un-orphan the storage objects this review just claimed.
      const storageKeys = media.map((m) => m.storageKey).filter((k): k is string => !!k);
      if (storageKeys.length > 0) {
        await tx.pendingReviewMedia.deleteMany({
          where: { shop, storageKey: { in: storageKeys } },
        });
      }
    }

    return tx.review.findUniqueOrThrow({
      where: { id: review.id },
      include: { media: true },
    });
  });
}

export async function voteHelpful(shop: string, reviewId: string) {
  const { count } = await prisma.review.updateMany({
    where: { id: reviewId, shop },
    data: { helpfulCount: { increment: 1 } },
  });
  if (count === 0) return null;
  return prisma.review.findFirst({ where: { id: reviewId, shop } });
}

// ---- Admin moderation (merchant-facing, framework-free) ----
// REVIEW_STATUSES / ReviewStatus live in ./review-status (client-safe) and are
// re-exported at the top of this file.

export type ListReviewsForAdminArgs = {
  status?: string;
  productId?: string;
  importBatchId?: string;
  page?: number;
  pageSize?: number;
};

// Admin listing: returns reviews of ANY status (unlike the storefront
// listReviews which defaults to approved-only), newest first, with product +
// media joined so the moderation table can render context.
export async function listReviewsForAdmin(
  shop: string,
  { status, productId, importBatchId, page = 1, pageSize = 25 }: ListReviewsForAdminArgs = {}
) {
  const where: { shop: string; status?: string; productId?: string; importBatchId?: string } = {
    shop,
  };
  if (status) where.status = status;
  if (productId) where.productId = productId;
  if (importBatchId) where.importBatchId = importBatchId;

  const [total, reviews] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      include: { media: true, product: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { reviews, total, page, pageSize };
}

export async function moderateReview(shop: string, reviewId: string, status: string) {
  if (!REVIEW_STATUSES.includes(status as ReviewStatus)) {
    throw new Error(`Invalid review status: ${status}`);
  }
  const { count } = await prisma.review.updateMany({
    where: { id: reviewId, shop },
    data: { status },
  });
  if (count === 0) return null;
  return prisma.review.findFirst({ where: { id: reviewId, shop } });
}

export async function replyToReview(shop: string, reviewId: string, reply: string) {
  const trimmed = reply.trim();
  const { count } = await prisma.review.updateMany({
    where: { id: reviewId, shop },
    data: {
      merchantReply: trimmed.length > 0 ? trimmed : null,
      merchantRepliedAt: trimmed.length > 0 ? new Date() : null,
    },
  });
  if (count === 0) return null;
  return prisma.review.findFirst({ where: { id: reviewId, shop } });
}
