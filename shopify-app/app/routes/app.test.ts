import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockBilling = { require: vi.fn() };
// Mimic the App Bridge-aware redirect: returns a Response the loader throws.
const mockRedirect = vi.fn((url: string) => new Response(null, { status: 302, headers: { location: url } }));

vi.mock("../shopify.server", () => ({
  authenticate: {
    admin: vi.fn(async () => ({ billing: mockBilling, redirect: mockRedirect })),
  },
  BILLING_PLANS: ["Pro"],
  BILLING_TEST: true,
}));

// app.tsx imports these at module top; stub them so importing the loader is cheap.
vi.mock("@shopify/shopify-app-react-router/server", () => ({ boundary: { error: vi.fn(), headers: vi.fn() } }));
vi.mock("@shopify/shopify-app-react-router/react", () => ({ AppProvider: () => null }));

const { loader } = await import("./app");

const req = (path: string) => new Request(`https://app.example.com${path}`);

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.BILLING_BYPASS;
});
afterEach(() => {
  delete process.env.BILLING_BYPASS;
});

describe("app layout billing gate", () => {
  it("enforces billing on feature pages (calls billing.require)", async () => {
    mockBilling.require.mockResolvedValue(undefined);

    const result = await loader({ request: req("/app/reviews") } as any);

    expect(mockBilling.require).toHaveBeenCalledWith(
      expect.objectContaining({ plans: ["Pro"], isTest: true }),
    );
    expect(result).toHaveProperty("apiKey");
  });

  it("skips the gate entirely when BILLING_BYPASS=1 (dev escape hatch)", async () => {
    process.env.BILLING_BYPASS = "1";

    const result = await loader({ request: req("/app/reviews") } as any);

    expect(mockBilling.require).not.toHaveBeenCalled();
    expect(result).toHaveProperty("apiKey");
  });

  it("does not gate the Billing page itself", async () => {
    await loader({ request: req("/app/billing") } as any);
    expect(mockBilling.require).not.toHaveBeenCalled();
  });

  it("re-throws the redirect Response from onFailure (clean not-subscribed)", async () => {
    const redirectResponse = new Response(null, { status: 302, headers: { location: "/app/billing" } });
    mockBilling.require.mockRejectedValue(redirectResponse);

    await expect(loader({ request: req("/app/reviews") } as any)).rejects.toBe(redirectResponse);
  });

  it("fails closed to Billing (not a blank app) when billing.require throws a BillingError", async () => {
    mockBilling.require.mockRejectedValue(new Error("Error while billing the store"));

    const thrown = await loader({ request: req("/app/reviews") } as any).catch((e) => e);

    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).headers.get("location")).toBe("/app/billing?billing_error=1");
  });
});
