import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSettings = {
  getAllSettings: vi.fn(),
  setSetting: vi.fn(),
};

vi.mock("../services/settings.server", () => mockSettings);

vi.mock("../shopify.server", () => ({
  authenticate: {
    admin: vi.fn(async () => ({
      session: { shop: "shop1.myshopify.com" },
    })),
  },
}));

vi.mock("@shopify/shopify-app-react-router/server", () => ({
  boundary: { headers: vi.fn() },
}));

const { loader, action } = await import("./app.settings");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("app.settings loader", () => {
  it("returns settings for the authenticated shop", async () => {
    mockSettings.getAllSettings.mockResolvedValue([
      { id: "1", key: "foo", value: "bar" },
    ]);

    const result = await loader({ request: new Request("https://app.example.com/app/settings") } as any);

    expect(result).toEqual({ settings: [{ id: "1", key: "foo", value: "bar" }] });
    expect(mockSettings.getAllSettings).toHaveBeenCalledWith("shop1.myshopify.com");
  });

  it("handles an empty settings list without crashing", async () => {
    mockSettings.getAllSettings.mockResolvedValue([]);

    const result = await loader({ request: new Request("https://app.example.com/app/settings") } as any);

    expect(result).toEqual({ settings: [] });
  });
});

describe("app.settings action", () => {
  it("saves a key/value pair", async () => {
    mockSettings.setSetting.mockResolvedValue({ id: "1", shop: "shop1.myshopify.com", key: "foo", value: "bar" });
    const form = new FormData();
    form.set("intent", "set-setting");
    form.set("key", "foo");
    form.set("value", "bar");
    const request = new Request("https://app.example.com/app/settings", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({ ok: true });
    expect(mockSettings.setSetting).toHaveBeenCalledWith("shop1.myshopify.com", "foo", "bar");
  });

  it("returns an error when key is missing", async () => {
    const form = new FormData();
    form.set("intent", "set-setting");
    form.set("value", "bar");
    const request = new Request("https://app.example.com/app/settings", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Key is required" });
    expect(mockSettings.setSetting).not.toHaveBeenCalled();
  });

  it("returns an error for an unknown intent", async () => {
    const form = new FormData();
    form.set("intent", "bogus");
    const request = new Request("https://app.example.com/app/settings", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Unknown intent: bogus" });
  });
});
