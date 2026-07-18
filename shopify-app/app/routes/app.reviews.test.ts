import { describe, it, expect, vi, beforeEach } from "vitest";

const SHOP = "shop1.myshopify.com";

const mockPrisma = {
  product: {
    findMany: vi.fn(),
  },
};

const mockAuthenticate = {
  admin: vi.fn(),
};

const mockListReviewsForAdmin = vi.fn();
const mockCreateReview = vi.fn();
const mockModerateReview = vi.fn();
const mockReplyToReview = vi.fn();
const mockGetOrGenerateSummary = vi.fn();
const mockSyncRatingMetafields = vi.fn();
const mockBulkModerateBatch = vi.fn();
const mockGetPlan = vi.fn();
const mockPreviewBackfill = vi.fn();
const mockRunBackfill = vi.fn();
const mockCountBlastRowsThisMonth = vi.fn();

vi.mock("../shopify.server", () => ({
  authenticate: mockAuthenticate,
}));

vi.mock("../services/db.server", () => ({ prisma: mockPrisma }));

vi.mock("../services/reviews.server", () => ({
  createReview: mockCreateReview,
  listReviewsForAdmin: mockListReviewsForAdmin,
  moderateReview: mockModerateReview,
  replyToReview: mockReplyToReview,
}));

vi.mock("../services/review-status", () => ({
  REVIEW_STATUSES: ["pending", "approved", "rejected"],
}));

vi.mock("../services/ai/summaries.server", () => ({
  getOrGenerateSummary: mockGetOrGenerateSummary,
}));

vi.mock("../services/metafields.server", () => ({
  syncRatingMetafields: mockSyncRatingMetafields,
}));

vi.mock("../services/review-import.server", () => ({
  bulkModerateBatch: mockBulkModerateBatch,
}));

vi.mock("../services/entitlements.server", () => ({
  getPlan: mockGetPlan,
}));

vi.mock("../services/review-request-backfill.server", () => ({
  previewBackfill: mockPreviewBackfill,
  runBackfill: mockRunBackfill,
  countBlastRowsThisMonth: mockCountBlastRowsThisMonth,
}));

vi.mock("../services/billing-limits", () => ({
  FREE_MONTHLY_CAP: 200,
}));

const { loader, action } = await import("./app.reviews");

const session = { shop: SHOP };
const billing = { check: vi.fn() };
const admin = { graphql: vi.fn() };

function formRequest(fields: Record<string, string>) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return new Request("https://app.example.com/app/reviews", {
    method: "POST",
    body: form,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthenticate.admin.mockResolvedValue({ session, billing, admin });
  mockGetPlan.mockResolvedValue("pro");
  mockListReviewsForAdmin.mockResolvedValue({ reviews: [], total: 0, page: 1, pageSize: 25 });
  mockPrisma.product.findMany.mockResolvedValue([]);
  mockCountBlastRowsThisMonth.mockResolvedValue(0);
});

describe("loader", () => {
  it("returns empty state for a shop with no reviews and no products", async () => {
    const request = new Request("https://app.example.com/app/reviews");

    const result = await loader({ request } as any);

    expect(result.reviews).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.products).toEqual([]);
    expect(result.plan).toBe("pro");
    expect(result.blastCapRemaining).toBeNull();
  });

  it("computes blastCapRemaining only on the free plan", async () => {
    mockGetPlan.mockResolvedValue("free");
    mockCountBlastRowsThisMonth.mockResolvedValue(50);
    const request = new Request("https://app.example.com/app/reviews");

    const result = await loader({ request } as any);

    expect(result.plan).toBe("free");
    expect(result.blastCapRemaining).toBe(150);
  });

  it("passes status/productId/batch query params through to listReviewsForAdmin", async () => {
    const request = new Request(
      "https://app.example.com/app/reviews?status=pending&productId=prod_1&batch=batch_1"
    );

    await loader({ request } as any);

    expect(mockListReviewsForAdmin).toHaveBeenCalledWith(SHOP, {
      status: "pending",
      productId: "prod_1",
      importBatchId: "batch_1",
    });
  });
});

describe("action: moderate", () => {
  it("rejects an invalid status without touching the DB", async () => {
    const request = formRequest({ intent: "moderate", reviewId: "r1", status: "bogus" });

    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Invalid status: bogus" });
    expect(mockModerateReview).not.toHaveBeenCalled();
  });

  it("returns an error when the review does not exist", async () => {
    mockModerateReview.mockResolvedValue(null);
    const request = formRequest({ intent: "moderate", reviewId: "missing", status: "approved" });

    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Review not found" });
  });

  it("moderates and syncs metafields on success", async () => {
    mockModerateReview.mockResolvedValue({ id: "r1", productId: "p1" });
    const request = formRequest({ intent: "moderate", reviewId: "r1", status: "approved" });

    const result = await action({ request } as any);

    expect(result).toEqual({ ok: true });
    expect(mockSyncRatingMetafields).toHaveBeenCalledWith(SHOP, "p1", admin);
  });

  it("does not fail the request when metafield sync throws", async () => {
    mockModerateReview.mockResolvedValue({ id: "r1", productId: "p1" });
    mockSyncRatingMetafields.mockRejectedValue(new Error("shopify api down"));
    const request = formRequest({ intent: "moderate", reviewId: "r1", status: "approved" });

    const result = await action({ request } as any);

    expect(result).toEqual({ ok: true });
  });
});

describe("action: create", () => {
  it("rejects when required fields are missing", async () => {
    const request = formRequest({ intent: "create", productId: "", customerName: "Alice" });

    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Missing required fields" });
    expect(mockCreateReview).not.toHaveBeenCalled();
  });

  it("rejects a zero/invalid rating", async () => {
    const request = formRequest({
      intent: "create",
      productId: "p1",
      customerName: "Alice",
      rating: "0",
      body: "great",
    });

    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Missing required fields" });
  });

  it("creates a review with the given fields", async () => {
    mockCreateReview.mockResolvedValue({ id: "r1" });
    const request = formRequest({
      intent: "create",
      productId: "p1",
      customerName: "Alice",
      rating: "5",
      title: "Great",
      body: "Loved it",
    });

    const result = await action({ request } as any);

    expect(result).toEqual({ ok: true });
    expect(mockCreateReview).toHaveBeenCalledWith(SHOP, {
      productId: "p1",
      customerName: "Alice",
      rating: 5,
      title: "Great",
      body: "Loved it",
      source: "merchant",
      status: "approved",
    });
  });
});

describe("action: reply", () => {
  it("returns an error when the review does not exist", async () => {
    mockReplyToReview.mockResolvedValue(null);
    const request = formRequest({ intent: "reply", reviewId: "missing", reply: "thanks" });

    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Review not found" });
  });

  it("saves a reply", async () => {
    mockReplyToReview.mockResolvedValue({ id: "r1" });
    const request = formRequest({ intent: "reply", reviewId: "r1", reply: "thanks!" });

    const result = await action({ request } as any);

    expect(result).toEqual({ ok: true });
  });
});

describe("action: bulk-moderate", () => {
  it("requires an importBatchId", async () => {
    const request = formRequest({ intent: "bulk-moderate", importBatchId: "", status: "approved" });

    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Missing importBatchId" });
    expect(mockBulkModerateBatch).not.toHaveBeenCalled();
  });

  it("rejects an invalid status", async () => {
    const request = formRequest({ intent: "bulk-moderate", importBatchId: "b1", status: "bogus" });

    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Invalid status: bogus" });
  });

  it("bulk moderates a batch", async () => {
    mockBulkModerateBatch.mockResolvedValue({ count: 3, productIds: ["p1"] });
    const request = formRequest({ intent: "bulk-moderate", importBatchId: "b1", status: "approved" });

    const result = await action({ request } as any);

    expect(result).toEqual({ ok: true, count: 3 });
    expect(mockBulkModerateBatch).toHaveBeenCalledWith(SHOP, "b1", "approved", admin);
  });
});

describe("action: regenerate-summary", () => {
  it("requires a productId", async () => {
    const request = formRequest({ intent: "regenerate-summary", productId: "" });

    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Missing productId" });
    expect(mockGetOrGenerateSummary).not.toHaveBeenCalled();
  });

  it("regenerates the summary for a product", async () => {
    mockGetOrGenerateSummary.mockResolvedValue({ summaryText: "great product" });
    const request = formRequest({ intent: "regenerate-summary", productId: "p1" });

    const result = await action({ request } as any);

    expect(result).toEqual({ ok: true });
    expect(mockGetOrGenerateSummary).toHaveBeenCalledWith(SHOP, "p1", "overall", {}, true);
  });

  it("returns a graceful error instead of throwing when the Groq call rejects", async () => {
    mockGetOrGenerateSummary.mockRejectedValue(new Error("Groq request failed"));
    const request = formRequest({ intent: "regenerate-summary", productId: "p1" });

    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Groq request failed" });
  });
});

describe("action: blast-preview / blast-run", () => {
  it("rejects sinceDays outside 1-60", async () => {
    const tooLow = formRequest({ intent: "blast-preview", sinceDays: "0" });
    const tooHigh = formRequest({ intent: "blast-run", sinceDays: "61" });

    const resultLow = await action({ request: tooLow } as any);
    const resultHigh = await action({ request: tooHigh } as any);

    expect(resultLow).toEqual({ error: "Days must be between 1 and 60" });
    expect(resultHigh).toEqual({ error: "Days must be between 1 and 60" });
    expect(mockPreviewBackfill).not.toHaveBeenCalled();
    expect(mockRunBackfill).not.toHaveBeenCalled();
  });

  it("previews a blast send", async () => {
    mockPreviewBackfill.mockResolvedValue({
      eligible: 10,
      excluded: { suppressed: 1, alreadyReviewed: 2, maxTouches: 0, overCap: 0 },
      capRemaining: 190,
    });
    const request = formRequest({ intent: "blast-preview", sinceDays: "30" });

    const result: any = await action({ request } as any);

    expect(result.ok).toBe(true);
    expect(result.preview.eligible).toBe(10);
    expect(mockPreviewBackfill).toHaveBeenCalledWith(SHOP, admin, 30, "pro");
  });

  it("runs a blast send", async () => {
    mockRunBackfill.mockResolvedValue({ created: 5, truncated: 0 });
    const request = formRequest({ intent: "blast-run", sinceDays: "30" });

    const result: any = await action({ request } as any);

    expect(result.ok).toBe(true);
    expect(result.run).toEqual({ created: 5, truncated: 0 });
  });

  it("defaults sinceDays to 30 when not provided", async () => {
    mockPreviewBackfill.mockResolvedValue({
      eligible: 0,
      excluded: { suppressed: 0, alreadyReviewed: 0, maxTouches: 0, overCap: 0 },
      capRemaining: 200,
    });
    const request = formRequest({ intent: "blast-preview" });

    await action({ request } as any);

    expect(mockPreviewBackfill).toHaveBeenCalledWith(SHOP, admin, 30, "pro");
  });

  it("returns a graceful error instead of throwing when runBackfill rejects (Admin API error)", async () => {
    mockRunBackfill.mockRejectedValue(new Error("Admin API throttled"));
    const request = formRequest({ intent: "blast-run", sinceDays: "30" });

    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Admin API throttled" });
  });
});

describe("action: unknown intent", () => {
  it("returns an error for an unrecognized intent", async () => {
    const request = formRequest({ intent: "made-up" });

    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Unknown intent: made-up" });
  });

  it("returns an error when intent is missing entirely", async () => {
    const request = new Request("https://app.example.com/app/reviews", {
      method: "POST",
      body: new FormData(),
    });

    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Unknown intent: null" });
  });
});
