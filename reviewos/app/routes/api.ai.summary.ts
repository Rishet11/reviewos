import { prisma } from "~/services/db.server";
import { getOrGenerateSummary } from "~/services/ai/summaries.server";

const KNOWN_PARAMS = new Set(["product", "rating", "sort", "page", "pageSize", "status"]);

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const productSlug = params.get("product");
  if (!productSlug) {
    return Response.json({ error: "product param required" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { slug: productSlug } });
  if (!product) {
    return Response.json({ error: "product_not_found" }, { status: 404 });
  }

  const filters: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (!KNOWN_PARAMS.has(key)) filters[key] = value;
  }

  const scope = Object.keys(filters).length > 0 ? "cohort" : "overall";
  const summary = await getOrGenerateSummary(product.id, scope, filters);

  return Response.json({ summary });
}
