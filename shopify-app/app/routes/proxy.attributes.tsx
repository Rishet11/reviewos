import type { LoaderFunctionArgs } from "react-router";
import { requireProxy } from "../lib/proxy-verify.server";
import { getAttributeDefinitions } from "../services/attributes.server";
import { resolveProductForShop } from "../services/products.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { shop } = requireProxy(request);

  const url = new URL(request.url);
  const productSlug = url.searchParams.get("product");
  let category = url.searchParams.get("category");

  if (!category && !productSlug) {
    return Response.json(
      { error: "product_or_category_required" },
      { status: 400 }
    );
  }

  if (!category && productSlug) {
    const product = await resolveProductForShop(shop, productSlug);
    category = product.category;
  }

  const attributes = await getAttributeDefinitions(shop, category!);
  return Response.json(
    { attributes },
    { headers: { "Content-Type": "application/json" } }
  );
}
