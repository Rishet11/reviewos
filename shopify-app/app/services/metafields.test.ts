import { describe, it, expect, vi } from "vitest";
import {
  computeRatingAggregate,
  syncRatingMetafields,
  backfillAllRatingMetafields,
} from "./metafields.server";

function makePrismaMock({
  reviews = [],
  product,
  products,
}: {
  reviews?: { rating: number }[];
  product?: { id: string; shopifyProductId: string | null };
  products?: { id: string; shopifyProductId: string | null }[];
}) {
  return {
    review: {
      findMany: vi.fn().mockResolvedValue(reviews),
    },
    product: {
      findFirst: vi.fn().mockResolvedValue(product ?? null),
      findMany: vi.fn().mockResolvedValue(products ?? []),
    },
  } as unknown as Parameters<typeof computeRatingAggregate>[2];
}

function makeAdminMock(response: unknown) {
  return {
    graphql: vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(response),
    }),
  };
}

describe("computeRatingAggregate", () => {
  it("averages only approved reviews and scopes the query by shop, status, productId", async () => {
    const client = makePrismaMock({ reviews: [{ rating: 5 }, { rating: 3 }, { rating: 4 }] })!;

    const result = await computeRatingAggregate("shop1.myshopify.com", "prod_1", client);

    expect(client.review.findMany).toHaveBeenCalledWith({
      where: { shop: "shop1.myshopify.com", productId: "prod_1", status: "approved" },
      select: { rating: true },
    });
    expect(result).toEqual({ average: 4, count: 3 });
  });

  it("returns zeroed aggregate when there are no approved reviews", async () => {
    const client = makePrismaMock({ reviews: [] });
    const result = await computeRatingAggregate("shop1.myshopify.com", "prod_1", client);
    expect(result).toEqual({ average: 0, count: 0 });
  });
});

describe("syncRatingMetafields", () => {
  it("no-ops when the product has no shopifyProductId", async () => {
    const client = makePrismaMock({ product: { id: "prod_1", shopifyProductId: null } });
    const admin = makeAdminMock({ data: { metafieldsSet: { userErrors: [] } } });

    const result = await syncRatingMetafields("shop1.myshopify.com", "prod_1", admin, client);

    expect(result).toEqual({ skipped: true });
    expect(admin.graphql).not.toHaveBeenCalled();
  });

  it("scopes the product lookup by shop (multi-tenant safety)", async () => {
    const client = makePrismaMock({
      product: { id: "prod_1", shopifyProductId: "gid://shopify/Product/9" },
      reviews: [{ rating: 5 }],
    })!;
    const admin = makeAdminMock({ data: { metafieldsSet: { userErrors: [] } } });

    await syncRatingMetafields("shop1.myshopify.com", "prod_1", admin, client);

    expect(client.product.findFirst).toHaveBeenCalledWith({
      where: { id: "prod_1", shop: "shop1.myshopify.com" },
    });
  });

  it("returns the userErrors when the metafield write is rejected", async () => {
    const client = makePrismaMock({
      product: { id: "prod_1", shopifyProductId: "gid://shopify/Product/123" },
      reviews: [{ rating: 5 }],
    });
    const admin = makeAdminMock({
      data: { metafieldsSet: { userErrors: [{ field: "ownerId", message: "bad GID" }] } },
    });

    const result = await syncRatingMetafields("shop1.myshopify.com", "prod_1", admin, client);

    expect(result).toEqual({
      userErrors: [{ field: "ownerId", message: "bad GID" }],
    });
  });

  it("writes rating and rating_count metafields when a GID is present", async () => {
    const client = makePrismaMock({
      product: { id: "prod_1", shopifyProductId: "gid://shopify/Product/123" },
      reviews: [{ rating: 5 }, { rating: 4 }],
    });
    const admin = makeAdminMock({ data: { metafieldsSet: { userErrors: [] } } });

    const result = await syncRatingMetafields("shop1.myshopify.com", "prod_1", admin, client);

    expect(admin.graphql).toHaveBeenCalledTimes(1);
    const [mutation, options] = admin.graphql.mock.calls[0];
    expect(mutation).toContain("metafieldsSet");
    const metafields = options.variables.metafields as Array<Record<string, unknown>>;

    expect(metafields).toHaveLength(2);

    const ratingField = metafields.find((m) => m.key === "rating");
    expect(ratingField).toMatchObject({
      ownerId: "gid://shopify/Product/123",
      namespace: "reviews",
      key: "rating",
      type: "rating",
    });
    expect(JSON.parse(ratingField!.value as string)).toEqual({
      value: "4.5",
      scale_min: "1",
      scale_max: "5",
    });

    const countField = metafields.find((m) => m.key === "rating_count");
    expect(countField).toMatchObject({
      ownerId: "gid://shopify/Product/123",
      namespace: "reviews",
      key: "rating_count",
      type: "number_integer",
      value: "2",
    });

    expect(result).toEqual({ userErrors: [] });
  });
});

describe("backfillAllRatingMetafields", () => {
  it("skips products without a shopifyProductId and syncs the rest", async () => {
    const client = makePrismaMock({
      products: [
        { id: "prod_1", shopifyProductId: "gid://shopify/Product/1" },
        { id: "prod_2", shopifyProductId: null },
      ],
      reviews: [],
    })!;
    // findFirst used inside syncRatingMetafields per-product; make it resolve
    // based on the id passed in.
    (client.product.findFirst as ReturnType<typeof vi.fn>).mockImplementation(
      ({ where }: { where: { id: string } }) => {
        if (where.id === "prod_1") {
          return Promise.resolve({ id: "prod_1", shopifyProductId: "gid://shopify/Product/1" });
        }
        return Promise.resolve({ id: "prod_2", shopifyProductId: null });
      }
    );

    const admin = makeAdminMock({ data: { metafieldsSet: { userErrors: [] } } });

    const result = await backfillAllRatingMetafields("shop1.myshopify.com", admin, client);

    expect(result).toEqual({ synced: 1, skipped: 1, failed: 0 });
    expect(admin.graphql).toHaveBeenCalledTimes(1);
  });

  it("counts a product as failed (not synced) when the metafield write returns userErrors", async () => {
    const client = makePrismaMock({
      products: [{ id: "prod_1", shopifyProductId: "gid://shopify/Product/1" }],
      reviews: [{ rating: 5 }],
    })!;
    (client.product.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "prod_1",
      shopifyProductId: "gid://shopify/Product/1",
    });
    const admin = makeAdminMock({
      data: { metafieldsSet: { userErrors: [{ message: "missing scope" }] } },
    });

    const result = await backfillAllRatingMetafields("shop1.myshopify.com", admin, client);

    expect(result).toEqual({ synced: 0, skipped: 0, failed: 1 });
  });
});
