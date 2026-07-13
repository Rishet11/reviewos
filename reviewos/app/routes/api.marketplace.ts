import { getMarketplaceStats } from "~/services/marketplace.server";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const productSlug = url.searchParams.get("product");

  if (!productSlug) {
    return Response.json({ error: "product param required" }, { status: 400 });
  }

  const stats = await getMarketplaceStats(productSlug);
  return Response.json({ stats });
}
