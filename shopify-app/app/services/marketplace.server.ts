import { prisma } from "./db.server";
import { resolveProductForShop } from "./products.server";

export async function listSources(shop: string) {
  return prisma.marketplaceSource.findMany({
    where: { shop },
    orderBy: { name: "asc" },
  });
}

export async function upsertSource(
  shop: string,
  data: { name: string; logoUrl: string; baseUrl: string }
) {
  return prisma.marketplaceSource.upsert({
    where: { shop_name: { shop, name: data.name } },
    update: { logoUrl: data.logoUrl, baseUrl: data.baseUrl },
    create: { shop, name: data.name, logoUrl: data.logoUrl, baseUrl: data.baseUrl },
  });
}

export async function deleteSource(shop: string, id: string) {
  return prisma.marketplaceSource.deleteMany({ where: { id, shop } });
}

export async function upsertStat(
  shop: string,
  data: {
    productSlug: string;
    sourceId: string;
    rating: number;
    reviewCount: number;
    url: string;
  }
) {
  const source = await prisma.marketplaceSource.findFirst({
    where: { id: data.sourceId, shop },
  });
  if (!source) {
    throw new Error(`Marketplace source ${data.sourceId} not found for shop`);
  }

  const product = await resolveProductForShop(shop, data.productSlug);

  return prisma.marketplaceStat.upsert({
    where: {
      shop_productId_sourceId: { shop, productId: product.id, sourceId: data.sourceId },
    },
    update: { rating: data.rating, reviewCount: data.reviewCount, url: data.url },
    create: {
      shop,
      productId: product.id,
      sourceId: data.sourceId,
      rating: data.rating,
      reviewCount: data.reviewCount,
      url: data.url,
    },
  });
}

export async function deleteStat(shop: string, id: string) {
  return prisma.marketplaceStat.deleteMany({ where: { id, shop } });
}

export async function getMarketplaceStats(shop: string, productSlug: string) {
  const product = await prisma.product.findUnique({
    where: { shop_slug: { shop, slug: productSlug } },
  });

  if (!product) {
    return [];
  }

  const stats = await prisma.marketplaceStat.findMany({
    where: { shop, productId: product.id },
    include: { source: true },
  });

  return stats.map((stat) => ({
    id: stat.id,
    rating: stat.rating,
    reviewCount: stat.reviewCount,
    url: stat.url,
    source: {
      name: stat.source.name,
      logoUrl: stat.source.logoUrl,
      baseUrl: stat.source.baseUrl,
    },
  }));
}
