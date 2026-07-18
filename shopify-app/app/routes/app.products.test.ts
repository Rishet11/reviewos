import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  product: {
    findMany: vi.fn(),
  },
};

vi.mock("../services/db.server", () => ({ prisma: mockPrisma }));

const mockSyncProductsFromCatalog = vi.fn();
vi.mock("../services/products.server", () => ({
  syncProductsFromCatalog: mockSyncProductsFromCatalog,
}));

const mockBackfillAllRatingMetafields = vi.fn();
vi.mock("../services/metafields.server", () => ({
  backfillAllRatingMetafields: mockBackfillAllRatingMetafields,
}));

const mockAdmin = { graphql: vi.fn() };

vi.mock("../shopify.server", () => ({
  authenticate: {
    admin: vi.fn(async () => ({
      session: { shop: "shop1.myshopify.com" },
      admin: mockAdmin,
    })),
  },
}));

vi.mock("@shopify/shopify-app-react-router/server", () => ({
  boundary: { headers: vi.fn() },
}));

const { loader, action } = await import("./app.products");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("app.products loader", () => {
  it("returns products for the authenticated shop", async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      { id: "1", name: "Widget", slug: "widget", category: "gadgets" },
    ]);

    const result = await loader({ request: new Request("https://app.example.com/app/products") } as any);

    expect(result).toEqual({
      products: [{ id: "1", name: "Widget", slug: "widget", category: "gadgets" }],
    });
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
      where: { shop: "shop1.myshopify.com" },
      orderBy: { name: "asc" },
    });
  });

  it("handles an empty catalog without crashing", async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);

    const result = await loader({ request: new Request("https://app.example.com/app/products") } as any);

    expect(result).toEqual({ products: [] });
  });
});

describe("app.products action", () => {
  it("syncs products from the catalog", async () => {
    mockSyncProductsFromCatalog.mockResolvedValue({ created: 2, updated: 1, total: 3 });
    const form = new FormData();
    form.set("intent", "sync-products");
    const request = new Request("https://app.example.com/app/products", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({ ok: true, result: { created: 2, updated: 1, total: 3 } });
    expect(mockSyncProductsFromCatalog).toHaveBeenCalledWith("shop1.myshopify.com", mockAdmin);
  });

  it("backfills rating metafields", async () => {
    mockBackfillAllRatingMetafields.mockResolvedValue({ synced: 5, skipped: 1, failed: 0 });
    const form = new FormData();
    form.set("intent", "backfill-ratings");
    const request = new Request("https://app.example.com/app/products", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({ ok: true, backfillResult: { synced: 5, skipped: 1, failed: 0 } });
    expect(mockBackfillAllRatingMetafields).toHaveBeenCalledWith("shop1.myshopify.com", mockAdmin);
  });

  it("returns an error for an unknown intent", async () => {
    const form = new FormData();
    form.set("intent", "bogus");
    const request = new Request("https://app.example.com/app/products", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Unknown intent: bogus" });
    expect(mockSyncProductsFromCatalog).not.toHaveBeenCalled();
    expect(mockBackfillAllRatingMetafields).not.toHaveBeenCalled();
  });

  it("returns a graceful error when sync-products throws (e.g. throttled Admin API)", async () => {
    mockSyncProductsFromCatalog.mockRejectedValue(new Error("Throttled"));
    const form = new FormData();
    form.set("intent", "sync-products");
    const request = new Request("https://app.example.com/app/products", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Throttled" });
  });

  it("returns a graceful error when backfill-ratings throws", async () => {
    mockBackfillAllRatingMetafields.mockRejectedValue(new Error("Admin API error"));
    const form = new FormData();
    form.set("intent", "backfill-ratings");
    const request = new Request("https://app.example.com/app/products", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Admin API error" });
  });
});
