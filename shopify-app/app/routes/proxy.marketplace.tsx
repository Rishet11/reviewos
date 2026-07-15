import type { LoaderFunctionArgs } from "react-router";
import { requireProxy } from "../lib/proxy-verify.server";
import { getMarketplaceStats } from "../services/marketplace.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { shop } = requireProxy(request);

  const url = new URL(request.url);
  const productSlug = url.searchParams.get("product");
  if (!productSlug) {
    return Response.json({ error: "product param required" }, { status: 400 });
  }

  const stats = await getMarketplaceStats(shop, productSlug);

  return Response.json(
    { stats },
    { headers: { "Content-Type": "application/json" } }
  );
}
