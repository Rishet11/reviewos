import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  orderCapture: {
    upsert: vi.fn(),
    updateMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  orderLineItem: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  review: {
    updateMany: vi.fn(),
  },
};

vi.mock("./db.server", () => ({ prisma: mockPrisma }));

const { captureOrder, markOrderFulfilled, cancelOrderCapture } = await import(
  "./order-capture.server"
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("captureOrder", () => {
  it("upserts scoped to [shop, shopifyOrderId] and replaces line items", async () => {
    mockPrisma.orderCapture.upsert.mockResolvedValue({ id: "order_1" });
    mockPrisma.orderLineItem.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.orderLineItem.createMany.mockResolvedValue({ count: 1 });

    await captureOrder("shop1.myshopify.com", {
      admin_graphql_api_id: "gid://shopify/Order/1",
      name: "#1001",
      email: "buyer@example.com",
      financial_status: "paid",
      line_items: [
        { product_id: 632910392, variant_id: 39072856, title: "Snowboard", quantity: 1 },
      ],
    });

    expect(mockPrisma.orderCapture.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          shop_shopifyOrderId: {
            shop: "shop1.myshopify.com",
            shopifyOrderId: "gid://shopify/Order/1",
          },
        },
      })
    );

    expect(mockPrisma.orderLineItem.deleteMany).toHaveBeenCalledWith({
      where: { orderCaptureId: "order_1" },
    });

    expect(mockPrisma.orderLineItem.createMany).toHaveBeenCalledWith({
      data: [
        {
          orderCaptureId: "order_1",
          shopifyProductId: "gid://shopify/Product/632910392",
          shopifyVariantId: "39072856",
          title: "Snowboard",
          quantity: 1,
        },
      ],
    });
  });

  it("prefers the top-level order email over customer.email when both are present", async () => {
    mockPrisma.orderCapture.upsert.mockResolvedValue({ id: "order_2" });
    mockPrisma.orderLineItem.deleteMany.mockResolvedValue({ count: 0 });

    await captureOrder("shop1.myshopify.com", {
      admin_graphql_api_id: "gid://shopify/Order/2",
      email: "checkout@example.com",
      customer: { email: "account@example.com", admin_graphql_api_id: "gid://shopify/Customer/9" },
      financial_status: "paid",
    });

    const createArg = mockPrisma.orderCapture.upsert.mock.calls[0][0];
    expect(createArg.create.customerEmail).toBe("checkout@example.com");
    expect(createArg.create.customerId).toBe("gid://shopify/Customer/9");
  });

  it("falls back to customer.email when no top-level email is present", async () => {
    mockPrisma.orderCapture.upsert.mockResolvedValue({ id: "order_3" });
    mockPrisma.orderLineItem.deleteMany.mockResolvedValue({ count: 0 });

    await captureOrder("shop1.myshopify.com", {
      admin_graphql_api_id: "gid://shopify/Order/3",
      customer: { email: "account@example.com" },
      financial_status: "paid",
    });

    const createArg = mockPrisma.orderCapture.upsert.mock.calls[0][0];
    expect(createArg.create.customerEmail).toBe("account@example.com");
  });

  it("derives shopifyProductId from product_id, never from the line item's own admin_graphql_api_id (that's a LineItem GID, not a Product GID)", async () => {
    mockPrisma.orderCapture.upsert.mockResolvedValue({ id: "order_5" });
    mockPrisma.orderLineItem.deleteMany.mockResolvedValue({ count: 0 });

    await captureOrder("shop1.myshopify.com", {
      admin_graphql_api_id: "gid://shopify/Order/5",
      financial_status: "paid",
      line_items: [
        {
          // A real Shopify order webhook line item carries its OWN GID here,
          // e.g. gid://shopify/LineItem/466157049. If the service ever used
          // this instead of product_id, shopifyProductId would end up
          // storing a LineItem GID that can never match Product.shopifyProductId.
          admin_graphql_api_id: "gid://shopify/LineItem/466157049",
          product_id: 632910392,
          title: "Snowboard",
          quantity: 1,
        } as any,
      ],
    });

    expect(mockPrisma.orderLineItem.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          shopifyProductId: "gid://shopify/Product/632910392",
        }),
      ],
    });
  });

  it("does not touch createMany when there are no line items", async () => {
    mockPrisma.orderCapture.upsert.mockResolvedValue({ id: "order_4" });
    mockPrisma.orderLineItem.deleteMany.mockResolvedValue({ count: 0 });

    await captureOrder("shop1.myshopify.com", {
      admin_graphql_api_id: "gid://shopify/Order/4",
      financial_status: "paid",
      line_items: [],
    });

    expect(mockPrisma.orderLineItem.createMany).not.toHaveBeenCalled();
  });
});

describe("markOrderFulfilled", () => {
  it("updates fulfilledAt scoped by [shop, shopifyOrderId] and returns the row with lineItems", async () => {
    const fulfilledAt = new Date("2026-07-16T00:00:00Z");
    mockPrisma.orderCapture.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.orderCapture.findFirst.mockResolvedValue({
      id: "order_1",
      shop: "shop1.myshopify.com",
      shopifyOrderId: "gid://shopify/Order/1",
      lineItems: [{ id: "li_1", shopifyProductId: "gid://shopify/Product/1" }],
    });

    const result = await markOrderFulfilled(
      "shop1.myshopify.com",
      "gid://shopify/Order/1",
      fulfilledAt
    );

    expect(mockPrisma.orderCapture.updateMany).toHaveBeenCalledWith({
      where: { shop: "shop1.myshopify.com", shopifyOrderId: "gid://shopify/Order/1" },
      data: { fulfilledAt },
    });
    expect(mockPrisma.orderCapture.findFirst).toHaveBeenCalledWith({
      where: { shop: "shop1.myshopify.com", shopifyOrderId: "gid://shopify/Order/1" },
      include: { lineItems: true },
    });
    expect(result?.lineItems).toHaveLength(1);
  });
});

describe("cancelOrderCapture", () => {
  it("sets cancelledAt and revokes verifiedBuyer on reviews linked to this order", async () => {
    mockPrisma.orderCapture.findFirst.mockResolvedValue({
      id: "order_1",
      shop: "shop1.myshopify.com",
      shopifyOrderId: "gid://shopify/Order/1",
    });
    mockPrisma.orderCapture.update.mockResolvedValue({ id: "order_1" });
    mockPrisma.review.updateMany.mockResolvedValue({ count: 2 });

    await cancelOrderCapture("shop1.myshopify.com", "gid://shopify/Order/1");

    expect(mockPrisma.orderCapture.update).toHaveBeenCalledWith({
      where: { id: "order_1" },
      data: { cancelledAt: expect.any(Date) },
    });
    expect(mockPrisma.review.updateMany).toHaveBeenCalledWith({
      where: { shop: "shop1.myshopify.com", verifiedOrderId: "order_1" },
      data: { verifiedBuyer: false },
    });
  });

  it("is a no-op when no matching order capture exists (unknown/duplicate webhook)", async () => {
    mockPrisma.orderCapture.findFirst.mockResolvedValue(null);

    const result = await cancelOrderCapture("shop1.myshopify.com", "gid://shopify/Order/999");

    expect(result).toBeNull();
    expect(mockPrisma.orderCapture.update).not.toHaveBeenCalled();
    expect(mockPrisma.review.updateMany).not.toHaveBeenCalled();
  });
});
