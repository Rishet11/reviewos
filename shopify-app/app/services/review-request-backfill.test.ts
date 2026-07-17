import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  product: { findMany: vi.fn() },
  emailSuppression: { findUnique: vi.fn() },
  review: { findFirst: vi.fn() },
  reviewRequest: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
  },
  settings: { findUnique: vi.fn() },
};

vi.mock("./db.server", () => ({ prisma: mockPrisma }));

const {
  fetchCandidateOrders,
  reduceToLatestPairs,
  staggeredSendAt,
  previewBackfill,
  runBackfill,
  BACKFILL_COHORT,
  FREE_MONTHLY_CAP,
} = await import("./review-request-backfill.server");

function makeOrderNode(overrides: Record<string, unknown> = {}) {
  return {
    id: "gid://shopify/Order/1",
    createdAt: "2026-07-01T00:00:00Z",
    cancelledAt: null,
    displayFinancialStatus: "PAID",
    email: "buyer@example.com",
    lineItems: { nodes: [{ product: { id: "gid://shopify/Product/1" } }] },
    ...overrides,
  };
}

function mockAdmin(pages: unknown[][]) {
  let call = 0;
  return {
    graphql: vi.fn(async () => {
      const nodes = pages[call] ?? [];
      const hasNextPage = call < pages.length - 1;
      call += 1;
      return {
        json: async () => ({
          data: {
            orders: {
              nodes,
              pageInfo: { hasNextPage, endCursor: hasNextPage ? `cursor_${call}` : null },
            },
          },
        }),
      };
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.emailSuppression.findUnique.mockResolvedValue(null);
  mockPrisma.review.findFirst.mockResolvedValue(null);
  mockPrisma.reviewRequest.findUnique.mockResolvedValue(null);
  mockPrisma.reviewRequest.count.mockResolvedValue(0);
  mockPrisma.reviewRequest.upsert.mockResolvedValue({ id: "rr_new" });
  mockPrisma.product.findMany.mockResolvedValue([
    { id: "prod_1", shopifyProductId: "gid://shopify/Product/1" },
    { id: "prod_2", shopifyProductId: "gid://shopify/Product/2" },
  ]);
});

describe("fetchCandidateOrders", () => {
  it("stops paginating when hasNextPage is true but endCursor is null (inconsistent API state)", async () => {
    const brokenAdmin = {
      graphql: vi.fn(async () => ({
        json: async () => ({
          data: {
            orders: {
              nodes: [makeOrderNode({})],
              pageInfo: { hasNextPage: true, endCursor: null },
            },
          },
        }),
      })),
    };
    const result = await fetchCandidateOrders(brokenAdmin as any, 30);
    expect(brokenAdmin.graphql).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });

  it("skips cancelled orders", async () => {
    const admin = mockAdmin([[makeOrderNode({ cancelledAt: "2026-07-02T00:00:00Z" })]]);
    const result = await fetchCandidateOrders(admin as any, 30);
    expect(result).toEqual([]);
  });

  it("skips fully refunded orders", async () => {
    const admin = mockAdmin([[makeOrderNode({ displayFinancialStatus: "REFUNDED" })]]);
    const result = await fetchCandidateOrders(admin as any, 30);
    expect(result).toEqual([]);
  });

  it("keeps partially refunded orders", async () => {
    const admin = mockAdmin([[makeOrderNode({ displayFinancialStatus: "PARTIALLY_REFUNDED" })]]);
    const result = await fetchCandidateOrders(admin as any, 30);
    expect(result).toHaveLength(1);
  });

  it("caps total orders scanned at 1000", async () => {
    const page = Array.from({ length: 600 }, (_, i) =>
      makeOrderNode({ id: `gid://shopify/Order/${i}` }),
    );
    const admin = mockAdmin([page, page]);
    const result = await fetchCandidateOrders(admin as any, 30);
    expect(result.length).toBeLessThanOrEqual(1000);
    expect(admin.graphql).toHaveBeenCalledTimes(2);
  });
});

describe("reduceToLatestPairs", () => {
  it("keeps only the latest order per (email, productId) pair", () => {
    const orders = [
      {
        shopifyOrderId: "order_old",
        email: "buyer@example.com",
        createdAt: new Date("2026-06-01T00:00:00Z"),
        shopifyProductIds: ["gid://shopify/Product/1"],
      },
      {
        shopifyOrderId: "order_new",
        email: "buyer@example.com",
        createdAt: new Date("2026-07-01T00:00:00Z"),
        shopifyProductIds: ["gid://shopify/Product/1"],
      },
    ];
    const result = reduceToLatestPairs(orders);
    expect(result).toEqual([
      {
        shopifyOrderId: "order_new",
        createdAt: new Date("2026-07-01T00:00:00Z"),
        email: "buyer@example.com",
        shopifyProductId: "gid://shopify/Product/1",
      },
    ]);
  });

  it("treats different products as separate pairs", () => {
    const orders = [
      {
        shopifyOrderId: "order_1",
        email: "buyer@example.com",
        createdAt: new Date("2026-07-01T00:00:00Z"),
        shopifyProductIds: ["gid://shopify/Product/1", "gid://shopify/Product/2"],
      },
    ];
    expect(reduceToLatestPairs(orders)).toHaveLength(2);
  });
});

describe("staggeredSendAt", () => {
  const now = new Date("2026-07-17T00:00:00Z");

  it("puts the first 50 in bucket 0 (now)", () => {
    expect(staggeredSendAt(0, now)).toEqual(now);
    expect(staggeredSendAt(49, now)).toEqual(now);
  });

  it("puts index 50 into bucket 1 (+15 min)", () => {
    expect(staggeredSendAt(50, now)).toEqual(new Date(now.getTime() + 15 * 60_000));
  });

  it("puts index 100 into bucket 2 (+30 min)", () => {
    expect(staggeredSendAt(100, now)).toEqual(new Date(now.getTime() + 30 * 60_000));
  });
});

describe("previewBackfill / runBackfill exclusions", () => {
  const singleOrderAdmin = () => mockAdmin([[makeOrderNode()]]);

  it("excludes a suppressed email and never creates a row for it (shared-core reuse)", async () => {
    mockPrisma.emailSuppression.findUnique.mockResolvedValue({ id: "sup_1" });

    const preview = await previewBackfill("shop1.myshopify.com", singleOrderAdmin() as any, 30, "pro");
    expect(preview.eligible).toBe(0);
    expect(preview.excluded.suppressed).toBe(1);

    const run = await runBackfill("shop1.myshopify.com", singleOrderAdmin() as any, 30, "pro");
    expect(run.created).toBe(0);
    expect(mockPrisma.reviewRequest.upsert).not.toHaveBeenCalled();
  });

  it("excludes a customer who already left an approved/pending review for that product", async () => {
    mockPrisma.review.findFirst.mockResolvedValue({ id: "rev_1" });

    const preview = await previewBackfill("shop1.myshopify.com", singleOrderAdmin() as any, 30, "pro");
    expect(preview.eligible).toBe(0);
    expect(preview.excluded.alreadyReviewed).toBe(1);
  });

  it("excludes a pair that already hit MAX_SENT_COUNT touches", async () => {
    mockPrisma.reviewRequest.findUnique.mockResolvedValue({ sentCount: 3, status: "pending" });

    const preview = await previewBackfill("shop1.myshopify.com", singleOrderAdmin() as any, 30, "pro");
    expect(preview.eligible).toBe(0);
    expect(preview.excluded.maxTouches).toBe(1);
  });

  it("excludes a pair whose existing request is already converted", async () => {
    mockPrisma.reviewRequest.findUnique.mockResolvedValue({ sentCount: 0, status: "converted" });

    const preview = await previewBackfill("shop1.myshopify.com", singleOrderAdmin() as any, 30, "pro");
    expect(preview.excluded.maxTouches).toBe(1);
  });

  it("truncates to the free-plan monthly cap and reports overCap / truncated", async () => {
    const page = [
      makeOrderNode({ id: "order_a", email: "a@example.com", lineItems: { nodes: [{ product: { id: "gid://shopify/Product/1" } }] } }),
      makeOrderNode({ id: "order_b", email: "b@example.com", lineItems: { nodes: [{ product: { id: "gid://shopify/Product/2" } }] } }),
    ];
    mockPrisma.reviewRequest.count.mockResolvedValue(FREE_MONTHLY_CAP - 1);

    const preview = await previewBackfill("shop1.myshopify.com", mockAdmin([page]) as any, 30, "free");
    expect(preview.capRemaining).toBe(1);
    expect(preview.eligible).toBe(1);
    expect(preview.excluded.overCap).toBe(1);

    const run = await runBackfill("shop1.myshopify.com", mockAdmin([page]) as any, 30, "free");
    expect(run.created).toBe(1);
    expect(run.truncated).toBe(1);
  });

  it("is uncapped on the pro plan", async () => {
    const page = [
      makeOrderNode({ id: "order_a", email: "a@example.com", lineItems: { nodes: [{ product: { id: "gid://shopify/Product/1" } }] } }),
      makeOrderNode({ id: "order_b", email: "b@example.com", lineItems: { nodes: [{ product: { id: "gid://shopify/Product/2" } }] } }),
    ];
    const preview = await previewBackfill("shop1.myshopify.com", mockAdmin([page]) as any, 30, "pro");
    expect(preview.eligible).toBe(2);
    expect(preview.excluded.overCap).toBe(0);
    expect(preview.capRemaining).toBe(Infinity);
  });

  it("tags created rows with the backfill cohort marker and staggers scheduledSendAt", async () => {
    const run = await runBackfill("shop1.myshopify.com", singleOrderAdmin() as any, 30, "pro");
    expect(run.created).toBe(1);
    expect(mockPrisma.reviewRequest.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ cohort: BACKFILL_COHORT }),
      }),
    );
  });
});
