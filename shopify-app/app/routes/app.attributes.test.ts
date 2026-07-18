import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  product: {
    findMany: vi.fn(),
  },
};

vi.mock("../services/db.server", () => ({ prisma: mockPrisma }));

const mockAttributes = {
  createAttributeDefinition: vi.fn(),
  deleteAttributeDefinition: vi.fn(),
  listAttributeDefinitions: vi.fn(),
  updateAttributeDefinition: vi.fn(),
};

vi.mock("../services/attributes.server", () => mockAttributes);

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

const { loader, action } = await import("./app.attributes");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("app.attributes loader", () => {
  it("returns definitions and distinct categories", async () => {
    mockAttributes.listAttributeDefinitions.mockResolvedValue([
      { id: "1", productCategory: "apparel", key: "fit", label: "Fit", options: ["Small"], display: true },
    ]);
    mockPrisma.product.findMany.mockResolvedValue([{ category: "apparel" }, { category: "shoes" }]);

    const result = await loader({ request: new Request("https://app.example.com/app/attributes") } as any);

    expect(result.categories).toEqual(["apparel", "shoes"]);
    expect(result.definitions).toHaveLength(1);
  });

  it("handles no attributes and no products without crashing", async () => {
    mockAttributes.listAttributeDefinitions.mockResolvedValue([]);
    mockPrisma.product.findMany.mockResolvedValue([]);

    const result = await loader({ request: new Request("https://app.example.com/app/attributes") } as any);

    expect(result).toEqual({ definitions: [], categories: [] });
  });
});

describe("app.attributes action - attr-create", () => {
  it("creates an attribute with parsed options", async () => {
    mockAttributes.createAttributeDefinition.mockResolvedValue({ id: "1" });
    const form = new FormData();
    form.set("intent", "attr-create");
    form.set("productCategory", "apparel");
    form.set("key", "fit");
    form.set("label", "Fit");
    form.set("options", "Runs small\nTrue to size,Runs large");
    form.set("display", "on");
    const request = new Request("https://app.example.com/app/attributes", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({ ok: true });
    expect(mockAttributes.createAttributeDefinition).toHaveBeenCalledWith("shop1.myshopify.com", {
      productCategory: "apparel",
      key: "fit",
      label: "Fit",
      options: ["Runs small", "True to size", "Runs large"],
      display: true,
    });
  });

  it("returns a validation error when required fields are missing", async () => {
    const form = new FormData();
    form.set("intent", "attr-create");
    form.set("productCategory", "apparel");
    const request = new Request("https://app.example.com/app/attributes", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Category, key, and label are required" });
    expect(mockAttributes.createAttributeDefinition).not.toHaveBeenCalled();
  });

  it("returns a friendly error on a unique-constraint violation", async () => {
    mockAttributes.createAttributeDefinition.mockRejectedValue({ code: "P2002" });
    const form = new FormData();
    form.set("intent", "attr-create");
    form.set("productCategory", "apparel");
    form.set("key", "fit");
    form.set("label", "Fit");
    const request = new Request("https://app.example.com/app/attributes", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({
      error: 'An attribute "fit" already exists for category "apparel"',
    });
  });

  it("rethrows a non-unique-constraint error", async () => {
    mockAttributes.createAttributeDefinition.mockRejectedValue(new Error("db down"));
    const form = new FormData();
    form.set("intent", "attr-create");
    form.set("productCategory", "apparel");
    form.set("key", "fit");
    form.set("label", "Fit");
    const request = new Request("https://app.example.com/app/attributes", { method: "POST", body: form });

    await expect(action({ request } as any)).rejects.toThrow("db down");
  });
});

describe("app.attributes action - attr-update", () => {
  it("updates an existing attribute", async () => {
    mockAttributes.updateAttributeDefinition.mockResolvedValue({ id: "1" });
    const form = new FormData();
    form.set("intent", "attr-update");
    form.set("id", "1");
    form.set("productCategory", "apparel");
    form.set("key", "fit");
    form.set("label", "Fit");
    const request = new Request("https://app.example.com/app/attributes", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({ ok: true });
  });

  it("returns an error when the attribute does not exist", async () => {
    mockAttributes.updateAttributeDefinition.mockResolvedValue(null);
    const form = new FormData();
    form.set("intent", "attr-update");
    form.set("id", "missing");
    form.set("productCategory", "apparel");
    form.set("key", "fit");
    form.set("label", "Fit");
    const request = new Request("https://app.example.com/app/attributes", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Attribute not found" });
  });
});

describe("app.attributes action - attr-delete", () => {
  it("deletes an existing attribute", async () => {
    mockAttributes.deleteAttributeDefinition.mockResolvedValue(true);
    const form = new FormData();
    form.set("intent", "attr-delete");
    form.set("id", "1");
    const request = new Request("https://app.example.com/app/attributes", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({ ok: true });
  });

  it("returns an error when the attribute does not exist", async () => {
    mockAttributes.deleteAttributeDefinition.mockResolvedValue(false);
    const form = new FormData();
    form.set("intent", "attr-delete");
    form.set("id", "missing");
    const request = new Request("https://app.example.com/app/attributes", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Attribute not found" });
  });

  it("returns an error for an unknown intent", async () => {
    const form = new FormData();
    form.set("intent", "bogus");
    const request = new Request("https://app.example.com/app/attributes", { method: "POST", body: form });

    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Unknown intent: bogus" });
  });
});
