// Phase (Slice 1): CSV review import/export. Lets a merchant migrate reviews
// off Judge.me/Loox/etc, or bulk-load reviews collected outside Shopify.
// Category-agnostic like the rest of the review services: nothing here
// hardcodes a product type or attribute name.
//
// Import is fire-and-forget from the route (see runImport) - this app is a
// long-lived Node server (Render), so in-process async background work is
// fine for Slice 1 volumes. No queue.

import crypto from "node:crypto";
import { parse } from "csv-parse/sync";
import { prisma } from "./db.server";
import { createReview } from "./reviews.server";
import { matchOrderForReview } from "./order-verification.server";
import { syncRatingMetafields } from "./metafields.server";
import type { ReviewStatus } from "./review-status";

type AdminClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> }
  ) => Promise<Response>;
};

type ProductLite = { id: string; shopifyProductId: string | null };

const MAX_ROWS = 10_000;
const CHUNK_SIZE = 100;
const PREVIEW_ROWS = 20;

// ---- CSV parsing ----

export function parseReviewCsv(text: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const content = text.replace(/^﻿/, "");

  if (content.includes("�")) {
    throw new Error("File is not UTF-8. Re-save the CSV as UTF-8 and try again.");
  }

  const headerLine = content.split(/\r\n|\r|\n/, 1)[0] ?? "";
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  const delimiter = semicolons > commas ? ";" : ",";

  let records: Record<string, string>[];
  try {
    records = parse(content, {
      columns: true,
      delimiter,
      bom: true,
      trim: true,
      skip_empty_lines: true,
      relax_column_count: true,
    });
  } catch (err) {
    throw new Error(`Could not parse CSV: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (records.length > MAX_ROWS) {
    throw new Error(`Too many rows (${records.length}). Max ${MAX_ROWS} per import.`);
  }

  const headers = records.length > 0 ? Object.keys(records[0]) : [];
  return { headers, rows: records };
}

// ---- Header mapping (presets + generic fuzzy fallback) ----

export type CanonicalField =
  | "productHandle"
  | "shopifyProductId"
  | "customerName"
  | "customerEmail"
  | "rating"
  | "title"
  | "body"
  | "createdAt"
  | "externalRef";

export type Preset = "judgeme" | "loox" | "generic";

export const PRESETS: Preset[] = ["judgeme", "loox", "generic"];

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_]+/g, "");
}

// Best-guess Judge.me / Loox export headers, normalized (space/underscore
// stripped). Any header not in these dicts falls back to genericMatch below,
// so getting a couple of these wrong just means a column that used to hit
// the preset dict now hits the fuzzy fallback instead - no hard failure.
const PRESET_HEADERS: Record<Exclude<Preset, "generic">, Record<string, CanonicalField>> = {
  judgeme: {
    id: "externalRef",
    createdat: "createdAt",
    reviewdate: "createdAt",
    producthandle: "productHandle",
    productid: "shopifyProductId",
    rating: "rating",
    title: "title",
    body: "body",
    reviewername: "customerName",
    revieweremail: "customerEmail",
  },
  loox: {
    reviewid: "externalRef",
    date: "createdAt",
    producthandle: "productHandle",
    productid: "shopifyProductId",
    rating: "rating",
    review: "body",
    name: "customerName",
    email: "customerEmail",
  },
};

function genericMatch(norm: string): CanonicalField | null {
  if (norm.includes("reviewid") || norm === "id" || norm.includes("externalref")) return "externalRef";
  if (norm.includes("date") || norm.includes("createdat")) return "createdAt";
  if (norm.includes("email")) return "customerEmail";
  if (
    norm.includes("reviewername") ||
    norm.includes("author") ||
    norm === "name" ||
    norm.includes("customername")
  )
    return "customerName";
  if (norm.includes("handle")) return "productHandle";
  if (norm.includes("productid")) return "shopifyProductId";
  if (norm.includes("rating") || norm.includes("score") || norm.includes("stars")) return "rating";
  if (norm === "title" || norm.includes("reviewtitle")) return "title";
  if (
    norm.includes("reviewcontent") ||
    norm.includes("reviewbody") ||
    norm === "review" ||
    norm === "body" ||
    norm.includes("content")
  )
    return "body";
  return null;
}

export function detectMapping(
  headers: string[],
  preset: Preset
): Record<string, CanonicalField | null> {
  const presetDict = preset === "generic" ? {} : PRESET_HEADERS[preset];
  const mapping: Record<string, CanonicalField | null> = {};
  for (const h of headers) {
    const norm = normalizeHeader(h);
    mapping[h] = presetDict[norm] ?? genericMatch(norm);
  }
  return mapping;
}

export function mapRowToCanonical(
  row: Record<string, string>,
  mapping: Record<string, CanonicalField | null>
): Partial<Record<CanonicalField, string>> {
  const canonical: Partial<Record<CanonicalField, string>> = {};
  for (const [header, value] of Object.entries(row)) {
    const field = mapping[header];
    if (field && value != null && String(value).trim() !== "") {
      canonical[field] = String(value).trim();
    }
  }
  return canonical;
}

// ---- Row validation + dedupe ----

export function computeExternalRefHash(
  productId: string,
  customerName: string,
  createdAt: Date | undefined,
  body: string
): string {
  const dateKey = createdAt ? createdAt.toISOString().slice(0, 10) : "";
  return crypto.createHash("sha256").update(`${productId}|${customerName}|${dateKey}|${body}`).digest("hex");
}

type ProductCache = Map<string, ProductLite | null>;

async function resolveProductReadOnly(
  shop: string,
  canonical: Partial<Record<CanonicalField, string>>,
  cache: ProductCache
): Promise<ProductLite | null> {
  const cacheKey = `${canonical.productHandle ?? ""}::${canonical.shopifyProductId ?? ""}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null;

  let product: ProductLite | null = null;
  if (canonical.productHandle) {
    product = await prisma.product.findUnique({
      where: { shop_slug: { shop, slug: canonical.productHandle } },
      select: { id: true, shopifyProductId: true },
    });
  }
  if (!product && canonical.shopifyProductId) {
    product = await prisma.product.findFirst({
      where: { shop, shopifyProductId: canonical.shopifyProductId },
      select: { id: true, shopifyProductId: true },
    });
  }

  cache.set(cacheKey, product);
  return product;
}

export type RowValidationResult =
  | {
      ok: true;
      data: {
        product: ProductLite;
        customerName: string;
        customerEmail?: string;
        rating: number;
        title?: string;
        body: string;
        createdAt?: Date;
      };
      externalRef: string;
    }
  | { ok: false; error: string };

export async function validateCanonicalRow(
  shop: string,
  canonical: Partial<Record<CanonicalField, string>>,
  cache: ProductCache
): Promise<RowValidationResult> {
  const customerName = canonical.customerName?.trim();
  if (!customerName) return { ok: false, error: "Missing customer name" };

  const body = canonical.body?.trim();
  if (!body) return { ok: false, error: "Missing review body" };

  const ratingNum = Number(canonical.rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return { ok: false, error: `Invalid rating: ${canonical.rating ?? "(missing)"}` };
  }

  if (!canonical.productHandle && !canonical.shopifyProductId) {
    return { ok: false, error: "Missing product handle or product ID" };
  }
  const product = await resolveProductReadOnly(shop, canonical, cache);
  if (!product) {
    return {
      ok: false,
      error: `Product not found: ${canonical.productHandle ?? canonical.shopifyProductId}`,
    };
  }

  let createdAt: Date | undefined;
  if (canonical.createdAt) {
    const parsed = new Date(canonical.createdAt);
    if (!Number.isNaN(parsed.getTime())) createdAt = parsed;
  }

  const externalRef =
    canonical.externalRef?.trim() || computeExternalRefHash(product.id, customerName, createdAt, body);

  return {
    ok: true,
    data: { product, customerName, customerEmail: canonical.customerEmail, rating: ratingNum, title: canonical.title, body, createdAt },
    externalRef,
  };
}

// ---- Preview (step 2): parse + validate everything, read-only ----

export type PreviewRow = {
  row: number;
  canonical: Partial<Record<CanonicalField, string>>;
  ok: boolean;
  error?: string;
};

export async function previewImport(
  shop: string,
  { csvText, preset }: { csvText: string; preset: Preset }
) {
  const { headers, rows } = parseReviewCsv(csvText);
  const mapping = detectMapping(headers, preset);
  const cache: ProductCache = new Map();

  let validCount = 0;
  let invalidCount = 0;
  const previewRows: PreviewRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const canonical = mapRowToCanonical(rows[i], mapping);
    const result = await validateCanonicalRow(shop, canonical, cache);
    if (result.ok) validCount += 1;
    else invalidCount += 1;

    if (i < PREVIEW_ROWS) {
      previewRows.push({
        row: i + 1,
        canonical,
        ok: result.ok,
        error: result.ok ? undefined : result.error,
      });
    }
  }

  return { headers, mapping, total: rows.length, validCount, invalidCount, previewRows };
}

// ---- Commit (step 3): create the batch, then process async ----

export async function runImport(
  shop: string,
  opts: { csvText: string; preset: Preset; sourceLabel: string; filename: string; attested: boolean }
): Promise<{ batchId: string }> {
  if (!opts.attested) {
    throw new Error("Attestation required: confirm these are genuine reviews before importing.");
  }

  // Parse eagerly so a malformed file (bad encoding, over the row cap) fails
  // before a batch row is created for it.
  parseReviewCsv(opts.csvText);

  const batch = await prisma.importBatch.create({
    data: {
      shop,
      filename: opts.filename,
      preset: opts.preset,
      sourceLabel: opts.sourceLabel,
      status: "processing",
      attestedAt: new Date(),
    },
  });

  // Fire-and-forget: processImportBatch manages its own status transitions
  // and never rejects, so nothing here needs a .catch().
  void processImportBatch(shop, batch.id, opts.csvText, opts.preset, opts.sourceLabel);

  return { batchId: batch.id };
}

// Exported for direct testing (runImport fires this without awaiting it, so
// tests await it directly instead of racing a detached promise).
export async function processImportBatch(
  shop: string,
  batchId: string,
  csvText: string,
  preset: Preset,
  sourceLabel: string
): Promise<void> {
  const errors: { row: number; error: string }[] = [];
  let imported = 0;
  let skipped = 0;

  try {
    const { headers, rows } = parseReviewCsv(csvText);
    const mapping = detectMapping(headers, preset);
    const cache: ProductCache = new Map();

    await prisma.importBatch.update({ where: { id: batchId }, data: { totalRows: rows.length } });

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);

      for (let j = 0; j < chunk.length; j++) {
        const rowNum = i + j + 1;
        const canonical = mapRowToCanonical(chunk[j], mapping);
        const result = await validateCanonicalRow(shop, canonical, cache);

        if (!result.ok) {
          errors.push({ row: rowNum, error: result.error });
          continue;
        }

        // Sequential (not parallelized) so a duplicate hash within the same
        // file is caught against rows this same run already created.
        const existing = await prisma.review.findFirst({
          where: { shop, externalRef: result.externalRef },
          select: { id: true },
        });
        if (existing) {
          skipped += 1;
          continue;
        }

        const orderMatch = await matchOrderForReview(shop, {
          shopifyProductId: result.data.product.shopifyProductId,
          customerEmail: result.data.customerEmail ?? null,
        });

        await createReview(shop, {
          productId: result.data.product.id,
          customerName: result.data.customerName,
          customerEmail: result.data.customerEmail,
          rating: result.data.rating,
          title: result.data.title,
          body: result.data.body,
          createdAt: result.data.createdAt,
          source: sourceLabel,
          status: "pending",
          importBatchId: batchId,
          externalRef: result.externalRef,
          verifiedBuyer: orderMatch.verified,
          verifiedOrderId: orderMatch.orderCaptureId ?? null,
        });
        imported += 1;
      }

      await prisma.importBatch.update({
        where: { id: batchId },
        data: { importedCount: imported, skippedCount: skipped, errorReport: JSON.stringify(errors) },
      });
    }

    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status: "completed",
        importedCount: imported,
        skippedCount: skipped,
        errorReport: JSON.stringify(errors),
      },
    });
  } catch (err) {
    errors.push({ row: 0, error: err instanceof Error ? err.message : String(err) });
    await prisma.importBatch
      .update({
        where: { id: batchId },
        data: {
          status: "failed",
          importedCount: imported,
          skippedCount: skipped,
          errorReport: JSON.stringify(errors),
        },
      })
      .catch((updateErr) => {
        console.error("failed to record import batch failure", { shop, batchId, updateErr });
      });
  }
}

// ---- Stuck-batch recovery ----

// If the process restarts mid-import, a batch can be left in "processing"
// forever (nothing is left to flip it to completed/failed). Called from the
// import loader on every page load: any batch stuck in "processing" past
// this threshold is treated as interrupted and failed out so the merchant
// can undo/retry instead of the UI spinning indefinitely.
const STUCK_BATCH_THRESHOLD_MS = 15 * 60 * 1000;

export async function recoverStuckBatches(shop: string, now: Date = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - STUCK_BATCH_THRESHOLD_MS);
  const stuck = await prisma.importBatch.findMany({
    where: { shop, status: "processing", updatedAt: { lt: cutoff } },
    select: { id: true },
  });

  for (const { id } of stuck) {
    await prisma.importBatch.update({
      where: { id },
      data: {
        status: "failed",
        errorReport: JSON.stringify([
          { row: -1, error: "import interrupted (server restart); undo and re-import" },
        ]),
      },
    });
  }
}

// ---- Undo ----

export async function undoImport(shop: string, batchId: string, admin: AdminClient) {
  const batch = await prisma.importBatch.findFirst({ where: { id: batchId, shop } });
  if (!batch) return null;

  const affected = await prisma.review.findMany({
    where: { shop, importBatchId: batchId },
    select: { productId: true },
    distinct: ["productId"],
  });

  await prisma.review.deleteMany({ where: { shop, importBatchId: batchId } });
  await prisma.importBatch.update({ where: { id: batchId }, data: { status: "undone" } });

  for (const { productId } of affected) {
    try {
      await syncRatingMetafields(shop, productId, admin);
    } catch (err) {
      console.error("syncRatingMetafields failed during undoImport", { shop, productId, err });
    }
  }

  return { productsResynced: affected.length };
}

// ---- Bulk moderation for a batch ----

export async function bulkModerateBatch(
  shop: string,
  importBatchId: string,
  status: ReviewStatus,
  admin: AdminClient
): Promise<{ count: number; productIds: string[] }> {
  const pending = await prisma.review.findMany({
    where: { shop, importBatchId, status: "pending" },
    select: { productId: true },
    distinct: ["productId"],
  });
  const productIds = pending.map((p) => p.productId);

  const { count } = await prisma.review.updateMany({
    where: { shop, importBatchId, status: "pending" },
    data: { status },
  });

  for (const productId of productIds) {
    try {
      await syncRatingMetafields(shop, productId, admin);
    } catch (err) {
      console.error("syncRatingMetafields failed during bulkModerateBatch", { shop, productId, err });
    }
  }

  return { count, productIds };
}

// ---- Export ----

const EXPORT_HEADERS = [
  "productHandle",
  "customerName",
  "customerEmail",
  "rating",
  "title",
  "body",
  "createdAt",
  "externalRef",
] as const;

function csvEscape(value: string): string {
  // Guard formula injection: a cell opening with =, +, -, or @ is executed as
  // a formula by Excel/Sheets on open. Review bodies are public user input
  // that round-trips into this export, so prefix a single quote to force
  // text interpretation before the existing quote-escaping.
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\r\n]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}

export async function exportReviewsCsv(shop: string): Promise<string> {
  const reviews = await prisma.review.findMany({
    where: { shop },
    include: { product: { select: { slug: true } } },
    orderBy: { createdAt: "asc" },
  });

  const lines = [EXPORT_HEADERS.join(",")];
  for (const r of reviews) {
    const row = [
      r.product.slug,
      r.customerName,
      r.customerEmail ?? "",
      String(r.rating),
      r.title ?? "",
      r.body,
      r.createdAt.toISOString(),
      r.externalRef ?? "",
    ];
    lines.push(row.map(csvEscape).join(","));
  }
  return lines.join("\r\n");
}
