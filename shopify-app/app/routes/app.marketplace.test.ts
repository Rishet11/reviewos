import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  marketplaceStat: {
    findMany: vi.fn(),
  },
};

vi.mock("../services/db.server", () => ({ prisma: mockPrisma }));

const mockMarketplace = {
  deleteSource: vi.fn(),
  deleteStat: vi.fn(),
  listSources: vi.fn(),
  upsertSource: vi.fn(),
  upsertStat: vi.fn(),
};

vi.mock("../services/marketplace.server", () => mockMarketplace);

vi.mock("../shopify.server", () => ({
  authenticate: {
    admin: vi.fn(async () => ({
      session: { shop: "shop1.myshopify.com" },
    })),
  },
}));

vi.mock("@shopify/shopify-app-react-router/server", () => ({
  boundary: { headers: vi.fn() },
}));

const { loader, action } = await import("./app.marketplace");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("app.marketplace loader", () => {
  it("returns sources, stats, and a stale count of 0 for fresh stats", async () => {
    mockMarketplace.listSources.mockResolvedValue([{ id: "src1", name: "Amazon" }]);
    mockPrisma.marketplaceStat.findMany.mockResolvedValue([
      { id: "stat1", updatedAt: new Date(), lastCheckedAt: new Date() },
    ]);

    const result = await loader({ request: new Request("https://app.example.com/app/marketplace") } as any);

    expect(result.sources).toEqual([{ id: "src1", name: "Amazon" }]);
    expect(result.staleCount).toBe(0);
    expect(result.staleThresholdDays).toBe(7);
  });

  it("counts a stat older than the stale threshold using lastCheckedAt", async () => {
    const old = new Date(Date.now() - 10 * 86_400_000);
    mockMarketplace.listSources.mockResolvedValue([]);
    mockPrisma.marketplaceStat.findMany.mockResolvedValue([
      { id: "stat1", updatedAt: new Date(), lastCheckedAt: old },
    ]);

    const result = await loader({ request: new Request("https://app.example.com/app/marketplace") } as any);

    expect(result.staleCount).toBe(1);
  });

  it("falls back to updatedAt when lastCheckedAt is null", async () => {
    const old = new Date(Date.now() - 10 * 86_400_000);
    mockMarketplace.listSources.mockResolvedValue([]);
    mockPrisma.marketplaceStat.findMany.mockResolvedValue([
      { id: "stat1", updatedAt: old, lastCheckedAt: null },
    ]);

    const result = await loader({ request: new Request("https://app.example.com/app/marketplace") } as any);

    expect(result.staleCount).toBe(1);
  });

  it("handles no sources and no stats without crashing", async () => {
    mockMarketplace.listSources.mockResolvedValue([]);
    mockPrisma.marketplaceStat.findMany.mockResolvedValue([]);

    const result = await loader({ request: new Request("https://app.example.com/app/marketplace") } as any);

    expect(result).toEqual({
      sources: [],
      stats: [],
      staleCount: 0,
      staleThresholdDays: 7,
    });
  });
});

describe("app.marketplace action - create-source", () => {
  it("creates a source", async () => {
    mockMarketplace.upsertSource.mockResolvedValue({ id: "src1" });
    const form = new FormData();
    form.set("intent", "create-source");
    form.set("name", "Amazon");
    form.set("baseUrl", "https://www.amazon.com");
    const request = new Request("https://app.example.com/app/marketplace", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({ ok: true });
    expect(mockMarketplace.upsertSource).toHaveBeenCalledWith("shop1.myshopify.com", {
      name: "Amazon",
      logoUrl: "",
      baseUrl: "https://www.amazon.com",
    });
  });

  it("returns a validation error when name or baseUrl is missing", async () => {
    const form = new FormData();
    form.set("intent", "create-source");
    form.set("name", "Amazon");
    const request = new Request("https://app.example.com/app/marketplace", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({ ok: false, error: "Name and base URL are required" });
    expect(mockMarketplace.upsertSource).not.toHaveBeenCalled();
  });
});

describe("app.marketplace action - delete-source", () => {
  it("deletes a source", async () => {
    mockMarketplace.deleteSource.mockResolvedValue({ count: 1 });
    const form = new FormData();
    form.set("intent", "delete-source");
    form.set("id", "src1");
    const request = new Request("https://app.example.com/app/marketplace", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({ ok: true });
  });
});

describe("app.marketplace action - upsert-stat", () => {
  it("saves a stat with valid numeric fields", async () => {
    mockMarketplace.upsertStat.mockResolvedValue({ id: "stat1" });
    const form = new FormData();
    form.set("intent", "upsert-stat");
    form.set("productSlug", "widget");
    form.set("sourceId", "src1");
    form.set("rating", "4.6");
    form.set("reviewCount", "12431");
    form.set("url", "https://www.amazon.com/dp/xyz");
    const request = new Request("https://app.example.com/app/marketplace", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({ ok: true });
    expect(mockMarketplace.upsertStat).toHaveBeenCalledWith("shop1.myshopify.com", {
      productSlug: "widget",
      sourceId: "src1",
      rating: 4.6,
      reviewCount: 12431,
      url: "https://www.amazon.com/dp/xyz",
    });
  });

  it("returns a validation error when rating is non-numeric", async () => {
    const form = new FormData();
    form.set("intent", "upsert-stat");
    form.set("productSlug", "widget");
    form.set("sourceId", "src1");
    form.set("rating", "not-a-number");
    form.set("reviewCount", "10");
    form.set("url", "https://www.amazon.com/dp/xyz");
    const request = new Request("https://app.example.com/app/marketplace", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({
      ok: false,
      error: "Product handle, source, rating, review count, and URL are required",
    });
    expect(mockMarketplace.upsertStat).not.toHaveBeenCalled();
  });

  it("returns a graceful error message when the service throws (e.g. unknown source)", async () => {
    mockMarketplace.upsertStat.mockRejectedValue(new Error("Marketplace source src1 not found for shop"));
    const form = new FormData();
    form.set("intent", "upsert-stat");
    form.set("productSlug", "widget");
    form.set("sourceId", "src1");
    form.set("rating", "4.6");
    form.set("reviewCount", "10");
    form.set("url", "https://www.amazon.com/dp/xyz");
    const request = new Request("https://app.example.com/app/marketplace", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({ ok: false, error: "Marketplace source src1 not found for shop" });
  });
});

describe("app.marketplace action - delete-stat", () => {
  it("deletes a stat", async () => {
    mockMarketplace.deleteStat.mockResolvedValue({ count: 1 });
    const form = new FormData();
    form.set("intent", "delete-stat");
    form.set("id", "stat1");
    const request = new Request("https://app.example.com/app/marketplace", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({ ok: true });
  });
});

describe("app.marketplace action - unknown intent", () => {
  it("returns a graceful error", async () => {
    const form = new FormData();
    form.set("intent", "bogus");
    const request = new Request("https://app.example.com/app/marketplace", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({ ok: false, error: "Unknown intent: bogus" });
  });
});
