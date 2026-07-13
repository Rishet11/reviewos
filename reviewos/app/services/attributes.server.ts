import { prisma } from "./db.server";

export async function getAttributeDefinitions(productCategory: string) {
  const defs = await prisma.attributeDefinition.findMany({
    where: { productCategory },
    orderBy: { key: "asc" },
  });

  return defs.map((def) => ({
    ...def,
    options: safeParseArray(def.options),
  }));
}

function safeParseArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
