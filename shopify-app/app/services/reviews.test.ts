import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./db.server";
import {
  createReview,
  filterReviews,
  listReviews,
  listReviewsForAdmin,
} from "./reviews.server";
import { canonicalCohortKey, shouldRefresh } from "./ai/summaries.server";

// Pure (no-DB) service logic. DB-touching functions are covered by the
// embedded-admin E2E, not here (would need a test database).

describe("canonicalCohortKey", () => {
  it("sorts keys so param order does not change the cache key", () => {
    expect(canonicalCohortKey({ b: "2", a: "1" })).toBe("a=1&b=2");
    expect(canonicalCohortKey({ a: "1", b: "2" })).toBe("a=1&b=2");
  });

  it("returns empty string for no filters", () => {
    expect(canonicalCohortKey({})).toBe("");
  });

  it("is category-agnostic (works for arbitrary keys)", () => {
    expect(canonicalCohortKey({ skinType: "oily", useCase: "gym" })).toBe(
      "skinType=oily&useCase=gym"
    );
  });
});

describe("shouldRefresh", () => {
  it("does not refresh when the cohort has not grown", () => {
    expect(shouldRefresh(10, 10)).toBe(false);
    expect(shouldRefresh(8, 10)).toBe(false);
  });

  it("refreshes after >= 5 new reviews", () => {
    expect(shouldRefresh(15, 10)).toBe(true);
    expect(shouldRefresh(104, 100)).toBe(false); // +4 = 4%, below both thresholds
  });

  it("refreshes on >= 20% growth even below 5 new", () => {
    expect(shouldRefresh(13, 10)).toBe(true); // +3 = 30%
    expect(shouldRefresh(6, 5)).toBe(true); // +1 = 20%
  });
});

describe("filterReviews", () => {
  const mk = (rating: number, attrs: Record<string, unknown>) => ({
    rating,
    attributes: JSON.stringify(attrs),
  });

  it("filters by rating", () => {
    const reviews = [mk(5, {}), mk(3, {}), mk(5, {})];
    expect(filterReviews(reviews, {}, 5)).toHaveLength(2);
  });

  it("filters by arbitrary attribute key/value", () => {
    const reviews = [
      mk(5, { skinType: "oily" }),
      mk(4, { skinType: "dry" }),
      mk(5, { skinType: "oily" }),
    ];
    expect(filterReviews(reviews, { skinType: "oily" })).toHaveLength(2);
  });

  it("combines rating + attribute filters", () => {
    const reviews = [
      mk(5, { fit: "true_to_size" }),
      mk(3, { fit: "true_to_size" }),
      mk(5, { fit: "runs_small" }),
    ];
    expect(filterReviews(reviews, { fit: "true_to_size" }, 5)).toHaveLength(1);
  });

  it("tolerates malformed attribute JSON (treats as no attributes)", () => {
    const reviews = [{ rating: 5, attributes: "not json" }];
    expect(filterReviews(reviews, {})).toHaveLength(1);
    expect(filterReviews(reviews, { skinType: "oily" })).toHaveLength(0);
  });
});

// ---- Cross-shop isolation (hits the real dev DB via DATABASE_URL) ----
// Two shops each get their own product + reviews; listing/moderation for one
// shop must never leak the other shop's rows.
describe("cross-shop isolation", () => {
  const SHOP_A = "shop-a-isolation-test.myshopify.com";
  const SHOP_B = "shop-b-isolation-test.myshopify.com";

  let productA: { id: string };
  let productB: { id: string };

  beforeAll(async () => {
    productA = await prisma.product.create({
      data: {
        shop: SHOP_A,
        slug: "isolation-test-product",
        name: "Isolation Test Product A",
        category: "test",
        description: "test",
        price: 100,
        imageUrl: "https://example.com/a.png",
      },
    });
    productB = await prisma.product.create({
      data: {
        shop: SHOP_B,
        slug: "isolation-test-product",
        name: "Isolation Test Product B",
        category: "test",
        description: "test",
        price: 100,
        imageUrl: "https://example.com/b.png",
      },
    });

    await createReview(SHOP_A, {
      productId: productA.id,
      customerName: "Shop A Customer",
      rating: 5,
      body: "great for shop A",
      status: "approved",
    });
    await createReview(SHOP_B, {
      productId: productB.id,
      customerName: "Shop B Customer",
      rating: 1,
      body: "terrible for shop B",
      status: "approved",
    });
  });

  afterAll(async () => {
    await prisma.review.deleteMany({ where: { shop: { in: [SHOP_A, SHOP_B] } } });
    await prisma.product.deleteMany({ where: { shop: { in: [SHOP_A, SHOP_B] } } });
  });

  it("public listReviews for shop A never returns shop B reviews", async () => {
    const { reviews } = await listReviews(SHOP_A, { productSlug: "isolation-test-product" });
    expect(reviews.length).toBeGreaterThan(0);
    expect(reviews.every((r) => r.customerName === "Shop A Customer")).toBe(true);
  });

  it("admin listReviewsForAdmin for shop A never returns shop B reviews", async () => {
    const { reviews } = await listReviewsForAdmin(SHOP_A);
    expect(reviews.some((r) => r.customerName === "Shop B Customer")).toBe(false);
    expect(reviews.some((r) => r.customerName === "Shop A Customer")).toBe(true);
  });

  it("admin listReviewsForAdmin for shop B never returns shop A reviews", async () => {
    const { reviews } = await listReviewsForAdmin(SHOP_B);
    expect(reviews.some((r) => r.customerName === "Shop A Customer")).toBe(false);
    expect(reviews.some((r) => r.customerName === "Shop B Customer")).toBe(true);
  });
});
