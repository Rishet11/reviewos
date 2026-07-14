import { prisma } from "./db.server";

const PRODUCTS_PAGE_QUERY = `#graphql
  query ProductsPage($cursor: String) {
    products(first: 250, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        handle
        title
        productType
        featuredImage {
          url
        }
        variants(first: 1) {
          nodes {
            price
          }
        }
      }
    }
  }
`;

const PRODUCT_BY_HANDLE_QUERY = `#graphql
  query ProductByHandle($query: String!) {
    products(first: 1, query: $query) {
      nodes {
        id
        handle
        title
        productType
        featuredImage {
          url
        }
        variants(first: 1) {
          nodes {
            price
          }
        }
      }
    }
  }
`;

type CatalogNode = {
  id: string;
  handle: string;
  title: string;
  productType: string | null;
  featuredImage: { url: string } | null;
  variants: { nodes: { price: string }[] };
};

function toProductData(node: CatalogNode) {
  const price = node.variants.nodes[0]?.price;
  return {
    name: node.title,
    category: node.productType || "",
    imageUrl: node.featuredImage?.url ?? "",
    price: Math.round(parseFloat(price || "0") * 100),
    shopifyProductId: node.id,
  };
}

export async function syncProductsFromCatalog(
  shop: string,
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> }
): Promise<{ created: number; updated: number; total: number }> {
  let created = 0;
  let updated = 0;
  let total = 0;
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await admin.graphql(PRODUCTS_PAGE_QUERY, {
      variables: { cursor },
    });
    const json = await response.json();
    const products = json.data.products;

    for (const node of products.nodes as CatalogNode[]) {
      const existing = await prisma.product.findUnique({
        where: { shop_slug: { shop, slug: node.handle } },
      });

      const data = toProductData(node);

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data,
        });
        updated += 1;
      } else {
        await prisma.product.create({
          data: {
            shop,
            slug: node.handle,
            description: "",
            ...data,
          },
        });
        created += 1;
      }
      total += 1;
    }

    hasNextPage = products.pageInfo.hasNextPage;
    cursor = products.pageInfo.endCursor;
  }

  return { created, updated, total };
}

export async function resolveProductForShop(shop: string, handle: string) {
  const existing = await prisma.product.findUnique({
    where: { shop_slug: { shop, slug: handle } },
  });
  if (existing) return existing;

  let enriched: ReturnType<typeof toProductData> | null = null;
  try {
    // Lazy import: keeps shopifyApp() init (needs full app env) out of the
    // proxy/services import graph so unit tests can import proxy routes
    // without Shopify env, and proxy cold starts don't pay for it on cache hits.
    const { unauthenticated } = await import("../shopify.server");
    const { admin } = await unauthenticated.admin(shop);
    const response = await admin.graphql(PRODUCT_BY_HANDLE_QUERY, {
      variables: { query: `handle:${handle}` },
    });
    const json = await response.json();
    const node = json.data?.products?.nodes?.[0] as CatalogNode | undefined;
    if (node) {
      enriched = toProductData(node);
    }
  } catch {
    enriched = null;
  }

  try {
    return await prisma.product.create({
      data: enriched
        ? { shop, slug: handle, description: "", ...enriched }
        : {
            shop,
            slug: handle,
            name: handle,
            category: "",
            description: "",
            price: 0,
            imageUrl: "",
            shopifyProductId: null,
          },
    });
  } catch (err) {
    // Concurrent first hit for the same new handle: another request won the
    // create and tripped the (shop, slug) unique. Re-read and return that row.
    if (
      err &&
      typeof err === "object" &&
      (err as { code?: string }).code === "P2002"
    ) {
      const row = await prisma.product.findUnique({
        where: { shop_slug: { shop, slug: handle } },
      });
      if (row) return row;
    }
    throw err;
  }
}
