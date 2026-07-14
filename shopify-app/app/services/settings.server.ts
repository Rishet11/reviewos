import { prisma } from "./db.server";

// Merchant settings as key/value rows (framework-free). Keys are arbitrary
// merchant/app-defined strings; no setting name is hardcoded as behavior here.

export async function getAllSettings() {
  return prisma.settings.findMany({ orderBy: { key: "asc" } });
}

export async function getSetting(key: string) {
  const row = await prisma.settings.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  return prisma.settings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
