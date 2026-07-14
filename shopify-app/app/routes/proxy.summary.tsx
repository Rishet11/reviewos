import type { LoaderFunctionArgs } from "react-router";
import { requireProxy } from "../lib/proxy-verify.server";
import { resolveProductForShop } from "../services/products.server";
import { getOrGenerateSummary } from "../services/ai/summaries.server";

const KNOWN_PARAMS = new Set([
  "product",
  "rating",
  "sort",
  "page",
  "pageSize",
  "status",
  "shop",
  "path_prefix",
  "timestamp",
  "signature",
  "logged_in_customer_id",
]);

export async function loader({ request }: LoaderFunctionArgs) {
  const { shop } = requireProxy(request);

  const url = new URL(request.url);
  const params = url.searchParams;

  const productSlug = params.get("product");
  if (!productSlug) {
    return Response.json({ error: "product param required" }, { status: 400 });
  }

  const product = await resolveProductForShop(shop, productSlug);

  const filters: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (!KNOWN_PARAMS.has(key)) filters[key] = value;
  }

  const scope = Object.keys(filters).length > 0 ? "cohort" : "overall";
  const summary = await getOrGenerateSummary(shop, product.id, scope, filters);

  return Response.json(
    { summary },
    { headers: { "Content-Type": "application/json" } }
  );
}
