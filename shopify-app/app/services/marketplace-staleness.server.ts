// Slice 4: marketplace rating staleness engine. Numbers-only: this module
// never reads or sends review body text, only rating/reviewCount/timestamps.

import { prisma } from "./db.server";
import { sendEmail } from "./email/resend.server";

type PrismaClientLike = typeof prisma;

const DEFAULT_THRESHOLD_DAYS = 7;
const NOTIFIED_AT_KEY = "marketplaceStalenessNotifiedAt";
const NOTIFY_INTERVAL_MS = 3 * 86_400_000;

export async function findStaleStats(
  shop?: string,
  thresholdDays = DEFAULT_THRESHOLD_DAYS,
  client: PrismaClientLike = prisma,
) {
  const cutoff = new Date(Date.now() - thresholdDays * 86_400_000);
  // Staleness filter runs in the database so a cron-wide sweep never loads
  // every shop's stats into memory.
  return client.marketplaceStat.findMany({
    where: {
      ...(shop ? { shop } : {}),
      OR: [
        { lastCheckedAt: { lt: cutoff } },
        { lastCheckedAt: null, updatedAt: { lt: cutoff } },
      ],
    },
    include: { source: true, product: { select: { slug: true, name: true } } },
  });
}

// Best-effort merchant contact resolution: no dedicated shop-contact model
// exists in this schema. Session rows are populated with `email` only for
// online (per-user) OAuth sessions, so this may find nothing for shops that
// have only an offline token - callers must handle `null` by skipping.
async function resolveShopContactEmail(
  shop: string,
  client: PrismaClientLike = prisma,
): Promise<string | null> {
  const session = await client.session.findFirst({
    where: { shop, email: { not: null } },
  });
  return session?.email ?? null;
}

export async function runStalenessSweep(
  options: {
    thresholdDays?: number;
    isProLookup?: (shop: string) => Promise<boolean>;
    client?: PrismaClientLike;
    appUrl?: string;
  } = {},
) {
  const thresholdDays = options.thresholdDays ?? DEFAULT_THRESHOLD_DAYS;
  const client = options.client ?? prisma;
  const appUrl = options.appUrl ?? process.env.SHOPIFY_APP_URL ?? "";

  const staleStats = await findStaleStats(undefined, thresholdDays, client);

  const byShop = new Map<string, typeof staleStats>();
  for (const stat of staleStats) {
    const list = byShop.get(stat.shop) ?? [];
    list.push(stat);
    byShop.set(stat.shop, list);
  }

  let emailsSent = 0;
  let emailsSkipped = 0;

  for (const [shop, stats] of byShop) {
    if (options.isProLookup && !(await options.isProLookup(shop))) {
      continue;
    }

    // Idempotency guard: a cron re-run or overlap must not re-send the same
    // digest. Tracked per shop in the generic Settings key/value store.
    const lastNotifiedRow = await client.settings.findUnique({
      where: { shop_key: { shop, key: NOTIFIED_AT_KEY } },
    });
    if (
      lastNotifiedRow?.value &&
      Date.now() - new Date(lastNotifiedRow.value).getTime() < NOTIFY_INTERVAL_MS
    ) {
      emailsSkipped++;
      continue;
    }

    const contactEmail = await resolveShopContactEmail(shop, client);
    if (!contactEmail) {
      console.log(`[marketplace-staleness] no contact email for ${shop}, skipping digest`);
      emailsSkipped++;
      continue;
    }

    const deepLinkUrl = `${appUrl}/app/marketplace`;
    const lines = stats.map(
      (stat) => `- ${stat.product.name} (${stat.product.slug}) on ${stat.source.name}`,
    );
    const text = `${stats.length} marketplace stat(s) are stale (older than ${thresholdDays} days):\n\n${lines.join(
      "\n",
    )}\n\nUpdate them: ${deepLinkUrl}`;
    const html = `<p>${stats.length} marketplace stat(s) are stale (older than ${thresholdDays} days):</p><ul>${stats
      .map((stat) => `<li>${stat.product.name} (${stat.product.slug}) on ${stat.source.name}</li>`)
      .join("")}</ul><p><a href="${deepLinkUrl}">Update them</a></p>`;

    try {
      await sendEmail({
        to: contactEmail,
        subject: `${stats.length} marketplace rating(s) need an update`,
        html,
        text,
        unsubscribeUrl: deepLinkUrl,
      });
      emailsSent++;
      await client.settings.upsert({
        where: { shop_key: { shop, key: NOTIFIED_AT_KEY } },
        update: { value: new Date().toISOString() },
        create: { shop, key: NOTIFIED_AT_KEY, value: new Date().toISOString() },
      });
    } catch (err) {
      console.log(
        `[marketplace-staleness] failed to send digest for ${shop}: ${
          err instanceof Error ? err.message : "unknown_error"
        }`,
      );
    }
  }

  return {
    shopsWithStaleStats: byShop.size,
    staleStatCount: staleStats.length,
    emailsSent,
    emailsSkipped,
  };
}
