import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { computeProxySignature, requireProxy } from "./proxy-verify.server";

const FAKE_SECRET = "test-shared-secret";

function buildSignedUrl(params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  const signature = computeProxySignature(search, FAKE_SECRET);
  search.set("signature", signature);
  return `https://example.com/proxy/reviews?${search.toString()}`;
}

describe("requireProxy", () => {
  beforeEach(() => {
    process.env.SHOPIFY_API_SECRET = FAKE_SECRET;
  });

  afterEach(() => {
    delete process.env.SHOPIFY_API_SECRET;
  });

  it("passes with a valid signature and returns the shop", () => {
    const url = buildSignedUrl({
      shop: "test-shop.myshopify.com",
      path_prefix: "/apps/reviewos",
      timestamp: "1700000000",
    });

    const result = requireProxy(new Request(url));
    expect(result).toEqual({ shop: "test-shop.myshopify.com" });
  });

  it("rejects a tampered signature", () => {
    const url = buildSignedUrl({
      shop: "test-shop.myshopify.com",
      path_prefix: "/apps/reviewos",
      timestamp: "1700000000",
    });
    const tampered = url.replace(/signature=[0-9a-f]+/, "signature=deadbeef");

    expect(() => requireProxy(new Request(tampered))).toThrow();
    try {
      requireProxy(new Request(tampered));
    } catch (err) {
      expect(err).toBeInstanceOf(Response);
      expect((err as Response).status).toBe(401);
    }
  });

  it("rejects a tampered query param even if signature format is valid hex", () => {
    const url = buildSignedUrl({
      shop: "test-shop.myshopify.com",
      path_prefix: "/apps/reviewos",
      timestamp: "1700000000",
    });
    const tampered = url.replace("test-shop.myshopify.com", "evil-shop.myshopify.com");

    expect(() => requireProxy(new Request(tampered))).toThrow();
  });

  it("rejects when shop param is missing", () => {
    const url = buildSignedUrl({
      path_prefix: "/apps/reviewos",
      timestamp: "1700000000",
    });

    expect(() => requireProxy(new Request(url))).toThrow();
    try {
      requireProxy(new Request(url));
    } catch (err) {
      expect(err).toBeInstanceOf(Response);
      expect((err as Response).status).toBe(401);
    }
  });

  it("rejects when signature is missing entirely", () => {
    const search = new URLSearchParams({
      shop: "test-shop.myshopify.com",
      path_prefix: "/apps/reviewos",
    });
    const url = `https://example.com/proxy/reviews?${search.toString()}`;

    expect(() => requireProxy(new Request(url))).toThrow();
  });
});
