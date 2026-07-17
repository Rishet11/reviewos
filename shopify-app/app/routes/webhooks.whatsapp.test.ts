import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";

const mockPrisma = {
  whatsAppConnection: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  channelSuppression: {
    upsert: vi.fn(),
  },
};

vi.mock("../services/db.server", () => ({ prisma: mockPrisma }));

process.env.SECRETS_KEY = "0521a0156ea36edded0c39e7af8607bce5f27f8184cb567f490818d3d66d31fa";

const { loader, action } = await import("./webhooks.whatsapp");
const { deriveVerifyToken } = await import("../services/crypto.server");

const SHOP = "shop1.myshopify.com";
const APP_SECRET = "meta-app-secret";

const CONNECTION = {
  shop: SHOP,
  wabaId: "waba_1",
  appSecretEnc: (await import("../services/crypto.server")).encryptSecret(APP_SECRET),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.whatsAppConnection.findMany.mockResolvedValue([{ shop: SHOP }]);
  mockPrisma.whatsAppConnection.findFirst.mockResolvedValue(CONNECTION);
});

function sign(body: string, secret: string) {
  return "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
}

describe("GET handshake", () => {
  it("echoes hub.challenge when hub.verify_token matches this shop's derived token", async () => {
    const token = deriveVerifyToken(SHOP);
    const url = `https://app.example.com/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${token}&hub.challenge=123abc`;

    const response = await loader({ request: new Request(url) } as any);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("123abc");
  });

  it("rejects when hub.verify_token matches no connected shop", async () => {
    const url =
      "https://app.example.com/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123abc";

    const response = await loader({ request: new Request(url) } as any);

    expect(response.status).toBe(403);
  });
});

describe("POST inbound events", () => {
  it("returns 404 for an unknown wabaId", async () => {
    mockPrisma.whatsAppConnection.findFirst.mockResolvedValue(null);
    const body = JSON.stringify({ entry: [{ id: "unknown_waba" }] });

    const request = new Request("https://app.example.com/webhooks/whatsapp", {
      method: "POST",
      body,
      headers: { "x-hub-signature-256": sign(body, APP_SECRET) },
    });

    const response = await action({ request } as any);

    expect(response.status).toBe(404);
  });

  it("rejects a tampered body (signature mismatch)", async () => {
    const body = JSON.stringify({ entry: [{ id: "waba_1" }] });
    const request = new Request("https://app.example.com/webhooks/whatsapp", {
      method: "POST",
      body,
      headers: { "x-hub-signature-256": sign("different-body", APP_SECRET) },
    });

    const response = await action({ request } as any);

    expect(response.status).toBe(401);
  });

  it("accepts a validly-signed body and creates a ChannelSuppression on STOP", async () => {
    const body = JSON.stringify({
      entry: [
        {
          id: "waba_1",
          changes: [
            { value: { messages: [{ from: "+15551234567", text: { body: "STOP" } }] } },
          ],
        },
      ],
    });
    const request = new Request("https://app.example.com/webhooks/whatsapp", {
      method: "POST",
      body,
      headers: { "x-hub-signature-256": sign(body, APP_SECRET) },
    });

    const response = await action({ request } as any);

    expect(response.status).toBe(200);
    expect(mockPrisma.channelSuppression.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          shop_channel_identifier: {
            shop: SHOP,
            channel: "whatsapp",
            identifier: "+15551234567",
          },
        },
        create: expect.objectContaining({
          shop: SHOP,
          channel: "whatsapp",
          identifier: "+15551234567",
          reason: "user_stop",
        }),
      }),
    );
  });

  it("does not suppress on an ordinary (non-STOP) message", async () => {
    const body = JSON.stringify({
      entry: [
        {
          id: "waba_1",
          changes: [
            { value: { messages: [{ from: "+15551234567", text: { body: "Great product!" } }] } },
          ],
        },
      ],
    });
    const request = new Request("https://app.example.com/webhooks/whatsapp", {
      method: "POST",
      body,
      headers: { "x-hub-signature-256": sign(body, APP_SECRET) },
    });

    const response = await action({ request } as any);

    expect(response.status).toBe(200);
    expect(mockPrisma.channelSuppression.upsert).not.toHaveBeenCalled();
  });
});
