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

// ---- Admin attribute manager (merchant-facing, framework-free) ----
// Category-agnostic: productCategory / key / label / options are all merchant
// input, never hardcoded. options is stored as a JSON string array.

export type AttributeDefinitionInput = {
  productCategory: string;
  key: string;
  label: string;
  options: string[];
  display?: boolean;
};

export async function listAttributeDefinitions() {
  const defs = await prisma.attributeDefinition.findMany({
    orderBy: [{ productCategory: "asc" }, { key: "asc" }],
  });
  return defs.map((def) => ({ ...def, options: safeParseArray(def.options) }));
}

export async function createAttributeDefinition(input: AttributeDefinitionInput) {
  return prisma.attributeDefinition.create({
    data: {
      productCategory: input.productCategory.trim(),
      key: input.key.trim(),
      label: input.label.trim(),
      options: JSON.stringify(input.options),
      display: input.display ?? true,
    },
  });
}

export async function updateAttributeDefinition(
  id: string,
  patch: Partial<AttributeDefinitionInput>
) {
  const data: {
    productCategory?: string;
    key?: string;
    label?: string;
    options?: string;
    display?: boolean;
  } = {};
  if (patch.productCategory !== undefined) data.productCategory = patch.productCategory.trim();
  if (patch.key !== undefined) data.key = patch.key.trim();
  if (patch.label !== undefined) data.label = patch.label.trim();
  if (patch.options !== undefined) data.options = JSON.stringify(patch.options);
  if (patch.display !== undefined) data.display = patch.display;
  return prisma.attributeDefinition.update({ where: { id }, data });
}

export async function deleteAttributeDefinition(id: string) {
  return prisma.attributeDefinition.delete({ where: { id } });
}
