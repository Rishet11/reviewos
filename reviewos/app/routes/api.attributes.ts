import { getAttributeDefinitions } from "~/services/attributes.server";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");

  if (!category) {
    return Response.json({ error: "category param required" }, { status: 400 });
  }

  const attributes = await getAttributeDefinitions(category);
  return Response.json({ attributes });
}
