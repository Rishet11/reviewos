import { prisma } from "~/services/db.server";

export async function loader({ params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
  });

  if (!product) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json({ product });
}
