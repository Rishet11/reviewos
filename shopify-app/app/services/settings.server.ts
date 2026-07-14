import { prisma } from "./db.server";

// Merchant settings as key/value rows (framework-free). Keys are arbitrary
// merchant/app-defined strings; no setting name is hardcoded as behavior here.

export async function getAllSettings(shop: string) {
  return prisma.settings.findMany({ where: { shop }, orderBy: { key: "asc" } });
}

export async function getSetting(shop: string, key: string) {
  const row = await prisma.settings.findUnique({ where: { shop_key: { shop, key } } });
  return row?.value ?? null;
}

export async function setSetting(shop: string, key: string, value: string) {
  return prisma.settings.upsert({
    where: { shop_key: { shop, key } },
    update: { value },
    create: { shop, key, value },
  });
}
