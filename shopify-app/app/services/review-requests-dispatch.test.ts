import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  reviewRequest: {
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
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
const sendWhatsAppMock = vi.fn();
vi.mock("./channels/whatsapp.server", () => ({ sendWhatsApp: sendWhatsAppMock }));

const {
  findDueReviewRequests,
  dispatchReviewRequest,
  dispatchDueReviewRequests,
  claimReviewRequest,
  reclaimStaleSendingRequests,
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
  mockPrisma.reviewRequest.updateMany.mockResolvedValue({ count: 1 });
  sendEmailMock.mockResolvedValue({ id: "email_1" });
  sendWhatsAppMock.mockResolvedValue({ ok: true });
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

describe("claimReviewRequest", () => {
  it("claims a pending row, and a second concurrent claim on the same row returns 0", async () => {
    const store = { id: "rr_1", status: "pending" };
    const fakeClient = {
      reviewRequest: {
        updateMany: vi.fn(async ({ where, data }: any) => {
          if (store.id === where.id && store.status === where.status) {
            store.status = data.status;
            return { count: 1 };
          }
          return { count: 0 };
        }),
      },
    };

    const first = await claimReviewRequest("rr_1", fakeClient as any);
    const second = await claimReviewRequest("rr_1", fakeClient as any);

    expect(first).toBe(1);
    expect(second).toBe(0);
  });
});

describe("reclaimStaleSendingRequests", () => {
  it("resets rows stuck in 'sending' past the 15-minute timeout back to 'pending'", async () => {
    mockPrisma.reviewRequest.updateMany.mockResolvedValue({ count: 1 });
    const now = new Date("2026-07-20T00:00:00Z");

    await reclaimStaleSendingRequests(now, mockPrisma as any);

    expect(mockPrisma.reviewRequest.updateMany).toHaveBeenCalledWith({
      where: {
        status: "sending",
        updatedAt: { lt: new Date(now.getTime() - 15 * 60_000) },
      },
      data: { status: "pending" },
    });
  });
});

describe("dispatchReviewRequest - whatsapp channel (Slice 5)", () => {
  const WA_RR = { ...BASE_RR, channel: "whatsapp", customerPhone: "+15551234567" };

  it("sends via sendWhatsApp on the happy path and reuses the same sent-status update as email", async () => {
    const now = new Date("2026-07-20T00:00:00Z");

    const result = await dispatchReviewRequest({ ...WA_RR, sentCount: 0 } as any, mockPrisma as any, now);

    expect(sendWhatsAppMock).toHaveBeenCalledWith(
      expect.objectContaining({ shop: "shop1.myshopify.com", to: "+15551234567" }),
      mockPrisma,
    );
    expect(sendEmailMock).not.toHaveBeenCalled();
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

  it("fails the attempt with a clear reason when there's no customerPhone", async () => {
    const result = await dispatchReviewRequest(
      { ...WA_RR, customerPhone: null } as any,
      mockPrisma as any,
    );

    expect(sendWhatsAppMock).not.toHaveBeenCalled();
    expect(result).toEqual({ id: "rr_1", result: "retry_pending" });
    expect(mockPrisma.reviewRequest.update).toHaveBeenCalledWith({
      where: { id: "rr_1" },
      data: { failedAttempts: 1, lastError: "missing_customer_phone" },
    });
  });

  it("fails the attempt with a clear reason when sendWhatsApp reports suppressed/no connection", async () => {
    sendWhatsAppMock.mockResolvedValue({ ok: false, error: "no_enabled_whatsapp_connection" });

    const result = await dispatchReviewRequest(WA_RR as any, mockPrisma as any);

    expect(result).toEqual({ id: "rr_1", result: "retry_pending" });
    expect(mockPrisma.reviewRequest.update).toHaveBeenCalledWith({
      where: { id: "rr_1" },
      data: { failedAttempts: 1, lastError: "no_enabled_whatsapp_connection" },
    });
  });

  it("still sends over email, unchanged, when channel is absent/email", async () => {
    const result = await dispatchReviewRequest({ ...BASE_RR, sentCount: 0 } as any, mockPrisma as any);

    expect(sendEmailMock).toHaveBeenCalled();
    expect(sendWhatsAppMock).not.toHaveBeenCalled();
    expect(result.result).toBe("sent");
  });
});
