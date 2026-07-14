import type { LoaderFunctionArgs } from "react-router";
import { requireProxy } from "../lib/proxy-verify.server";
import { getRatingSummary } from "../services/reviews.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { shop } = requireProxy(request);

  const url = new URL(request.url);
  const productSlug = url.searchParams.get("product");

  if (!productSlug) {
    return Response.json({ error: "product param required" }, { status: 400 });
  }

  const distribution = await getRatingSummary(shop, productSlug);
  return Response.json(
    { distribution },
    { headers: { "Content-Type": "application/json" } }
  );
}
