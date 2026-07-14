import { prisma } from "../db.server";
import { getApprovedReviewsForCohort } from "../reviews.server";
import { getAiProvider } from "./index";

const MIN_REVIEWS_TO_GENERATE = 3;
const REFRESH_MIN_NEW_REVIEWS = 5;
const REFRESH_GROWTH_RATIO = 0.2;

export type SummaryScope = "overall" | "cohort" | `marketplace:${string}`;

export type PublicAiSummary = {
  pros: string[];
  cons: string[];
  summaryText: string;
  reviewCount: number;
  scope: string;
  cohortKey: string;
};

// Canonical serialization of active attribute filters, so the same set of
// filters always maps to the same cache row regardless of param order.
export function canonicalCohortKey(filters: Record<string, string>): string {
  const keys = Object.keys(filters).sort();
  return keys.map((k) => `${k}=${filters[k]}`).join("&");
}

export function shouldRefresh(currentCount: number, countAtGeneration: number): boolean {
  const grown = currentCount - countAtGeneration;
  if (grown <= 0) return false;
  return grown >= REFRESH_MIN_NEW_REVIEWS || grown / countAtGeneration >= REFRESH_GROWTH_RATIO;
}

export async function getOrGenerateSummary(
  productId: string,
  scope: SummaryScope,
  filters: Record<string, string> = {},
  force = false
): Promise<PublicAiSummary | null> {
  const cohortKey = scope === "overall" ? "" : canonicalCohortKey(filters);
  const reviews = await getApprovedReviewsForCohort(productId, filters);
  const reviewCount = reviews.length;

  if (reviewCount < MIN_REVIEWS_TO_GENERATE) return null;

  const cached = await prisma.aiSummary.findUnique({
    where: { productId_scope_cohortKey: { productId, scope, cohortKey } },
  });

  if (cached && !force && !shouldRefresh(reviewCount, cached.reviewCountAtGeneration)) {
    return toPublic(cached, scope, cohortKey, reviewCount);
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return null;

  console.log(`[ai] generating summary product=${product.slug} scope=${scope} cohort="${cohortKey}" reviews=${reviewCount}`);

  const provider = getAiProvider();
  const generated = await provider.generateSummary({
    productName: product.name,
    productCategory: product.category,
    reviews: reviews.map((r) => ({ rating: r.rating, title: r.title, body: r.body })),
  });

  const saved = await prisma.aiSummary.upsert({
    where: { productId_scope_cohortKey: { productId, scope, cohortKey } },
    create: {
      productId,
      scope,
      cohortKey,
      pros: JSON.stringify(generated.pros),
      cons: JSON.stringify(generated.cons),
      summaryText: generated.summaryText,
      reviewCountAtGeneration: reviewCount,
    },
    update: {
      pros: JSON.stringify(generated.pros),
      cons: JSON.stringify(generated.cons),
      summaryText: generated.summaryText,
      reviewCountAtGeneration: reviewCount,
    },
  });

  return toPublic(saved, scope, cohortKey, reviewCount);
}

function toPublic(
  row: { pros: string; cons: string; summaryText: string },
  scope: string,
  cohortKey: string,
  reviewCount: number
): PublicAiSummary {
  return {
    pros: safeParseArray(row.pros),
    cons: safeParseArray(row.cons),
    summaryText: row.summaryText,
    reviewCount,
    scope,
    cohortKey,
  };
}

function safeParseArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
