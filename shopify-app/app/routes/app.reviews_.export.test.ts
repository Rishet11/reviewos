import { describe, it, expect, vi, beforeEach } from "vitest";

const SHOP = "shop1.myshopify.com";

const mockAuthenticate = {
  admin: vi.fn(),
};

const mockExportReviewsCsv = vi.fn();

vi.mock("../shopify.server", () => ({
  authenticate: mockAuthenticate,
}));

vi.mock("../services/review-import.server", () => ({
  exportReviewsCsv: mockExportReviewsCsv,
}));

const { loader } = await import("./app.reviews_.export");

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthenticate.admin.mockResolvedValue({ session: { shop: SHOP } });
});

describe("loader", () => {
  it("streams an empty CSV (header only) for a shop with no reviews", async () => {
    mockExportReviewsCsv.mockResolvedValue("productHandle,customerName,customerEmail,rating,title,body,createdAt,externalRef");
    const request = new Request("https://app.example.com/app/reviews/export");

    const response = await loader({ request } as any);

    expect(mockExportReviewsCsv).toHaveBeenCalledWith(SHOP);
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="reviews-export.csv"'
    );
    const text = await response.text();
    expect(text).toBe("productHandle,customerName,customerEmail,rating,title,body,createdAt,externalRef");
  });

  it("streams CSV content for a shop with reviews", async () => {
    const csv =
      "productHandle,customerName,customerEmail,rating,title,body,createdAt,externalRef\r\n" +
      'widget,Alice,,5,Great,"Loved it, a lot",2026-01-01T00:00:00.000Z,ref1';
    mockExportReviewsCsv.mockResolvedValue(csv);
    const request = new Request("https://app.example.com/app/reviews/export");

    const response = await loader({ request } as any);
    const text = await response.text();

    expect(text).toBe(csv);
    expect(response.status).toBe(200);
  });

  it("propagates a service failure as a rejected loader call rather than a malformed download", async () => {
    mockExportReviewsCsv.mockRejectedValue(new Error("db unavailable"));
    const request = new Request("https://app.example.com/app/reviews/export");

    await expect(loader({ request } as any)).rejects.toThrow("db unavailable");
  });
});
