import { describe, it, expect, vi } from "vitest";

vi.mock("../shopify.server", () => ({
  BILLING_PLANS: ["Pro"],
  BILLING_TEST: true,
}));

const { getPlan } = await import("./entitlements.server");

describe("getPlan", () => {
  it("returns 'pro' when billing.check reports an active payment", async () => {
    const billing = { check: vi.fn().mockResolvedValue({ hasActivePayment: true }) };

    await expect(getPlan(billing)).resolves.toBe("pro");
    expect(billing.check).toHaveBeenCalledWith({ plans: ["Pro"], isTest: true });
  });

  it("returns 'free' when billing.check reports no active payment", async () => {
    const billing = { check: vi.fn().mockResolvedValue({ hasActivePayment: false }) };

    await expect(getPlan(billing)).resolves.toBe("free");
  });

  it("returns 'free' (fail-safe) when billing.check throws", async () => {
    const billing = { check: vi.fn().mockRejectedValue(new Error("Shopify API down")) };

    await expect(getPlan(billing)).resolves.toBe("free");
  });
});
