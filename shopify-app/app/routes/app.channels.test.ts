import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  whatsAppConnection: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    updateMany: vi.fn(),
  },
};

const mockGetPlan = vi.fn();
const mockGetSetting = vi.fn();
const mockSetSetting = vi.fn();
const mockSendWhatsApp = vi.fn();
const mockEncryptSecret = vi.fn((s: string) => `enc(${s})`);
const mockDeriveVerifyToken = vi.fn((shop: string) => `token-for-${shop}`);

vi.mock("../services/db.server", () => ({ prisma: mockPrisma }));
vi.mock("../services/entitlements.server", () => ({ getPlan: mockGetPlan }));
vi.mock("../services/settings.server", () => ({
  getSetting: mockGetSetting,
  setSetting: mockSetSetting,
}));
vi.mock("../services/crypto.server", () => ({
  encryptSecret: mockEncryptSecret,
  deriveVerifyToken: mockDeriveVerifyToken,
}));
vi.mock("../services/channels/whatsapp.server", () => ({ sendWhatsApp: mockSendWhatsApp }));

vi.mock("../shopify.server", () => ({
  authenticate: {
    admin: vi.fn(async () => ({
      session: { shop: "shop1.myshopify.com" },
      billing: { check: vi.fn() },
    })),
  },
}));

vi.mock("@shopify/shopify-app-react-router/server", () => ({
  boundary: { headers: vi.fn() },
}));

const { loader, action } = await import("./app.channels");

const SHOP = "shop1.myshopify.com";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SHOPIFY_APP_URL = "https://app.example.com";
});

describe("app.channels loader", () => {
  it("returns free-plan defaults with no saved connection", async () => {
    mockGetPlan.mockResolvedValue("free");
    mockPrisma.whatsAppConnection.findUnique.mockResolvedValue(null);
    mockGetSetting.mockResolvedValue(null);

    const result = await loader({ request: new Request("https://app.example.com/app/channels") } as any);

    expect(result.plan).toBe("free");
    expect(result.channelPreference).toBe("email");
    expect(result.connection).toBeNull();
    expect(result.webhookUrl).toBe("https://app.example.com/webhooks/whatsapp");
  });

  it("returns pro-plan data with a saved connection, never echoing secrets", async () => {
    mockGetPlan.mockResolvedValue("pro");
    mockPrisma.whatsAppConnection.findUnique.mockResolvedValue({
      phoneNumberId: "123",
      wabaId: "waba_1",
      appId: "app_1",
      templateName: "review_request",
      templateLanguage: "en",
      templateVarOrder: '["customerName"]',
      enabled: true,
      appSecretEnc: "enc(secret)",
      accessTokenEnc: "enc(token)",
    });
    mockGetSetting.mockResolvedValue("whatsapp");

    const result = await loader({ request: new Request("https://app.example.com/app/channels") } as any);

    expect(result.plan).toBe("pro");
    expect(result.channelPreference).toBe("whatsapp");
    expect(result.connection).toEqual(
      expect.objectContaining({ phoneNumberId: "123", hasAppSecret: true, hasAccessToken: true }),
    );
    expect(result.connection).not.toHaveProperty("appSecretEnc");
    expect(result.connection).not.toHaveProperty("accessTokenEnc");
  });
});

function postForm(fields: Record<string, string>) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return new Request("https://app.example.com/app/channels", { method: "POST", body: form });
}

describe("app.channels action - save-connection", () => {
  const validFields = {
    intent: "save-connection",
    phoneNumberId: "123",
    wabaId: "waba_1",
    appId: "app_1",
    appSecret: "s3cr3t",
    accessToken: "tok3n",
    templateName: "review_request",
    templateLanguage: "en",
    templateVarOrder: '["customerName"]',
  };

  it("saves a brand-new connection", async () => {
    mockPrisma.whatsAppConnection.findUnique.mockResolvedValue(null);
    mockPrisma.whatsAppConnection.upsert.mockResolvedValue({});

    const result = await action({ request: postForm(validFields) } as any);

    expect(result).toEqual({ ok: true });
    expect(mockPrisma.whatsAppConnection.upsert).toHaveBeenCalled();
  });

  it("rejects when required fields are missing", async () => {
    const { templateVarOrder, ...rest } = validFields;
    const result = await action({ request: postForm(rest) } as any);

    expect(result).toEqual({ error: "All connection fields are required" });
    expect(mockPrisma.whatsAppConnection.upsert).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON in templateVarOrder", async () => {
    const result = await action({
      request: postForm({ ...validFields, templateVarOrder: "not-json" }),
    } as any);

    expect(result).toEqual({
      error: 'Template variable order must be valid JSON, e.g. ["customerName"]',
    });
  });

  it("rejects a new connection missing appSecret/accessToken", async () => {
    mockPrisma.whatsAppConnection.findUnique.mockResolvedValue(null);
    const { appSecret, accessToken, ...rest } = validFields;

    const result = await action({ request: postForm(rest) } as any);

    expect(result).toEqual({ error: "App secret and access token are required for a new connection" });
  });

  it("allows updating an existing connection without re-entering secrets", async () => {
    mockPrisma.whatsAppConnection.findUnique.mockResolvedValue({ shop: SHOP });
    mockPrisma.whatsAppConnection.upsert.mockResolvedValue({});
    const { appSecret, accessToken, ...rest } = validFields;

    const result = await action({ request: postForm(rest) } as any);

    expect(result).toEqual({ ok: true });
  });
});

describe("app.channels action - set-enabled", () => {
  it("blocks enabling on the free plan", async () => {
    mockGetPlan.mockResolvedValue("free");

    const result = await action({
      request: postForm({ intent: "set-enabled", enabled: "true" }),
    } as any);

    expect(result).toEqual({ error: "WhatsApp is a Pro plan feature" });
    expect(mockPrisma.whatsAppConnection.updateMany).not.toHaveBeenCalled();
  });

  it("allows enabling on the pro plan when a connection exists", async () => {
    mockGetPlan.mockResolvedValue("pro");
    mockPrisma.whatsAppConnection.updateMany.mockResolvedValue({ count: 1 });

    const result = await action({
      request: postForm({ intent: "set-enabled", enabled: "true" }),
    } as any);

    expect(result).toEqual({ ok: true });
  });

  it("errors when trying to enable with no saved connection", async () => {
    mockGetPlan.mockResolvedValue("pro");
    mockPrisma.whatsAppConnection.updateMany.mockResolvedValue({ count: 0 });

    const result = await action({
      request: postForm({ intent: "set-enabled", enabled: "true" }),
    } as any);

    expect(result).toEqual({ error: "Save your WhatsApp connection before enabling it" });
  });

  it("allows disabling regardless of plan", async () => {
    mockPrisma.whatsAppConnection.updateMany.mockResolvedValue({ count: 1 });

    const result = await action({
      request: postForm({ intent: "set-enabled", enabled: "false" }),
    } as any);

    expect(result).toEqual({ ok: true });
    expect(mockGetPlan).not.toHaveBeenCalled();
  });
});

describe("app.channels action - set-preference", () => {
  it("blocks switching to whatsapp on the free plan", async () => {
    mockGetPlan.mockResolvedValue("free");

    const result = await action({
      request: postForm({ intent: "set-preference", channelPreference: "whatsapp" }),
    } as any);

    expect(result).toEqual({ error: "WhatsApp is a Pro plan feature" });
    expect(mockSetSetting).not.toHaveBeenCalled();
  });

  it("allows switching to whatsapp on the pro plan", async () => {
    mockGetPlan.mockResolvedValue("pro");

    const result = await action({
      request: postForm({ intent: "set-preference", channelPreference: "whatsapp" }),
    } as any);

    expect(result).toEqual({ ok: true });
    expect(mockSetSetting).toHaveBeenCalledWith(SHOP, "channelPreference", "whatsapp");
  });

  it("allows setting email preference on the free plan without checking billing", async () => {
    const result = await action({
      request: postForm({ intent: "set-preference", channelPreference: "email" }),
    } as any);

    expect(result).toEqual({ ok: true });
    expect(mockGetPlan).not.toHaveBeenCalled();
  });
});

describe("app.channels action - test-send", () => {
  it("blocks test-send on the free plan", async () => {
    mockGetPlan.mockResolvedValue("free");

    const result = await action({
      request: postForm({ intent: "test-send", testPhone: "+15551234567" }),
    } as any);

    expect(result).toEqual({ error: "WhatsApp is a Pro plan feature" });
    expect(mockSendWhatsApp).not.toHaveBeenCalled();
  });

  it("requires a phone number on the pro plan", async () => {
    mockGetPlan.mockResolvedValue("pro");

    const result = await action({
      request: postForm({ intent: "test-send" }),
    } as any);

    expect(result).toEqual({ error: "Enter a phone number to test" });
    expect(mockSendWhatsApp).not.toHaveBeenCalled();
  });

  it("sends a test message on the pro plan and returns the provider result", async () => {
    mockGetPlan.mockResolvedValue("pro");
    mockSendWhatsApp.mockResolvedValue({ ok: true });

    const result = await action({
      request: postForm({ intent: "test-send", testPhone: "+15551234567" }),
    } as any);

    expect(result).toEqual({ testResult: { ok: true } });
    expect(mockSendWhatsApp).toHaveBeenCalledWith(
      expect.objectContaining({ shop: SHOP, to: "+15551234567" }),
    );
  });

  it("surfaces a provider failure without throwing", async () => {
    mockGetPlan.mockResolvedValue("pro");
    mockSendWhatsApp.mockResolvedValue({ ok: false, error: "no_enabled_whatsapp_connection" });

    const result = await action({
      request: postForm({ intent: "test-send", testPhone: "+15551234567" }),
    } as any);

    expect(result).toEqual({ testResult: { ok: false, error: "no_enabled_whatsapp_connection" } });
  });
});

describe("app.channels action - unknown intent", () => {
  it("returns an error for an unrecognized intent", async () => {
    const result = await action({ request: postForm({ intent: "bogus" }) } as any);

    expect(result).toEqual({ error: "Unknown intent: bogus" });
  });
});
