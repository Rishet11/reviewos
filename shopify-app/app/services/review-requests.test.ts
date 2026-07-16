import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  emailSuppression: {
    findUnique: vi.fn(),
  },
  product: {
    findMany: vi.fn(),
  },
  reviewRequest: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  settings: {
    findUnique: vi.fn(),
  },
};

vi.mock("./db.server", () => ({ prisma: mockPrisma }));

const { createReviewRequestsForOrder } = await import("./review-requests.server");

const BASE_INPUT = {
  shopifyOrderId: "gid://shopify/Order/1",
  customerEmail: "buyer@example.com",
  deliveredAt: new Date("2026-07-16T00:00:00Z"),
  lineItems: [
    { shopifyProductId: "gid://shopify/Product/1", title: "Snowboard", quantity: 1 },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.emailSuppression.findUnique.mockResolvedValue(null);
  mockPrisma.reviewRequest.findFirst.mockResolvedValue(null);
  mockPrisma.reviewRequest.findMany.mockResolvedValue([]);
  mockPrisma.settings.findUnique.mockResolvedValue(null);
  mockPrisma.product.findMany.mockResolvedValue([
    { id: "prod_1", shopifyProductId: "gid://shopify/Product/1" },
  ]);
  mockPrisma.reviewRequest.upsert.mockResolvedValue({ id: "rr_1" });
});

describe("createReviewRequestsForOrder", () => {
  it("no-ops when customerEmail is missing", async () => {
    const result = await createReviewRequestsForOrder("shop1.myshopify.com", {
      ...BASE_INPUT,
      customerEmail: "",
    });

    expect(result).toEqual({ created: 0 });
    expect(mockPrisma.emailSuppression.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.reviewRequest.upsert).not.toHaveBeenCalled();
  });

  it("no-ops when the email is suppressed", async () => {
    mockPrisma.emailSuppression.findUnique.mockResolvedValue({ id: "sup_1" });

    const result = await createReviewRequestsForOrder("shop1.myshopify.com", BASE_INPUT);

    expect(result).toEqual({ created: 0 });
    expect(mockPrisma.product.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.reviewRequest.upsert).not.toHaveBeenCalled();
  });

  it("skips line items whose product hasn't synced locally", async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);

    const result = await createReviewRequestsForOrder("shop1.myshopify.com", BASE_INPUT);

    expect(result).toEqual({ created: 0 });
    expect(mockPrisma.reviewRequest.upsert).not.toHaveBeenCalled();
  });

  it("skips line items with a null shopifyProductId", async () => {
    const result = await createReviewRequestsForOrder("shop1.myshopify.com", {
      ...BASE_INPUT,
      lineItems: [{ shopifyProductId: null, title: "Gift wrap", quantity: 1 }],
    });

    expect(result).toEqual({ created: 0 });
    expect(mockPrisma.product.findMany).not.toHaveBeenCalled();
  });

  it("determines cohort=first_time when no prior request exists, and uses the first-time delay default (5 days)", async () => {
    mockPrisma.reviewRequest.findFirst.mockResolvedValue(null);

    await createReviewRequestsForOrder("shop1.myshopify.com", BASE_INPUT);

    expect(mockPrisma.reviewRequest.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          cohort: "first_time",
          scheduledSendAt: new Date(BASE_INPUT.deliveredAt.getTime() + 5 * 86_400_000),
        }),
      })
    );
  });

  it("determines cohort=repeat when a prior request exists for this customer, and uses the repeat delay default (3 days)", async () => {
    mockPrisma.reviewRequest.findFirst.mockResolvedValue({ id: "rr_prior" });

    await createReviewRequestsForOrder("shop1.myshopify.com", BASE_INPUT);

    expect(mockPrisma.reviewRequest.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          cohort: "repeat",
          scheduledSendAt: new Date(BASE_INPUT.deliveredAt.getTime() + 3 * 86_400_000),
        }),
      })
    );
  });

  it("reads delay-days settings and honors a configured value", async () => {
    mockPrisma.settings.findUnique.mockImplementation(({ where }: any) => {
      if (where.shop_key.key === "reviewRequestDelayDaysFirstTime") {
        return Promise.resolve({ value: "10" });
      }
      return Promise.resolve(null);
    });

    await createReviewRequestsForOrder("shop1.myshopify.com", BASE_INPUT);

    expect(mockPrisma.reviewRequest.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          scheduledSendAt: new Date(BASE_INPUT.deliveredAt.getTime() + 10 * 86_400_000),
        }),
      })
    );
  });

  it("falls back to the default delay when the setting value fails to parse", async () => {
    mockPrisma.settings.findUnique.mockImplementation(({ where }: any) => {
      if (where.shop_key.key === "reviewRequestDelayDaysFirstTime") {
        return Promise.resolve({ value: "not-a-number" });
      }
      return Promise.resolve(null);
    });

    await createReviewRequestsForOrder("shop1.myshopify.com", BASE_INPUT);

    expect(mockPrisma.reviewRequest.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          scheduledSendAt: new Date(BASE_INPUT.deliveredAt.getTime() + 5 * 86_400_000),
        }),
      })
    );
  });

  it("upserts scoped to [shop, shopifyOrderId, productId] so redelivery is idempotent", async () => {
    await createReviewRequestsForOrder("shop1.myshopify.com", BASE_INPUT);

    expect(mockPrisma.reviewRequest.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          shop_shopifyOrderId_productId: {
            shop: "shop1.myshopify.com",
            shopifyOrderId: "gid://shopify/Order/1",
            productId: "prod_1",
          },
        },
        update: {},
      })
    );
  });

  it("creates one ReviewRequest per resolved product and reports the count", async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      { id: "prod_1", shopifyProductId: "gid://shopify/Product/1" },
      { id: "prod_2", shopifyProductId: "gid://shopify/Product/2" },
    ]);

    const result = await createReviewRequestsForOrder("shop1.myshopify.com", {
      ...BASE_INPUT,
      lineItems: [
        { shopifyProductId: "gid://shopify/Product/1", title: "A", quantity: 1 },
        { shopifyProductId: "gid://shopify/Product/2", title: "B", quantity: 1 },
      ],
    });

    expect(result).toEqual({ created: 2 });
    expect(mockPrisma.reviewRequest.upsert).toHaveBeenCalledTimes(2);
  });

  it("reports created: 0 on webhook redelivery (upsert hits the no-op update branch for an already-existing row)", async () => {
    mockPrisma.reviewRequest.findMany.mockResolvedValue([{ productId: "prod_1" }]);

    const result = await createReviewRequestsForOrder("shop1.myshopify.com", BASE_INPUT);

    expect(result).toEqual({ created: 0 });
    expect(mockPrisma.reviewRequest.upsert).toHaveBeenCalledTimes(1); // still upserts, just doesn't count as new
  });
});
