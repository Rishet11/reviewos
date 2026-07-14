// Integration test: exercises each App Proxy route loader directly with a
// signed URL built exactly the way the widget's mount.ts builds queries
// (same param names: product=<slug>, shop, path_prefix, timestamp,
// signature). Asserts response keys match what widget/src/shopify/api.ts
// destructures, so a contract break between the two sides fails here
// instead of at runtime in a theme.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeProxySignature } from "./proxy-verify.server";

const FAKE_SECRET = "test-shared-secret";
const SHOP = "test-shop.myshopify.com";

const product = {
  id: "prod_1",
  shop: SHOP,
  slug: "widget-x",
  name: "Widget X",
  category: "widgets",
  description: "",
  price: 100,
  imageUrl: "",
};

const reviews = [
  {
    rating: 5,
    title: "Great",
    body: "Loved it",
    status: "approved",
    productId: "prod_1",
    shop: SHOP,
    createdAt: new Date("2024-01-01"),
    helpfulCount: 0,
    attributes: "{}",
  },
  {
    rating: 3,
    title: "Ok",
    body: "Meh",
    status: "approved",
    productId: "prod_1",
    shop: SHOP,
    createdAt: new Date("2024-01-02"),
    helpfulCount: 0,
    attributes: "{}",
  },
];

const attributeDefs = [
  {
    id: "attr_1",
    shop: SHOP,
    productCategory: "widgets",
    key: "color",
    label: "Color",
    options: JSON.stringify(["red", "blue"]),
    display: true,
  },
];

vi.mock("../services/db.server", () => ({
  prisma: {
    product: {
      findUnique: vi.fn(async ({ where }: any) => {
        const slug = where.shop_slug.slug;
        return slug === product.slug ? product : null;
      }),
      findFirst: vi.fn(async () => product),
    },
    review: {
      findMany: vi.fn(async () => reviews.map((r) => ({ ...r, media: [] }))),
    },
    attributeDefinition: {
      findMany: vi.fn(async ({ where }: any) => {
        return where.productCategory === product.category ? attributeDefs : [];
      }),
    },
    aiSummary: {
      findUnique: vi.fn(async () => null),
      upsert: vi.fn(async () => null),
    },
  },
  default: {},
}));

function buildSignedUrl(path: string, params: Record<string, string>): string {
  const search = new URLSearchParams({
    shop: SHOP,
    path_prefix: "/apps/reviewos",
    timestamp: "1700000000",
    ...params,
  });
  const signature = computeProxySignature(search, FAKE_SECRET);
  search.set("signature", signature);
  return `https://example.com${path}?${search.toString()}`;
}

describe("proxy route contracts (mirrors widget/src/shopify/api.ts)", () => {
  beforeEach(() => {
    process.env.SHOPIFY_API_SECRET = FAKE_SECRET;
    vi.stubEnv("AI_PROVIDER", "none");
  });

  afterEach(() => {
    delete process.env.SHOPIFY_API_SECRET;
    vi.unstubAllEnvs();
  });

  it("GET /reviews returns { reviews, total, page, pageSize } for product=<slug>", async () => {
    const { loader } = await import("../routes/proxy.reviews");
    const url = buildSignedUrl("/proxy/reviews", { product: product.slug, sort: "recent", page: "1", pageSize: "10" });
    const res = await loader({ request: new Request(url), params: {}, context: {} } as any);
    const data = await res.json();

    expect(data).toHaveProperty("reviews");
    expect(data).toHaveProperty("total");
    expect(data).toHaveProperty("page");
    expect(data).toHaveProperty("pageSize");
    expect(Array.isArray(data.reviews)).toBe(true);
  });

  it("GET /distribution returns { distribution: { average, count, byStar } } for product=<slug>", async () => {
    const { loader } = await import("../routes/proxy.distribution");
    const url = buildSignedUrl("/proxy/distribution", { product: product.slug });
    const res = await loader({ request: new Request(url), params: {}, context: {} } as any);
    const data = await res.json();

    expect(data).toHaveProperty("distribution");
    expect(data.distribution).toHaveProperty("average");
    expect(data.distribution).toHaveProperty("count");
    expect(data.distribution).toHaveProperty("byStar");
    expect(data.distribution.count).toBe(2);
  });

  it("GET /attributes?product=<slug> resolves category from the product and returns { attributes }", async () => {
    const { loader } = await import("../routes/proxy.attributes");
    const url = buildSignedUrl("/proxy/attributes", { product: product.slug });
    const res = await loader({ request: new Request(url), params: {}, context: {} } as any);
    const data = await res.json();

    expect(data).toHaveProperty("attributes");
    expect(Array.isArray(data.attributes)).toBe(true);
    expect(data.attributes[0]).toMatchObject({ key: "color", label: "Color" });
  });

  it("GET /attributes 400s when neither product nor category is given", async () => {
    const { loader } = await import("../routes/proxy.attributes");
    const url = buildSignedUrl("/proxy/attributes", {});
    const res = await loader({ request: new Request(url), params: {}, context: {} } as any);
    expect(res.status).toBe(400);
  });

  it("GET /summary returns { summary } (PublicAiSummary or null) for product=<slug>", async () => {
    const { loader } = await import("../routes/proxy.summary");
    const url = buildSignedUrl("/proxy/summary", { product: product.slug });
    const res = await loader({ request: new Request(url), params: {}, context: {} } as any);
    const data = await res.json();

    expect(data).toHaveProperty("summary");
    // Fewer than MIN_REVIEWS_TO_GENERATE (3) reviews in the fixture -> null,
    // which is the shape api.ts's fetchSummary must handle.
    expect(data.summary).toBeNull();
  });
});
