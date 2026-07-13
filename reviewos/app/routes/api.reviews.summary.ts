import { getRatingSummary } from "~/services/reviews.server";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const productSlug = url.searchParams.get("product");

  if (!productSlug) {
    return Response.json({ error: "product param required" }, { status: 400 });
  }

  const summary = await getRatingSummary(productSlug);
  return Response.json({ summary });
}
