import { describe, it, expect, vi } from "vitest";

const mockPrisma = {
  marketplaceSource: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    findFirst: vi.fn(),
    deleteMany: vi.fn(),
  },
  marketplaceStat: {
    upsert: vi.fn(),
    deleteMany: vi.fn(),
    findMany: vi.fn(),
  },
  product: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock("./db.server", () => ({ prisma: mockPrisma }));

const { listSources, upsertSource, deleteSource, upsertStat, deleteStat, getMarketplaceStats } =
  await import("./marketplace.server");

describe("listSources", () => {
  it("scopes by shop", async () => {
    mockPrisma.marketplaceSource.findMany.mockResolvedValue([]);
    await listSources("shop1.myshopify.com");
    expect(mockPrisma.marketplaceSource.findMany).toHaveBeenCalledWith({
      where: { shop: "shop1.myshopify.com" },
      orderBy: { name: "asc" },
    });
  });
});

describe("upsertSource", () => {
  it("upserts on [shop, name] and includes shop in create", async () => {
    mockPrisma.marketplaceSource.upsert.mockResolvedValue({ id: "src_1" });
    await upsertSource("shop1.myshopify.com", {
      name: "Amazon",
      logoUrl: "",
      baseUrl: "https://amazon.com",
    });
    expect(mockPrisma.marketplaceSource.upsert).toHaveBeenCalledWith({
      where: { shop_name: { shop: "shop1.myshopify.com", name: "Amazon" } },
      update: { logoUrl: "", baseUrl: "https://amazon.com" },
      create: {
        shop: "shop1.myshopify.com",
        name: "Amazon",
        logoUrl: "",
        baseUrl: "https://amazon.com",
      },
    });
  });
});

describe("deleteSource", () => {
  it("uses deleteMany scoped by id AND shop (not delete by id alone)", async () => {
    mockPrisma.marketplaceSource.deleteMany.mockResolvedValue({ count: 1 });
    await deleteSource("shop1.myshopify.com", "src_1");
    expect(mockPrisma.marketplaceSource.deleteMany).toHaveBeenCalledWith({
      where: { id: "src_1", shop: "shop1.myshopify.com" },
    });
  });
});

describe("deleteStat", () => {
  it("uses deleteMany scoped by id AND shop (not delete by id alone)", async () => {
    mockPrisma.marketplaceStat.deleteMany.mockResolvedValue({ count: 1 });
    await deleteStat("shop1.myshopify.com", "stat_1");
    expect(mockPrisma.marketplaceStat.deleteMany).toHaveBeenCalledWith({
      where: { id: "stat_1", shop: "shop1.myshopify.com" },
    });
  });
});

describe("upsertStat", () => {
  it("rejects when the sourceId belongs to another shop (findFirst scoped by shop returns null)", async () => {
    mockPrisma.marketplaceSource.findFirst.mockResolvedValue(null);

    await expect(
      upsertStat("shop1.myshopify.com", {
        productSlug: "some-product",
        sourceId: "src_from_other_shop",
        rating: 4.5,
        reviewCount: 100,
        url: "https://amazon.com/dp/x",
      })
    ).rejects.toThrow();

    expect(mockPrisma.marketplaceSource.findFirst).toHaveBeenCalledWith({
      where: { id: "src_from_other_shop", shop: "shop1.myshopify.com" },
    });
    expect(mockPrisma.marketplaceStat.upsert).not.toHaveBeenCalled();
  });

  it("upserts on [shop, productId, sourceId] once the source is verified shop-scoped", async () => {
    mockPrisma.marketplaceSource.findFirst.mockResolvedValue({
      id: "src_1",
      shop: "shop1.myshopify.com",
    });
    mockPrisma.product.findUnique.mockResolvedValue({
      id: "prod_1",
      shop: "shop1.myshopify.com",
      slug: "some-product",
    });
    mockPrisma.marketplaceStat.upsert.mockResolvedValue({ id: "stat_1" });

    await upsertStat("shop1.myshopify.com", {
      productSlug: "some-product",
      sourceId: "src_1",
      rating: 4.6,
      reviewCount: 12431,
      url: "https://amazon.com/dp/x",
    });

    expect(mockPrisma.marketplaceStat.upsert).toHaveBeenCalledWith({
      where: {
        shop_productId_sourceId: {
          shop: "shop1.myshopify.com",
          productId: "prod_1",
          sourceId: "src_1",
        },
      },
      update: {
        rating: 4.6,
        reviewCount: 12431,
        url: "https://amazon.com/dp/x",
        lastCheckedAt: expect.any(Date),
        refreshSource: "manual",
      },
      create: {
        shop: "shop1.myshopify.com",
        productId: "prod_1",
        sourceId: "src_1",
        rating: 4.6,
        reviewCount: 12431,
        url: "https://amazon.com/dp/x",
        lastCheckedAt: expect.any(Date),
        refreshSource: "manual",
      },
    });
  });
});

describe("getMarketplaceStats", () => {
  it("returns an empty array for an unknown product slug in that shop, without querying stats", async () => {
    mockPrisma.product.findUnique.mockResolvedValue(null);

    const result = await getMarketplaceStats("shop1.myshopify.com", "nonexistent-product");

    expect(result).toEqual([]);
    expect(mockPrisma.marketplaceStat.findMany).not.toHaveBeenCalled();
  });

  it("returns shop-scoped stats for a product in the given shop", async () => {
    mockPrisma.product.findUnique.mockResolvedValue({
      id: "prod_1",
      shop: "shop1.myshopify.com",
      slug: "some-product",
    });
    mockPrisma.marketplaceStat.findMany.mockResolvedValue([
      {
        id: "stat_1",
        rating: 4.6,
        reviewCount: 12431,
        url: "https://amazon.com/dp/x",
        source: { name: "Amazon", logoUrl: "", baseUrl: "https://amazon.com" },
      },
    ]);

    const result = await getMarketplaceStats("shop1.myshopify.com", "some-product");

    expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
      where: { shop_slug: { shop: "shop1.myshopify.com", slug: "some-product" } },
    });
    expect(mockPrisma.marketplaceStat.findMany).toHaveBeenCalledWith({
      where: { shop: "shop1.myshopify.com", productId: "prod_1" },
      include: { source: true },
    });
    expect(result).toEqual([
      {
        id: "stat_1",
        rating: 4.6,
        reviewCount: 12431,
        url: "https://amazon.com/dp/x",
        source: { name: "Amazon", logoUrl: "", baseUrl: "https://amazon.com" },
      },
    ]);
  });
});
