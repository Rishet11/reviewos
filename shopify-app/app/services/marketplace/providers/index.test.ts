import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { MarketplaceStatsProvider } from "./provider";

describe("marketplace provider registry", () => {
  const originalEnv = process.env.MARKETPLACE_LIVE_FETCH_ENABLED;

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.MARKETPLACE_LIVE_FETCH_ENABLED;
    else process.env.MARKETPLACE_LIVE_FETCH_ENABLED = originalEnv;
  });

  beforeEach(() => {
    delete process.env.MARKETPLACE_LIVE_FETCH_ENABLED;
  });

  it("is empty by default: getProvider returns undefined for any key", async () => {
    const { getProvider } = await import("./index");
    expect(getProvider("amazon")).toBeUndefined();
    expect(getProvider("anything")).toBeUndefined();
  });

  it("returns undefined even for a key that would be registered, when the kill switch env is unset", async () => {
    // Simulates a future real provider being registered: even so, the
    // kill-switch gate must block it while the env var is unset.
    const fake: MarketplaceStatsProvider = {
      key: "fake",
      fetchStats: async () => ({ rating: 4.5, reviewCount: 10 }),
    };
    void fake;
    const { getProvider } = await import("./index");
    expect(getProvider("fake")).toBeUndefined();
  });

  it("stays undefined even when explicitly set to a falsy non-'true' value", async () => {
    process.env.MARKETPLACE_LIVE_FETCH_ENABLED = "false";
    const { getProvider } = await import("./index");
    expect(getProvider("amazon")).toBeUndefined();
  });
});
