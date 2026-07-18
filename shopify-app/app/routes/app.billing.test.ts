import { describe, it, expect, vi, beforeEach } from "vitest";

const mockBilling = {
  check: vi.fn(),
  request: vi.fn(),
};

vi.mock("../shopify.server", () => ({
  authenticate: {
    admin: vi.fn(async () => ({
      session: { shop: "shop1.myshopify.com" },
      billing: mockBilling,
    })),
  },
  BILLING_PLANS: ["Pro"],
  BILLING_TEST: true,
}));

vi.mock("@shopify/shopify-app-react-router/server", () => ({
  boundary: { headers: vi.fn() },
}));

const { loader, action } = await import("./app.billing");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("app.billing loader", () => {
  it("reports subscribed=true for an active Pro plan", async () => {
    // billing.check returns an OBJECT { hasActivePayment }, not a boolean.
    // Mocking it faithfully guards against the loader treating the whole
    // object as truthy (which always rendered "Active plan" + hid Subscribe).
    mockBilling.check.mockResolvedValue({ hasActivePayment: true });

    const result = await loader({ request: new Request("https://app.example.com/app/billing") } as any);

    expect(result).toEqual({ subscribed: true, billingAvailable: true });
    expect(mockBilling.check).toHaveBeenCalledWith({ plans: ["Pro"], isTest: true });
  });

  it("reports subscribed=false for a free-plan shop", async () => {
    mockBilling.check.mockResolvedValue({ hasActivePayment: false });

    const result = await loader({ request: new Request("https://app.example.com/app/billing") } as any);

    expect(result).toEqual({ subscribed: false, billingAvailable: true });
  });

  it("degrades to not-subscribed (no blank page) when the Billing API errors", async () => {
    // e.g. "Apps without a public distribution cannot use the Billing API"
    mockBilling.check.mockRejectedValue(new Error("Error while billing the store"));

    const result = await loader({ request: new Request("https://app.example.com/app/billing") } as any);

    expect(result).toEqual({ subscribed: false, billingAvailable: false });
  });
});

describe("app.billing action", () => {
  it("requests the Pro plan with a return URL derived from the request host", async () => {
    mockBilling.request.mockResolvedValue({ confirmationUrl: "https://admin.shopify.com/charge" });

    const request = new Request("https://app.example.com/app/billing", { method: "POST" });
    const result = await action({ request } as any);

    expect(mockBilling.request).toHaveBeenCalledWith({
      plan: "Pro",
      isTest: true,
      returnUrl: "https://app.example.com/app?charge=success",
    });
    expect(result).toEqual({ confirmationUrl: "https://admin.shopify.com/charge" });
  });
});
