import { describe, expect, it, vi } from "vitest";
import { collectCustomerData, redactCustomer, redactShop } from "./gdpr.server";

function makeMockClient() {
  return {
    $transaction: vi.fn().mockImplementation((ops: any[]) => Promise.all(ops)),
    review: {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    reviewMedia: {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    aiSummary: {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    marketplaceStat: {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    marketplaceSource: {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    attributeDefinition: {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    product: {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    orderLineItem: {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    orderCapture: {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    reviewRequest: {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    emailSuppression: {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      upsert: vi.fn().mockResolvedValue({ id: "sup_1" }),
    },
    settings: {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    session: {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  } as any;
}

describe("redactShop", () => {
  it("scopes every delete to the given shop and wraps in one transaction", async () => {
    const mock = makeMockClient();

    await redactShop("shopA", mock);

    expect(mock.$transaction).toHaveBeenCalledTimes(1);

    expect(mock.reviewMedia.deleteMany).toHaveBeenCalledWith({
      where: { review: { shop: "shopA" } },
    });
    expect(mock.review.deleteMany).toHaveBeenCalledWith({
      where: { shop: "shopA" },
    });
    expect(mock.aiSummary.deleteMany).toHaveBeenCalledWith({
      where: { shop: "shopA" },
    });
    expect(mock.marketplaceStat.deleteMany).toHaveBeenCalledWith({
      where: { shop: "shopA" },
    });
    expect(mock.marketplaceSource.deleteMany).toHaveBeenCalledWith({
      where: { shop: "shopA" },
    });
    expect(mock.attributeDefinition.deleteMany).toHaveBeenCalledWith({
      where: { shop: "shopA" },
    });
    expect(mock.product.deleteMany).toHaveBeenCalledWith({
      where: { shop: "shopA" },
    });
    expect(mock.orderLineItem.deleteMany).toHaveBeenCalledWith({
      where: { orderCapture: { shop: "shopA" } },
    });
    expect(mock.orderCapture.deleteMany).toHaveBeenCalledWith({
      where: { shop: "shopA" },
    });
    expect(mock.reviewRequest.deleteMany).toHaveBeenCalledWith({
      where: { shop: "shopA" },
    });
    expect(mock.emailSuppression.deleteMany).toHaveBeenCalledWith({
      where: { shop: "shopA" },
    });
    expect(mock.settings.deleteMany).toHaveBeenCalledWith({
      where: { shop: "shopA" },
    });
    expect(mock.session.deleteMany).toHaveBeenCalledWith({
      where: { shop: "shopA" },
    });

    // Shop-scoping guard: every delete call must carry a shop scope resolving
    // to exactly "shopA". A missing/empty `shop` in any where would be the
    // cross-shop leak, so assert each call names the shop and no call is
    // unscoped (bare `{}` / `{ where: {} }`).
    const allCalls = [
      ...mock.reviewMedia.deleteMany.mock.calls,
      ...mock.review.deleteMany.mock.calls,
      ...mock.aiSummary.deleteMany.mock.calls,
      ...mock.marketplaceStat.deleteMany.mock.calls,
      ...mock.marketplaceSource.deleteMany.mock.calls,
      ...mock.attributeDefinition.deleteMany.mock.calls,
      ...mock.product.deleteMany.mock.calls,
      ...mock.orderLineItem.deleteMany.mock.calls,
      ...mock.orderCapture.deleteMany.mock.calls,
      ...mock.reviewRequest.deleteMany.mock.calls,
      ...mock.emailSuppression.deleteMany.mock.calls,
      ...mock.settings.deleteMany.mock.calls,
      ...mock.session.deleteMany.mock.calls,
    ];

    expect(allCalls.length).toBe(13); // every model touched exactly once
    for (const [args] of allCalls) {
      const serialized = JSON.stringify(args);
      expect(serialized).toContain('"shop":"shopA"');
    }
  });
});

describe("collectCustomerData", () => {
  it("scopes the read to the shop and the requesting customer", async () => {
    const mock = makeMockClient();

    await collectCustomerData("shopA", { email: "x@y.com" }, mock);

    expect(mock.review.findMany).toHaveBeenCalledWith({
      where: { shop: "shopA", customerEmail: "x@y.com" },
    });
    expect(mock.orderCapture.findMany).toHaveBeenCalledWith({
      where: { shop: "shopA", customerEmail: "x@y.com" },
      include: { lineItems: true },
    });
    expect(mock.reviewRequest.findMany).toHaveBeenCalledWith({
      where: { shop: "shopA", customerEmail: "x@y.com" },
    });
  });

  it("returns empty and never queries when email is missing (no whole-shop leak)", async () => {
    const mock = makeMockClient();

    const result = await collectCustomerData("shopA", { email: null }, mock);

    expect(result).toEqual({ reviews: [], orders: [], reviewRequests: [] });
    expect(mock.review.findMany).not.toHaveBeenCalled();
    expect(mock.orderCapture.findMany).not.toHaveBeenCalled();
    expect(mock.reviewRequest.findMany).not.toHaveBeenCalled();
  });
});

describe("redactCustomer", () => {
  it("anonymizes matching reviews and deletes their media", async () => {
    const mock = makeMockClient();

    await redactCustomer("shopA", { email: "x@y.com" }, mock);

    expect(mock.reviewMedia.deleteMany).toHaveBeenCalledWith({
      where: { review: { shop: "shopA", customerEmail: "x@y.com" } },
    });
    expect(mock.review.updateMany).toHaveBeenCalledWith({
      where: { shop: "shopA", customerEmail: "x@y.com" },
      data: { customerName: "Anonymous", customerEmail: null },
    });
    expect(mock.orderCapture.updateMany).toHaveBeenCalledWith({
      where: { shop: "shopA", customerEmail: "x@y.com" },
      data: { customerEmail: null, customerId: null },
    });
    expect(mock.emailSuppression.upsert).toHaveBeenCalledWith({
      where: { shop_email: { shop: "shopA", email: "x@y.com" } },
      update: { reason: "customer_redact" },
      create: { shop: "shopA", email: "x@y.com", reason: "customer_redact" },
    });
    expect(mock.reviewRequest.deleteMany).toHaveBeenCalledWith({
      where: { shop: "shopA", customerEmail: "x@y.com" },
    });
  });

  it("returns matched:0 and does nothing when email is null (unlinkable gap)", async () => {
    const mock = makeMockClient();

    const result = await redactCustomer("shopA", { email: null }, mock);

    expect(result).toEqual({ matched: 0 });
    expect(mock.reviewMedia.deleteMany).not.toHaveBeenCalled();
    expect(mock.review.updateMany).not.toHaveBeenCalled();
    expect(mock.orderCapture.updateMany).not.toHaveBeenCalled();
    expect(mock.emailSuppression.upsert).not.toHaveBeenCalled();
    expect(mock.reviewRequest.deleteMany).not.toHaveBeenCalled();
  });
});
