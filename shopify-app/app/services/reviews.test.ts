import { describe, expect, it } from "vitest";
import { filterReviews } from "./reviews.server";
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
