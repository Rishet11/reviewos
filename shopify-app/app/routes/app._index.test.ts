import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGraphql = vi.fn();

vi.mock("../shopify.server", () => ({
  authenticate: {
    admin: vi.fn(async () => ({
      session: { shop: "shop1.myshopify.com" },
      admin: { graphql: mockGraphql },
    })),
  },
}));

vi.mock("@shopify/shopify-app-react-router/server", () => ({
  boundary: { headers: vi.fn() },
}));

const { loader, action } = await import("./app._index");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("app._index loader", () => {
  it("authenticates and returns null", async () => {
    const result = await loader({ request: new Request("https://app.example.com/app") } as any);
    expect(result).toBeNull();
  });
});

describe("app._index action", () => {
  it("creates a product, updates its variant, and upserts a metaobject on the happy path", async () => {
    mockGraphql
      .mockResolvedValueOnce({
        json: async () => ({
          data: {
            productCreate: {
              product: {
                id: "gid://shopify/Product/1",
                title: "Red Snowboard",
                handle: "red-snowboard",
                status: "ACTIVE",
                variants: { edges: [{ node: { id: "gid://shopify/ProductVariant/1" } }] },
              },
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          data: {
            productVariantsBulkUpdate: {
              productVariants: [{ id: "gid://shopify/ProductVariant/1", price: "100.00" }],
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          data: {
            metaobjectUpsert: {
              metaobject: { id: "gid://shopify/Metaobject/1", handle: "demo-entry", values: [] },
              userErrors: [],
            },
          },
        }),
      });

    const request = new Request("https://app.example.com/app", { method: "POST" });
    const result = await action({ request } as any);

    expect(result.product.id).toBe("gid://shopify/Product/1");
    expect(result.variant).toEqual([{ id: "gid://shopify/ProductVariant/1", price: "100.00" }]);
    expect(result.metaobject).toEqual({ id: "gid://shopify/Metaobject/1", handle: "demo-entry", values: [] });
    expect(mockGraphql).toHaveBeenCalledTimes(3);
  });

  it("returns a clean error instead of throwing when the GraphQL response has no data", async () => {
    mockGraphql.mockResolvedValueOnce({ json: async () => ({ data: null }) });

    const request = new Request("https://app.example.com/app", { method: "POST" });
    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Could not create product" });
    expect(mockGraphql).toHaveBeenCalledTimes(1);
  });

  it("returns a clean error instead of throwing when productCreate has userErrors and no product", async () => {
    mockGraphql.mockResolvedValueOnce({
      json: async () => ({
        data: {
          productCreate: {
            product: null,
            userErrors: [{ field: ["title"], message: "Title can't be blank" }],
          },
        },
      }),
    });

    const request = new Request("https://app.example.com/app", { method: "POST" });
    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Could not create product" });
    expect(mockGraphql).toHaveBeenCalledTimes(1);
  });
});
