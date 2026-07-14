import { prisma } from "./db.server";

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
