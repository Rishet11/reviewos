import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./email/resend.server", () => ({ sendEmail: vi.fn() }));

const mockPrisma = {
  marketplaceStat: { findMany: vi.fn() },
  session: { findFirst: vi.fn() },
  settings: { findUnique: vi.fn(), upsert: vi.fn() },
};

vi.mock("./db.server", () => ({ prisma: mockPrisma }));

const { findStaleStats, runStalenessSweep } = await import("./marketplace-staleness.server");
const { sendEmail } = await import("./email/resend.server");

const DAY_MS = 86_400_000;
const NOW = Date.now();

function statFixture(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "stat_1",
    shop: "shop1.myshopify.com",
    lastCheckedAt: null,
    updatedAt: new Date(NOW - 10 * DAY_MS),
    source: { name: "Amazon" },
    product: { slug: "prod-a", name: "Product A" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("findStaleStats", () => {
  it("treats a stat as stale when lastCheckedAt is null and updatedAt is older than threshold", async () => {
    mockPrisma.marketplaceStat.findMany.mockResolvedValue([
      statFixture({ updatedAt: new Date(NOW - 8 * DAY_MS) }),
    ]);
    const result = await findStaleStats(undefined, 7, mockPrisma as never);
    expect(result).toHaveLength(1);
  });

  it("pushes the staleness condition into the where clause (lastCheckedAt OR null+updatedAt)", async () => {
    mockPrisma.marketplaceStat.findMany.mockResolvedValue([]);
    const before = Date.now();
    await findStaleStats("shop1.myshopify.com", 7, mockPrisma as never);
    const after = Date.now();

    const arg = mockPrisma.marketplaceStat.findMany.mock.calls.at(-1)![0];
    expect(arg.where.shop).toBe("shop1.myshopify.com");
    const [byChecked, byUpdated] = arg.where.OR;
    expect(byChecked.lastCheckedAt.lt.getTime()).toBeGreaterThanOrEqual(before - 7 * DAY_MS - 1000);
    expect(byChecked.lastCheckedAt.lt.getTime()).toBeLessThanOrEqual(after - 7 * DAY_MS + 1000);
    expect(byUpdated.lastCheckedAt).toBeNull();
    expect(byUpdated.updatedAt.lt).toEqual(byChecked.lastCheckedAt.lt);
  });

  it("omits the shop filter for a cron-wide sweep", async () => {
    mockPrisma.marketplaceStat.findMany.mockResolvedValue([]);
    await findStaleStats(undefined, 7, mockPrisma as never);
    const arg = mockPrisma.marketplaceStat.findMany.mock.calls.at(-1)![0];
    expect(arg.where.shop).toBeUndefined();
    expect(arg.where.OR).toHaveLength(2);
  });
});

describe("runStalenessSweep", () => {
  it("groups stale stats per shop into one digest email each", async () => {
    mockPrisma.marketplaceStat.findMany.mockResolvedValue([
      statFixture({ id: "s1", shop: "shopA", product: { slug: "a", name: "A" } }),
      statFixture({ id: "s2", shop: "shopA", product: { slug: "b", name: "B" } }),
      statFixture({ id: "s3", shop: "shopB", product: { slug: "c", name: "C" } }),
    ]);
    mockPrisma.session.findFirst.mockResolvedValue({ email: "merchant@example.com" });

    const result = await runStalenessSweep({ client: mockPrisma as never });

    expect(result.shopsWithStaleStats).toBe(2);
    expect(result.staleStatCount).toBe(3);
    expect(result.emailsSent).toBe(2);
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it("skips shops with no resolvable contact email and reports the skip", async () => {
    mockPrisma.marketplaceStat.findMany.mockResolvedValue([statFixture()]);
    mockPrisma.session.findFirst.mockResolvedValue(null);

    const result = await runStalenessSweep({ client: mockPrisma as never });

    expect(result.emailsSent).toBe(0);
    expect(result.emailsSkipped).toBe(1);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("skips the digest when the shop was notified within the last 3 days", async () => {
    mockPrisma.marketplaceStat.findMany.mockResolvedValue([statFixture()]);
    mockPrisma.session.findFirst.mockResolvedValue({ email: "merchant@example.com" });
    mockPrisma.settings.findUnique.mockResolvedValue({
      value: new Date(NOW - 1 * DAY_MS).toISOString(),
    });

    const result = await runStalenessSweep({ client: mockPrisma as never });

    expect(result.emailsSent).toBe(0);
    expect(result.emailsSkipped).toBe(1);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("records marketplaceStalenessNotifiedAt after a successful send", async () => {
    mockPrisma.marketplaceStat.findMany.mockResolvedValue([statFixture()]);
    mockPrisma.session.findFirst.mockResolvedValue({ email: "merchant@example.com" });
    mockPrisma.settings.findUnique.mockResolvedValue(null);

    const result = await runStalenessSweep({ client: mockPrisma as never });

    expect(result.emailsSent).toBe(1);
    const upsertArg = mockPrisma.settings.upsert.mock.calls.at(-1)![0];
    expect(upsertArg.where.shop_key.key).toBe("marketplaceStalenessNotifiedAt");
    expect(new Date(upsertArg.create.value).getTime()).toBeGreaterThan(0);
  });

  it("re-sends when the last notification is older than 3 days", async () => {
    mockPrisma.marketplaceStat.findMany.mockResolvedValue([statFixture()]);
    mockPrisma.session.findFirst.mockResolvedValue({ email: "merchant@example.com" });
    mockPrisma.settings.findUnique.mockResolvedValue({
      value: new Date(NOW - 4 * DAY_MS).toISOString(),
    });

    const result = await runStalenessSweep({ client: mockPrisma as never });

    expect(result.emailsSent).toBe(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("skips shops that fail the isProLookup gate", async () => {
    mockPrisma.marketplaceStat.findMany.mockResolvedValue([statFixture()]);
    mockPrisma.session.findFirst.mockResolvedValue({ email: "merchant@example.com" });

    const result = await runStalenessSweep({
      client: mockPrisma as never,
      isProLookup: async () => false,
    });

    expect(result.emailsSent).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
