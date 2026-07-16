import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  orderCapture: {
    findFirst: vi.fn(),
  },
  orderLineItem: {
    findFirst: vi.fn(),
  },
};

vi.mock("./db.server", () => ({ prisma: mockPrisma }));

process.env.REVIEW_VERIFICATION_SECRET = "test-secret";

const { signVerificationToken, verifyVerificationToken, matchOrderForReview } = await import(
  "./order-verification.server"
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signVerificationToken / verifyVerificationToken", () => {
  const base = {
    shop: "shop1.myshopify.com",
    shopifyOrderId: "gid://shopify/Order/1",
    shopifyProductId: "gid://shopify/Product/1",
    customerEmail: "Buyer@Example.com",
  };

  it("round-trips a freshly signed token", () => {
    const token = signVerificationToken(base);
    const payload = verifyVerificationToken(token);

    expect(payload).not.toBeNull();
    expect(payload?.s).toBe(base.shop);
    expect(payload?.oid).toBe(base.shopifyOrderId);
    expect(payload?.pid).toBe(base.shopifyProductId);
    expect(payload?.e).toBe("buyer@example.com"); // lowercased
  });

  it("rejects a tampered signature", () => {
    const token = signVerificationToken(base);
    const [body] = token.split(".");
    const tampered = `${body}.not-the-real-signature`;

    expect(verifyVerificationToken(tampered)).toBeNull();
  });

  it("rejects a tampered payload body (signature no longer matches)", () => {
    const token = signVerificationToken(base);
    const [, sig] = token.split(".");
    const forgedBody = Buffer.from(
      JSON.stringify({ ...base, s: "attacker-shop.myshopify.com" })
    ).toString("base64url");

    expect(verifyVerificationToken(`${forgedBody}.${sig}`)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = signVerificationToken({ ...base, ttlDays: -1 });
    expect(verifyVerificationToken(token)).toBeNull();
  });

  it("rejects a malformed token", () => {
    expect(verifyVerificationToken("not-a-real-token")).toBeNull();
    expect(verifyVerificationToken("")).toBeNull();
  });
});

describe("matchOrderForReview", () => {
  const shop = "shop1.myshopify.com";

  it("verifies via the token path when the order/product/shop all match", async () => {
    const token = signVerificationToken({
      shop,
      shopifyOrderId: "gid://shopify/Order/1",
      shopifyProductId: "gid://shopify/Product/1",
      customerEmail: "buyer@example.com",
    });

    mockPrisma.orderCapture.findFirst.mockResolvedValue({
      id: "order_1",
      lineItems: [{ shopifyProductId: "gid://shopify/Product/1" }],
    });

    const result = await matchOrderForReview(shop, { verificationToken: token });

    expect(result).toEqual({ verified: true, orderCaptureId: "order_1" });
    expect(mockPrisma.orderCapture.findFirst).toHaveBeenCalledWith({
      where: { shop, shopifyOrderId: "gid://shopify/Order/1", cancelledAt: null },
      include: { lineItems: true },
    });
  });

  it("rejects the token when the shop in the payload does not match", async () => {
    const token = signVerificationToken({
      shop: "other-shop.myshopify.com",
      shopifyOrderId: "gid://shopify/Order/1",
      shopifyProductId: "gid://shopify/Product/1",
      customerEmail: "buyer@example.com",
    });

    const result = await matchOrderForReview(shop, { verificationToken: token });

    expect(result).toEqual({ verified: false });
    expect(mockPrisma.orderCapture.findFirst).not.toHaveBeenCalled();
  });

  it("does not verify via token when the order has no matching line item", async () => {
    const token = signVerificationToken({
      shop,
      shopifyOrderId: "gid://shopify/Order/1",
      shopifyProductId: "gid://shopify/Product/1",
      customerEmail: "buyer@example.com",
    });

    mockPrisma.orderCapture.findFirst.mockResolvedValue({
      id: "order_1",
      lineItems: [{ shopifyProductId: "gid://shopify/Product/DIFFERENT" }],
    });

    const result = await matchOrderForReview(shop, { verificationToken: token });

    expect(result).toEqual({ verified: false });
  });

  it("falls back to email + product matching when no token is given", async () => {
    mockPrisma.orderLineItem.findFirst.mockResolvedValue({ orderCaptureId: "order_2" });

    const result = await matchOrderForReview(shop, {
      shopifyProductId: "gid://shopify/Product/1",
      customerEmail: "Buyer@Example.com",
    });

    expect(result).toEqual({ verified: true, orderCaptureId: "order_2" });
    expect(mockPrisma.orderLineItem.findFirst).toHaveBeenCalledWith({
      where: {
        shopifyProductId: "gid://shopify/Product/1",
        orderCapture: { shop, cancelledAt: null, customerEmail: "buyer@example.com" },
      },
      select: { orderCaptureId: true },
    });
  });

  it("excludes cancelled orders from the fallback match", async () => {
    mockPrisma.orderLineItem.findFirst.mockResolvedValue(null);

    const result = await matchOrderForReview(shop, {
      shopifyProductId: "gid://shopify/Product/1",
      customerEmail: "buyer@example.com",
    });

    expect(result).toEqual({ verified: false });
  });

  it("returns unverified without querying when neither email nor product is given", async () => {
    const result = await matchOrderForReview(shop, {});

    expect(result).toEqual({ verified: false });
    expect(mockPrisma.orderLineItem.findFirst).not.toHaveBeenCalled();
  });
});
