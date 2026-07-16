import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  reviewRequest: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  emailSuppression: {
    findUnique: vi.fn(),
  },
  review: {
    findFirst: vi.fn(),
  },
};

vi.mock("./db.server", () => ({ prisma: mockPrisma }));
vi.mock("./order-verification.server", () => ({
  signVerificationToken: vi.fn(() => "signed-token"),
}));
vi.mock("../lib/unsubscribe-token.server", () => ({
  signUnsubscribe: vi.fn(() => "unsub-sig"),
}));
vi.mock("./email/templates/review-request", () => ({
  buildReviewRequestEmail: vi.fn(() => ({
    subject: "subject",
    html: "<p>html</p>",
    text: "text",
  })),
}));
const sendEmailMock = vi.fn();
vi.mock("./email/resend.server", () => ({ sendEmail: sendEmailMock }));

const {
  findDueReviewRequests,
  dispatchReviewRequest,
  dispatchDueReviewRequests,
} = await import("./review-requests-dispatch.server");

const BASE_RR = {
  id: "rr_1",
  shop: "shop1.myshopify.com",
  productId: "prod_1",
  shopifyOrderId: "gid://shopify/Order/1",
  customerEmail: "buyer@example.com",
  customerName: null,
  cohort: "first_time",
  sentCount: 0,
  failedAttempts: 0,
  product: {
    id: "prod_1",
    shopifyProductId: "gid://shopify/Product/1",
    slug: "snowboard",
    name: "Snowboard",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.emailSuppression.findUnique.mockResolvedValue(null);
  mockPrisma.review.findFirst.mockResolvedValue(null);
  mockPrisma.reviewRequest.update.mockResolvedValue({});
  sendEmailMock.mockResolvedValue({ id: "email_1" });
});

describe("findDueReviewRequests", () => {
  it("queries pending, due, under-cap requests only", async () => {
    mockPrisma.reviewRequest.findMany.mockResolvedValue([]);
    const now = new Date("2026-07-20T00:00:00Z");

    await findDueReviewRequests(now, 50);

    expect(mockPrisma.reviewRequest.findMany).toHaveBeenCalledWith({
      where: { status: "pending", scheduledSendAt: { lte: now }, sentCount: { lt: 3 } },
      take: 50,
      include: { product: true },
    });
  });
});

describe("dispatchReviewRequest", () => {
  it("marks suppressed and stops when an EmailSuppression row exists", async () => {
    mockPrisma.emailSuppression.findUnique.mockResolvedValue({ id: "sup_1" });

    const result = await dispatchReviewRequest(BASE_RR as any, mockPrisma as any);

    expect(result).toEqual({ id: "rr_1", result: "suppressed" });
    expect(mockPrisma.reviewRequest.update).toHaveBeenCalledWith({
      where: { id: "rr_1" },
      data: { status: "suppressed" },
    });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("marks converted and stops when a Review already exists for shop+product+email", async () => {
    mockPrisma.review.findFirst.mockResolvedValue({ id: "review_1" });

    const result = await dispatchReviewRequest(BASE_RR as any, mockPrisma as any);

    expect(result).toEqual({ id: "rr_1", result: "converted" });
    expect(mockPrisma.reviewRequest.update).toHaveBeenCalledWith({
      where: { id: "rr_1" },
      data: { status: "converted", completedReviewId: "review_1" },
    });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("on successful send, increments sentCount and reschedules 7 days out while under the cap", async () => {
    const now = new Date("2026-07-20T00:00:00Z");

    const result = await dispatchReviewRequest({ ...BASE_RR, sentCount: 0 } as any, mockPrisma as any, now);

    expect(result).toEqual({ id: "rr_1", result: "sent" });
    expect(mockPrisma.reviewRequest.update).toHaveBeenCalledWith({
      where: { id: "rr_1" },
      data: {
        sentCount: 1,
        lastSentAt: now,
        status: "pending",
        scheduledSendAt: new Date(now.getTime() + 7 * 86_400_000),
      },
    });
  });

  it("marks exhausted once sentCount reaches the cap of 3 (no further reschedule)", async () => {
    const now = new Date("2026-07-20T00:00:00Z");

    const result = await dispatchReviewRequest({ ...BASE_RR, sentCount: 2 } as any, mockPrisma as any, now);

    expect(result).toEqual({ id: "rr_1", result: "exhausted" });
    expect(mockPrisma.reviewRequest.update).toHaveBeenCalledWith({
      where: { id: "rr_1" },
      data: { sentCount: 3, lastSentAt: now, status: "exhausted" },
    });
  });

  it("on transport failure, increments failedAttempts without consuming a sentCount touch", async () => {
    sendEmailMock.mockRejectedValue(new Error("resend down"));
    const now = new Date("2026-07-20T00:00:00Z");

    const result = await dispatchReviewRequest({ ...BASE_RR, failedAttempts: 0 } as any, mockPrisma as any, now);

    expect(result).toEqual({ id: "rr_1", result: "retry_pending" });
    expect(mockPrisma.reviewRequest.update).toHaveBeenCalledWith({
      where: { id: "rr_1" },
      data: { failedAttempts: 1, lastError: "resend down" },
    });
  });

  it("marks failed (terminal) once failedAttempts reaches the cap of 5", async () => {
    sendEmailMock.mockRejectedValue(new Error("resend down"));
    const now = new Date("2026-07-20T00:00:00Z");

    const result = await dispatchReviewRequest({ ...BASE_RR, failedAttempts: 4 } as any, mockPrisma as any, now);

    expect(result).toEqual({ id: "rr_1", result: "failed" });
    expect(mockPrisma.reviewRequest.update).toHaveBeenCalledWith({
      where: { id: "rr_1" },
      data: { failedAttempts: 5, lastError: "resend down", status: "failed" },
    });
  });

  it("fails gracefully (as a failed-attempt) instead of throwing when the product has no shopifyProductId", async () => {
    const rr = { ...BASE_RR, product: { ...BASE_RR.product, shopifyProductId: null } };

    const result = await dispatchReviewRequest(rr as any, mockPrisma as any);

    expect(result).toEqual({ id: "rr_1", result: "retry_pending" });
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(mockPrisma.reviewRequest.update).toHaveBeenCalledWith({
      where: { id: "rr_1" },
      data: { failedAttempts: 1, lastError: "missing_shopify_product_id" },
    });
  });
});

describe("dispatchDueReviewRequests", () => {
  it("processes every due request returned by findDueReviewRequests", async () => {
    mockPrisma.reviewRequest.findMany.mockResolvedValue([BASE_RR, { ...BASE_RR, id: "rr_2" }]);

    const result = await dispatchDueReviewRequests(mockPrisma as any);

    expect(result.processed).toBe(2);
    expect(result.results).toHaveLength(2);
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
  });
});
