import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  whatsAppConnection: {
    findUnique: vi.fn(),
  },
  channelSuppression: {
    findUnique: vi.fn(),
  },
};

vi.mock("../db.server", () => ({ prisma: mockPrisma }));
vi.mock("../crypto.server", () => ({
  decryptSecret: vi.fn(() => "decrypted-access-token"),
}));

const { sendWhatsApp } = await import("./whatsapp.server");

const BASE_ARGS = {
  shop: "shop1.myshopify.com",
  to: "+15551234567",
  customerName: "Jane",
  productName: "Snowboard",
  reviewUrl: "https://shop1.myshopify.com/products/snowboard",
  unsubscribeUrl: "https://shop1.myshopify.com/unsubscribe",
};

const CONNECTION = {
  shop: "shop1.myshopify.com",
  phoneNumberId: "1234567890",
  wabaId: "waba_1",
  appId: "app_1",
  appSecretEnc: "iv:tag:cipher",
  accessTokenEnc: "iv:tag:cipher",
  templateName: "review_request",
  templateLanguage: "en",
  templateVarOrder: JSON.stringify(["customerName", "productName", "reviewUrl"]),
  enabled: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.whatsAppConnection.findUnique.mockResolvedValue(CONNECTION);
  mockPrisma.channelSuppression.findUnique.mockResolvedValue(null);
  global.fetch = vi.fn().mockResolvedValue({ ok: true, text: async () => "" }) as any;
});

describe("sendWhatsApp", () => {
  it("fails when there's no connection", async () => {
    mockPrisma.whatsAppConnection.findUnique.mockResolvedValue(null);

    const result = await sendWhatsApp(BASE_ARGS, mockPrisma as any);

    expect(result).toEqual({ ok: false, error: "no_enabled_whatsapp_connection" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("fails when the connection exists but is disabled", async () => {
    mockPrisma.whatsAppConnection.findUnique.mockResolvedValue({ ...CONNECTION, enabled: false });

    const result = await sendWhatsApp(BASE_ARGS, mockPrisma as any);

    expect(result).toEqual({ ok: false, error: "no_enabled_whatsapp_connection" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("refuses to send when the phone is suppressed", async () => {
    mockPrisma.channelSuppression.findUnique.mockResolvedValue({ id: "sup_1" });

    const result = await sendWhatsApp(BASE_ARGS, mockPrisma as any);

    expect(result).toEqual({ ok: false, error: "suppressed" });
    expect(mockPrisma.channelSuppression.findUnique).toHaveBeenCalledWith({
      where: {
        shop_channel_identifier: {
          shop: "shop1.myshopify.com",
          channel: "whatsapp",
          identifier: "+15551234567",
        },
      },
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("POSTs a template message with body params built from templateVarOrder, and never sends the raw plaintext token in a loggable form", async () => {
    const result = await sendWhatsApp(BASE_ARGS, mockPrisma as any);

    expect(result).toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://graph.facebook.com/v21.0/1234567890/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer decrypted-access-token" }),
      }),
    );
    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.template.name).toBe("review_request");
    expect(body.template.components[0].parameters).toEqual([
      { type: "text", text: "Jane" },
      { type: "text", text: "Snowboard" },
      { type: "text", text: "https://shop1.myshopify.com/products/snowboard" },
    ]);
  });

  it("returns ok:false with the response error text when Meta rejects the send", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, text: async () => "invalid template" }) as any;

    const result = await sendWhatsApp(BASE_ARGS, mockPrisma as any);

    expect(result).toEqual({ ok: false, error: "invalid template" });
  });
});
