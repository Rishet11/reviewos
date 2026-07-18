// Phase 6 Slice 2: merchant-triggered "request reviews from past buyers" blast.
// Scans Shopify orders (read_orders scope only covers the last 60 days) for
// fulfilled, non-cancelled, non-fully-refunded orders, reduces to one
// (customerEmail, productId) candidate per pair (latest order wins), applies
// the same exclusions the webhook path would hit, then reuses
// upsertReviewRequestRow (review-requests.server.ts) to write rows - so a
// blast-created row behaves identically to a webhook-created one once it
// reaches the dispatch queue. Rows created by this module are tagged with
// cohort "backfill" (the smallest coherent marker: cohort already carries an
// enum-like meaning and dispatch/admin code doesn't branch on it, so adding a
// third value is cheaper than adding a new column or overloading `channel`,
// which is reserved for the send transport).
import { prisma } from "./db.server";
import { upsertReviewRequestRow } from "./review-requests.server";
import { MAX_SENT_COUNT } from "./review-requests-dispatch.server";

type PrismaClientLike = typeof prisma;

type AdminClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

export const BACKFILL_COHORT = "backfill";
export const MAX_SINCE_DAYS = 60;
export const MAX_ORDERS_SCANNED = 1000;
import { FREE_MONTHLY_CAP } from "./billing-limits";
// Re-exported for existing importers; canonical definition lives in billing-limits.
export { FREE_MONTHLY_CAP };
const STAGGER_BUCKET_SIZE = 50;
const STAGGER_BUCKET_MS = 15 * 60_000;
const ORDERS_PAGE_SIZE = 50;

const ORDERS_QUERY = `#graphql
  query BackfillOrders($cursor: String, $query: String!) {
    orders(first: ${ORDERS_PAGE_SIZE}, after: $cursor, query: $query, sortKey: CREATED_AT) {
      nodes {
        id
        createdAt
        cancelledAt
        displayFinancialStatus
        email
        lineItems(first: 50) {
          nodes {
            product { id }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

type OrderNode = {
  id: string;
  createdAt: string;
  cancelledAt: string | null;
  displayFinancialStatus: string | null;
  email: string | null;
  lineItems: { nodes: { product: { id: string } | null }[] };
};

type CandidateOrder = {
  shopifyOrderId: string;
  email: string;
  createdAt: Date;
  shopifyProductIds: string[];
};

export type BackfillExclusions = {
  suppressed: number;
  alreadyReviewed: number;
  maxTouches: number;
  overCap: number;
};

export type BackfillSelection = {
  eligible: { shopifyOrderId: string; createdAt: Date; email: string; productId: string }[];
  excluded: BackfillExclusions;
  capRemaining: number;
};

export async function fetchCandidateOrders(
  admin: AdminClient,
  sinceDays: number,
): Promise<CandidateOrder[]> {
  const clampedDays = Math.min(Math.max(sinceDays, 1), MAX_SINCE_DAYS);
  const since = new Date(Date.now() - clampedDays * 86_400_000);
  const query = `fulfillment_status:fulfilled created_at:>=${since.toISOString()}`;

  const orders: CandidateOrder[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  let scanned = 0;

  while (hasNextPage && scanned < MAX_ORDERS_SCANNED) {
    const response = await admin.graphql(ORDERS_QUERY, { variables: { cursor, query } });
    const json = await response.json();
    const page = json.data.orders;

    for (const node of page.nodes as OrderNode[]) {
      scanned += 1;
      if (scanned > MAX_ORDERS_SCANNED) break;
      if (node.cancelledAt) continue; // skip cancelled
      if (node.displayFinancialStatus === "REFUNDED") continue; // skip fully refunded
      if (!node.email) continue;

      const shopifyProductIds = node.lineItems.nodes
        .map((li) => li.product?.id)
        .filter((id): id is string => !!id);
      if (shopifyProductIds.length === 0) continue;

      orders.push({
        shopifyOrderId: node.id,
        email: node.email,
        createdAt: new Date(node.createdAt),
        shopifyProductIds,
      });
    }

    hasNextPage = page.pageInfo.hasNextPage;
    cursor = page.pageInfo.endCursor;
    if (hasNextPage && !cursor) break; // defensive: inconsistent pageInfo from the API, treat as end of data
  }

  return orders;
}

// Reduce (order x product) to one candidate per (email, productId) pair,
// keeping whichever order is most recent.
export function reduceToLatestPairs(
  orders: CandidateOrder[],
): { shopifyOrderId: string; createdAt: Date; email: string; shopifyProductId: string }[] {
  const latest = new Map<
    string,
    { shopifyOrderId: string; createdAt: Date; email: string; shopifyProductId: string }
  >();

  for (const order of orders) {
    for (const shopifyProductId of order.shopifyProductIds) {
      const key = `${order.email}::${shopifyProductId}`;
      const existing = latest.get(key);
      if (!existing || order.createdAt > existing.createdAt) {
        latest.set(key, {
          shopifyOrderId: order.shopifyOrderId,
          createdAt: order.createdAt,
          email: order.email,
          shopifyProductId,
        });
      }
    }
  }

  return [...latest.values()];
}

export function staggeredSendAt(index: number, now = new Date()): Date {
  const bucket = Math.floor(index / STAGGER_BUCKET_SIZE);
  return new Date(now.getTime() + bucket * STAGGER_BUCKET_MS);
}

export async function countBlastRowsThisMonth(
  shop: string,
  client: PrismaClientLike = prisma,
  now = new Date(),
): Promise<number> {
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return client.reviewRequest.count({
    where: { shop, cohort: BACKFILL_COHORT, createdAt: { gte: startOfMonth } },
  });
}

// Shared selection pipeline: candidate orders -> latest-per-pair -> local
// product resolution -> exclusions -> (capped) eligible list. Both
// previewBackfill and runBackfill call this so the numbers a merchant sees in
// preview match what actually gets created.
async function selectCandidates(
  shop: string,
  admin: AdminClient,
  sinceDays: number,
  plan: "free" | "pro",
  client: PrismaClientLike = prisma,
  explicitCapRemaining?: number,
): Promise<BackfillSelection> {
  const orders = await fetchCandidateOrders(admin, sinceDays);
  const pairs = reduceToLatestPairs(orders);

  const localProducts = await client.product.findMany({
    where: { shop, shopifyProductId: { in: pairs.map((p) => p.shopifyProductId) } },
  });
  const productByShopifyId = new Map(
    localProducts.map((p) => [p.shopifyProductId as string, p]),
  );

  const excluded: BackfillExclusions = {
    suppressed: 0,
    alreadyReviewed: 0,
    maxTouches: 0,
    overCap: 0,
  };
  const candidates: { shopifyOrderId: string; createdAt: Date; email: string; productId: string }[] = [];

  for (const pair of pairs) {
    const product = productByShopifyId.get(pair.shopifyProductId);
    if (!product) continue; // not synced locally yet - same as webhook path, not an exclusion class

    const suppressed = await client.emailSuppression.findUnique({
      where: { shop_email: { shop, email: pair.email } },
    });
    if (suppressed) {
      excluded.suppressed += 1;
      continue;
    }

    const reviewed = await client.review.findFirst({
      where: {
        shop,
        productId: product.id,
        customerEmail: pair.email,
        status: { in: ["approved", "pending"] },
      },
    });
    if (reviewed) {
      excluded.alreadyReviewed += 1;
      continue;
    }

    const existingRequest = await client.reviewRequest.findUnique({
      where: {
        shop_shopifyOrderId_productId: {
          shop,
          shopifyOrderId: pair.shopifyOrderId,
          productId: product.id,
        },
      },
    });
    if (
      existingRequest &&
      (existingRequest.sentCount >= MAX_SENT_COUNT ||
        existingRequest.status === "suppressed" ||
        existingRequest.status === "converted")
    ) {
      excluded.maxTouches += 1;
      continue;
    }

    candidates.push({
      shopifyOrderId: pair.shopifyOrderId,
      createdAt: pair.createdAt,
      email: pair.email,
      productId: product.id,
    });
  }

  const capRemaining =
    plan === "free"
      ? (explicitCapRemaining ?? Math.max(0, FREE_MONTHLY_CAP - (await countBlastRowsThisMonth(shop, client))))
      : Infinity;

  let eligible = candidates;
  if (Number.isFinite(capRemaining) && candidates.length > capRemaining) {
    excluded.overCap = candidates.length - capRemaining;
    eligible = candidates.slice(0, capRemaining);
  }

  return { eligible, excluded, capRemaining };
}

export async function previewBackfill(
  shop: string,
  admin: AdminClient,
  sinceDays: number,
  plan: "free" | "pro",
  client: PrismaClientLike = prisma,
): Promise<{ eligible: number; excluded: BackfillExclusions; capRemaining: number }> {
  const { eligible, excluded, capRemaining } = await selectCandidates(shop, admin, sinceDays, plan, client);
  return { eligible: eligible.length, excluded, capRemaining };
}

export async function runBackfill(
  shop: string,
  admin: AdminClient,
  sinceDays: number,
  plan: "free" | "pro",
  client: PrismaClientLike = prisma,
  capRemaining?: number,
): Promise<{ created: number; truncated: number }> {
  const selection = await selectCandidates(shop, admin, sinceDays, plan, client, capRemaining);
  const now = new Date();

  let created = 0;
  for (let i = 0; i < selection.eligible.length; i++) {
    const candidate = selection.eligible[i];
    await upsertReviewRequestRow(
      shop,
      {
        productId: candidate.productId,
        shopifyOrderId: candidate.shopifyOrderId,
        customerEmail: candidate.email,
        cohort: BACKFILL_COHORT,
        deliveredAt: candidate.createdAt,
        scheduledSendAt: staggeredSendAt(i, now),
      },
      client,
    );
    created += 1;
  }

  return { created, truncated: selection.excluded.overCap };
}
