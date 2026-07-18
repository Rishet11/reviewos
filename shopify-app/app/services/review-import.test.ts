import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  importBatch: {
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  review: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  product: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
};

const createReviewMock = vi.fn();
const matchOrderForReviewMock = vi.fn();
const syncRatingMetafieldsMock = vi.fn();

vi.mock("./db.server", () => ({ prisma: mockPrisma }));
vi.mock("./reviews.server", () => ({ createReview: createReviewMock }));
vi.mock("./order-verification.server", () => ({ matchOrderForReview: matchOrderForReviewMock }));
vi.mock("./metafields.server", () => ({ syncRatingMetafields: syncRatingMetafieldsMock }));

const {
  parseReviewCsv,
  detectMapping,
  mapRowToCanonical,
  previewImport,
  processImportBatch,
  runImport,
  undoImport,
  bulkModerateBatch,
  exportReviewsCsv,
  recoverStuckBatches,
} = await import("./review-import.server");

const admin = { graphql: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  matchOrderForReviewMock.mockResolvedValue({ verified: false });
  createReviewMock.mockImplementation(async (_shop: string, data: Record<string, unknown>) => ({
    id: `review_${Math.random()}`,
    ...data,
  }));
  mockPrisma.importBatch.update.mockResolvedValue({});
  mockPrisma.importBatch.create.mockResolvedValue({ id: "batch_1" });
});

describe("parseReviewCsv", () => {
  it("strips a UTF-8 BOM", () => {
    const text = "﻿name,body,rating\nAlice,Great,5\n";
    const { rows } = parseReviewCsv(text);
    expect(rows).toEqual([{ name: "Alice", body: "Great", rating: "5" }]);
  });

  it("autodetects a semicolon delimiter", () => {
    const text = "name;body;rating\nBob;Fine product;4\n";
    const { headers, rows } = parseReviewCsv(text);
    expect(headers).toEqual(["name", "body", "rating"]);
    expect(rows).toEqual([{ name: "Bob", body: "Fine product", rating: "4" }]);
  });

  it("handles CRLF line endings and quoted embedded newlines", () => {
    const text = 'name,body,rating\r\n"Cara","Line one\nLine two",5\r\n';
    const { rows } = parseReviewCsv(text);
    expect(rows).toEqual([{ name: "Cara", body: "Line one\nLine two", rating: "5" }]);
  });

  it("preserves emoji in review body", () => {
    const text = "name,body,rating\nDee,Love it 😍🔥,5\n";
    const { rows } = parseReviewCsv(text);
    expect(rows[0].body).toBe("Love it 😍🔥");
  });

  it("rejects a file that is not valid UTF-8", () => {
    const text = "name,body,rating\n�broken,Great,5\n";
    expect(() => parseReviewCsv(text)).toThrow(/not UTF-8/);
  });

  it("rejects more than 10000 data rows", () => {
    const lines = ["name,body,rating"];
    for (let i = 0; i < 10_001; i++) lines.push(`Person ${i},Good,5`);
    expect(() => parseReviewCsv(lines.join("\n"))).toThrow(/Too many rows/);
  });
});

describe("detectMapping", () => {
  it("maps Judge.me preset headers", () => {
    const headers = ["id", "created_at", "product_handle", "rating", "title", "body", "reviewer_name", "reviewer_email"];
    const mapping = detectMapping(headers, "judgeme");
    expect(mapping).toMatchObject({
      id: "externalRef",
      created_at: "createdAt",
      product_handle: "productHandle",
      rating: "rating",
      title: "title",
      body: "body",
      reviewer_name: "customerName",
      reviewer_email: "customerEmail",
    });
  });

  it("maps Loox preset headers", () => {
    const headers = ["Review ID", "Date", "Product Handle", "Rating", "Review", "Name", "Email"];
    const mapping = detectMapping(headers, "loox");
    expect(mapping).toMatchObject({
      "Review ID": "externalRef",
      Date: "createdAt",
      "Product Handle": "productHandle",
      Rating: "rating",
      Review: "body",
      Name: "customerName",
      Email: "customerEmail",
    });
  });

  it("falls back to generic fuzzy matching for unrecognized headers", () => {
    const headers = ["Reviewer Name", "Review Content", "Product Handle", "Score", "Review Date", "Email", "Title", "Review ID"];
    const mapping = detectMapping(headers, "generic");
    expect(mapping).toMatchObject({
      "Reviewer Name": "customerName",
      "Review Content": "body",
      "Product Handle": "productHandle",
      Score: "rating",
      "Review Date": "createdAt",
      Email: "customerEmail",
      Title: "title",
      "Review ID": "externalRef",
    });
  });
});

describe("previewImport", () => {
  it("rejects an unknown preset with a clean validation message instead of throwing a raw TypeError", async () => {
    const csvText = "name,body,rating\nAlice,Great,5\n";

    await expect(
      previewImport("shop1.myshopify.com", { csvText, preset: "bogus-preset" as any }),
    ).rejects.toThrow("Unknown import format: bogus-preset");
  });
});

describe("processImportBatch", () => {
  const shop = "shop1.myshopify.com";

  it("routes invalid rating and unknown product to the error report without aborting the batch", async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: "prod_1", shopifyProductId: null });
    mockPrisma.review.findFirst.mockResolvedValue(null);

    const csv = [
      "productHandle,customerName,body,rating",
      "known-product,Alice,Great product,5",
      "known-product,Bob,Bad rating row,9",
      "missing-product,Cara,Product not found row,4",
    ].join("\n");

    // Second row's product lookup should also resolve (not found only for
    // the third row's handle).
    mockPrisma.product.findUnique.mockImplementation(({ where }: any) => {
      if (where.shop_slug.slug === "known-product") {
        return Promise.resolve({ id: "prod_1", shopifyProductId: null });
      }
      return Promise.resolve(null);
    });

    await processImportBatch(shop, "batch_1", csv, "generic", "Test Import");

    expect(createReviewMock).toHaveBeenCalledTimes(1);
    const finalUpdate = mockPrisma.importBatch.update.mock.calls.at(-1)![0];
    expect(finalUpdate.data.status).toBe("completed");
    expect(finalUpdate.data.importedCount).toBe(1);
    const errors = JSON.parse(finalUpdate.data.errorReport);
    expect(errors).toHaveLength(2);
    expect(errors[0].error).toMatch(/Invalid rating/);
    expect(errors[1].error).toMatch(/Product not found/);
  });

  it("dedupes by externalRef when the CSV provides one", async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: "prod_1", shopifyProductId: null });
    mockPrisma.review.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "existing" });

    const csv = [
      "id,productHandle,customerName,body,rating",
      "ext-1,known-product,Alice,Great product,5",
      "ext-1,known-product,Alice,Great product,5",
    ].join("\n");

    await processImportBatch(shop, "batch_1", csv, "generic", "Test Import");

    expect(createReviewMock).toHaveBeenCalledTimes(1);
    const finalUpdate = mockPrisma.importBatch.update.mock.calls.at(-1)![0];
    expect(finalUpdate.data.importedCount).toBe(1);
    expect(finalUpdate.data.skippedCount).toBe(1);
  });

  it("dedupes by content hash when no externalRef column is present", async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: "prod_1", shopifyProductId: null });
    mockPrisma.review.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "existing" });

    const csv = [
      "productHandle,customerName,body,rating,createdAt",
      "known-product,Alice,Great product,5,2026-01-01",
      "known-product,Alice,Great product,5,2026-01-01",
    ].join("\n");

    await processImportBatch(shop, "batch_1", csv, "generic", "Test Import");

    expect(createReviewMock).toHaveBeenCalledTimes(1);
    const [firstCallShop, firstCallArgs] = createReviewMock.mock.calls[0];
    expect(firstCallShop).toBe(shop);
    expect(firstCallArgs.externalRef).toEqual(
      mockPrisma.review.findFirst.mock.calls[1][0].where.externalRef
    );
  });

  it("imports both rows when the same name/date/body hits two different products", async () => {
    mockPrisma.product.findUnique.mockImplementation(({ where }: any) => {
      if (where.shop_slug.slug === "product-a") {
        return Promise.resolve({ id: "prod_a", shopifyProductId: null });
      }
      if (where.shop_slug.slug === "product-b") {
        return Promise.resolve({ id: "prod_b", shopifyProductId: null });
      }
      return Promise.resolve(null);
    });
    // No externalRef column, so this is content-hash dedupe. The two rows
    // never collide because the hash is scoped by product.
    mockPrisma.review.findFirst.mockResolvedValue(null);

    const csv = [
      "productHandle,customerName,body,rating,createdAt",
      "product-a,Alice,Great product,5,2026-01-01",
      "product-b,Alice,Great product,5,2026-01-01",
    ].join("\n");

    await processImportBatch(shop, "batch_1", csv, "generic", "Test Import");

    expect(createReviewMock).toHaveBeenCalledTimes(2);
    const finalUpdate = mockPrisma.importBatch.update.mock.calls.at(-1)![0];
    expect(finalUpdate.data.importedCount).toBe(2);
    expect(finalUpdate.data.skippedCount).toBe(0);

    const [, firstArgs] = createReviewMock.mock.calls[0];
    const [, secondArgs] = createReviewMock.mock.calls[1];
    expect(firstArgs.externalRef).not.toEqual(secondArgs.externalRef);
  });

  it("marks the batch failed with the error recorded when an unexpected error occurs mid-run", async () => {
    mockPrisma.product.findUnique.mockRejectedValueOnce(new Error("db exploded"));

    const csv = ["productHandle,customerName,body,rating", "known-product,Alice,Great,5"].join("\n");

    await processImportBatch(shop, "batch_1", csv, "generic", "Test Import");

    const finalUpdate = mockPrisma.importBatch.update.mock.calls.at(-1)![0];
    expect(finalUpdate.data.status).toBe("failed");
    const errors = JSON.parse(finalUpdate.data.errorReport);
    expect(errors.some((e: any) => e.error.includes("db exploded"))).toBe(true);
  });
});

describe("runImport", () => {
  it("rejects without attestation", async () => {
    await expect(
      runImport("shop1.myshopify.com", {
        csvText: "productHandle,customerName,body,rating\nx,y,z,5",
        preset: "generic",
        sourceLabel: "Test",
        filename: "f.csv",
        attested: false,
      })
    ).rejects.toThrow(/Attestation required/);
    expect(mockPrisma.importBatch.create).not.toHaveBeenCalled();
  });

  it("rejects a file over the 10000 row cap before creating a batch", async () => {
    const lines = ["productHandle,customerName,body,rating"];
    for (let i = 0; i < 10_001; i++) lines.push(`p,c${i},b,5`);

    await expect(
      runImport("shop1.myshopify.com", {
        csvText: lines.join("\n"),
        preset: "generic",
        sourceLabel: "Test",
        filename: "f.csv",
        attested: true,
      })
    ).rejects.toThrow(/Too many rows/);
    expect(mockPrisma.importBatch.create).not.toHaveBeenCalled();
  });

  it("creates a processing batch on valid input", async () => {
    const { batchId } = await runImport("shop1.myshopify.com", {
      csvText: "productHandle,customerName,body,rating\np,c,b,5",
      preset: "generic",
      sourceLabel: "Test",
      filename: "f.csv",
      attested: true,
    });

    expect(batchId).toBe("batch_1");
    expect(mockPrisma.importBatch.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "processing" }) })
    );

    // Let the fire-and-forget processing settle before the next test's
    // beforeEach clears the shared mocks out from under it.
    await new Promise((r) => setTimeout(r, 0));
  });
});

describe("undoImport", () => {
  it("removes only the batch's reviews, marks it undone, and resyncs each affected product once", async () => {
    mockPrisma.importBatch.findFirst.mockResolvedValue({ id: "batch_1", shop: "shop1.myshopify.com" });
    mockPrisma.review.findMany.mockResolvedValue([{ productId: "prod_1" }, { productId: "prod_2" }]);
    mockPrisma.review.deleteMany.mockResolvedValue({ count: 2 });

    const result = await undoImport("shop1.myshopify.com", "batch_1", admin);

    expect(mockPrisma.review.deleteMany).toHaveBeenCalledWith({
      where: { shop: "shop1.myshopify.com", importBatchId: "batch_1" },
    });
    expect(mockPrisma.importBatch.update).toHaveBeenCalledWith({
      where: { id: "batch_1" },
      data: { status: "undone" },
    });
    expect(syncRatingMetafieldsMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ productsResynced: 2 });
  });

  it("returns null when the batch does not belong to this shop", async () => {
    mockPrisma.importBatch.findFirst.mockResolvedValue(null);
    const result = await undoImport("shop1.myshopify.com", "batch_1", admin);
    expect(result).toBeNull();
    expect(mockPrisma.review.deleteMany).not.toHaveBeenCalled();
  });
});

describe("bulkModerateBatch", () => {
  it("calls syncRatingMetafields exactly once per distinct product, not once per review", async () => {
    mockPrisma.review.findMany.mockResolvedValue([{ productId: "prod_1" }, { productId: "prod_2" }]);
    mockPrisma.review.updateMany.mockResolvedValue({ count: 5 });

    const result = await bulkModerateBatch("shop1.myshopify.com", "batch_1", "approved", admin);

    expect(mockPrisma.review.updateMany).toHaveBeenCalledWith({
      where: { shop: "shop1.myshopify.com", importBatchId: "batch_1", status: "pending" },
      data: { status: "approved" },
    });
    expect(syncRatingMetafieldsMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ count: 5, productIds: ["prod_1", "prod_2"] });
  });
});

describe("recoverStuckBatches", () => {
  const shop = "shop1.myshopify.com";
  const now = new Date("2026-01-01T00:15:00.000Z");

  it("fails a batch stuck processing for exactly the 15-minute threshold", async () => {
    mockPrisma.importBatch.findMany.mockResolvedValue([{ id: "batch_stuck" }]);

    await recoverStuckBatches(shop, now);

    expect(mockPrisma.importBatch.findMany).toHaveBeenCalledWith({
      where: { shop, status: "processing", updatedAt: { lt: new Date("2026-01-01T00:00:00.000Z") } },
      select: { id: true },
    });
    expect(mockPrisma.importBatch.update).toHaveBeenCalledWith({
      where: { id: "batch_stuck" },
      data: {
        status: "failed",
        errorReport: JSON.stringify([
          { row: -1, error: "import interrupted (server restart); undo and re-import" },
        ]),
      },
    });
  });

  it("leaves a batch updated 14 minutes ago untouched (not yet past threshold)", async () => {
    mockPrisma.importBatch.findMany.mockResolvedValue([]);

    await recoverStuckBatches(shop, now);

    expect(mockPrisma.importBatch.update).not.toHaveBeenCalled();
  });
});

describe("exportReviewsCsv", () => {
  it("round-trips through the generic import preset", async () => {
    mockPrisma.review.findMany.mockResolvedValue([
      {
        product: { slug: "cool-mug" },
        customerName: "Alice",
        customerEmail: "alice@example.com",
        rating: 5,
        title: "Love it",
        body: "Great, would buy again",
        createdAt: new Date("2026-01-15T00:00:00Z"),
        externalRef: "hash-1",
      },
    ]);

    const csv = await exportReviewsCsv("shop1.myshopify.com");
    const { headers, rows } = parseReviewCsv(csv);
    const mapping = detectMapping(headers, "generic");
    const canonical = mapRowToCanonical(rows[0], mapping);

    expect(canonical).toEqual({
      productHandle: "cool-mug",
      customerName: "Alice",
      customerEmail: "alice@example.com",
      rating: "5",
      title: "Love it",
      body: "Great, would buy again",
      createdAt: "2026-01-15T00:00:00.000Z",
      externalRef: "hash-1",
    });
  });

  it("prefixes formula-injection-prone cells with a single quote", async () => {
    mockPrisma.review.findMany.mockResolvedValue([
      {
        product: { slug: "p1" },
        customerName: "Alice",
        customerEmail: null,
        rating: 5,
        title: null,
        body: "=HYPERLINK(\"http://evil.example\",\"click\")",
        createdAt: new Date("2026-01-15T00:00:00Z"),
        externalRef: "hash-2",
      },
      {
        product: { slug: "p2" },
        customerName: "-Bob",
        customerEmail: null,
        rating: 4,
        title: null,
        body: "Good, -ish",
        createdAt: new Date("2026-01-15T00:00:00Z"),
        externalRef: "hash-3",
      },
      {
        product: { slug: "p3" },
        customerName: "@Cara",
        customerEmail: null,
        rating: 3,
        title: null,
        body: "fine",
        createdAt: new Date("2026-01-15T00:00:00Z"),
        externalRef: "hash-4",
      },
      {
        product: { slug: "p4" },
        customerName: "Normal negative string",
        customerEmail: null,
        rating: 2,
        title: null,
        body: "-just a dash-led sentence, not a formula",
        externalRef: "hash-5",
        createdAt: new Date("2026-01-15T00:00:00Z"),
      },
    ]);

    const csv = await exportReviewsCsv("shop1.myshopify.com");
    const lines = csv.split("\r\n");

    expect(lines[1]).toContain('"\'=HYPERLINK(""http://evil.example"",""click"")"');
    expect(lines[2]).toContain("'-Bob");
    expect(lines[3]).toContain("'@Cara");
    // A leading dash in a body cell is guarded too, even though it reads as
    // an ordinary sentence, not just a formula attempt - acceptable per spec.
    expect(lines[4]).toContain("'-just a dash-led sentence, not a formula");
  });
});
