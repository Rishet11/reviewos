import { describe, it, expect, vi, beforeEach } from "vitest";

const SHOP = "shop1.myshopify.com";

const mockPrisma = {
  importBatch: {
    findFirst: vi.fn(),
  },
};

const mockAuthenticate = {
  admin: vi.fn(),
};

const mockPreviewImport = vi.fn();
const mockRunImport = vi.fn();
const mockUndoImport = vi.fn();
const mockRecoverStuckBatches = vi.fn();

vi.mock("../shopify.server", () => ({
  authenticate: mockAuthenticate,
}));

vi.mock("../services/db.server", () => ({ prisma: mockPrisma }));

vi.mock("../services/review-import.server", () => ({
  previewImport: mockPreviewImport,
  runImport: mockRunImport,
  undoImport: mockUndoImport,
  recoverStuckBatches: mockRecoverStuckBatches,
}));

vi.mock("../services/import-presets", () => ({
  PRESETS: ["judgeme", "loox", "generic"],
}));

const { loader, action } = await import("./app.reviews_.import");

const session = { shop: SHOP };
const admin = { graphql: vi.fn() };

function formRequest(fields: Record<string, string>) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return new Request("https://app.example.com/app/reviews/import", {
    method: "POST",
    body: form,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthenticate.admin.mockResolvedValue({ session, admin });
  mockPrisma.importBatch.findFirst.mockResolvedValue(null);
  mockRecoverStuckBatches.mockResolvedValue(undefined);
});

describe("loader", () => {
  it("recovers stuck batches and returns null batch when no ?batch param is given", async () => {
    const request = new Request("https://app.example.com/app/reviews/import");

    const result = await loader({ request } as any);

    expect(mockRecoverStuckBatches).toHaveBeenCalledWith(SHOP);
    expect(result.batch).toBeNull();
    expect(mockPrisma.importBatch.findFirst).not.toHaveBeenCalled();
  });

  it("looks up the batch scoped to this shop when ?batch is given", async () => {
    const batch = { id: "b1", status: "completed" };
    mockPrisma.importBatch.findFirst.mockResolvedValue(batch);
    const request = new Request("https://app.example.com/app/reviews/import?batch=b1");

    const result = await loader({ request } as any);

    expect(mockPrisma.importBatch.findFirst).toHaveBeenCalledWith({
      where: { id: "b1", shop: SHOP },
    });
    expect(result.batch).toEqual(batch);
  });

  it("returns null when the batch id doesn't belong to this shop", async () => {
    mockPrisma.importBatch.findFirst.mockResolvedValue(null);
    const request = new Request("https://app.example.com/app/reviews/import?batch=not-mine");

    const result = await loader({ request } as any);

    expect(result.batch).toBeNull();
  });
});

describe("action: preview", () => {
  it("rejects empty/whitespace-only CSV content without calling the service", async () => {
    const request = formRequest({ intent: "preview", csvText: "   ", preset: "generic" });

    const result = await action({ request } as any);

    expect(result).toEqual({ intent: "preview", error: "No CSV content provided" });
    expect(mockPreviewImport).not.toHaveBeenCalled();
  });

  it("returns preview data on success", async () => {
    const preview = { headers: ["name"], mapping: {}, total: 1, validCount: 1, invalidCount: 0, previewRows: [] };
    mockPreviewImport.mockResolvedValue(preview);
    const request = formRequest({ intent: "preview", csvText: "name,rating,body\nA,5,ok", preset: "generic" });

    const result = await action({ request } as any);

    expect(result).toEqual({ intent: "preview", preview });
    expect(mockPreviewImport).toHaveBeenCalledTimes(1);
    const call = mockPreviewImport.mock.calls[0];
    expect(call[0]).toBe(SHOP);
    expect(call[1].preset).toBe("generic");
    expect(call[1].csvText.replace(/\r\n/g, "\n")).toBe("name,rating,body\nA,5,ok");
  });

  it("returns a graceful error when previewImport throws", async () => {
    mockPreviewImport.mockRejectedValue(new Error("Could not parse CSV: bad format"));
    const request = formRequest({ intent: "preview", csvText: "garbage", preset: "generic" });

    const result = await action({ request } as any);

    expect(result).toEqual({ intent: "preview", error: "Could not parse CSV: bad format" });
  });

  it("defaults preset to generic when not provided", async () => {
    mockPreviewImport.mockResolvedValue({ total: 0 });
    const request = formRequest({ intent: "preview", csvText: "a,b\n1,2" });

    await action({ request } as any);

    const call = mockPreviewImport.mock.calls[0];
    expect(call[0]).toBe(SHOP);
    expect(call[1].preset).toBe("generic");
    expect(call[1].csvText.replace(/\r\n/g, "\n")).toBe("a,b\n1,2");
  });
});

describe("action: commit", () => {
  it("returns a graceful error when the attestation guard rejects (unattested)", async () => {
    mockRunImport.mockRejectedValue(
      new Error("Attestation required: confirm these are genuine reviews before importing.")
    );
    const request = formRequest({
      intent: "commit",
      csvText: "name,rating,body\nA,5,ok",
      preset: "generic",
      attested: "false",
    });

    const result = await action({ request } as any);

    expect(result).toEqual({
      intent: "commit",
      error: "Attestation required: confirm these are genuine reviews before importing.",
    });
  });

  it("starts an import batch when attested", async () => {
    mockRunImport.mockResolvedValue({ batchId: "batch_1" });
    const request = formRequest({
      intent: "commit",
      csvText: "name,rating,body\nA,5,ok",
      preset: "generic",
      sourceLabel: "Amazon",
      filename: "reviews.csv",
      attested: "true",
    });

    const result = await action({ request } as any);

    expect(result).toEqual({ intent: "commit", ok: true, batchId: "batch_1" });
    expect(mockRunImport).toHaveBeenCalledTimes(1);
    const call = mockRunImport.mock.calls[0];
    expect(call[0]).toBe(SHOP);
    expect(call[1]).toEqual(
      expect.objectContaining({
        preset: "generic",
        sourceLabel: "Amazon",
        filename: "reviews.csv",
        attested: true,
      })
    );
    expect(call[1].csvText.replace(/\r\n/g, "\n")).toBe("name,rating,body\nA,5,ok");
  });

  it("falls back to default sourceLabel/filename when blank", async () => {
    mockRunImport.mockResolvedValue({ batchId: "batch_2" });
    const request = formRequest({
      intent: "commit",
      csvText: "name,rating,body\nA,5,ok",
      preset: "generic",
      sourceLabel: "   ",
      filename: "",
      attested: "true",
    });

    await action({ request } as any);

    expect(mockRunImport).toHaveBeenCalledWith(
      SHOP,
      expect.objectContaining({ sourceLabel: "import", filename: "import.csv" })
    );
  });

  it("returns a graceful error when runImport throws for any other reason", async () => {
    mockRunImport.mockRejectedValue(new Error("Too many rows (20000). Max 10000 per import."));
    const request = formRequest({
      intent: "commit",
      csvText: "big file",
      preset: "generic",
      attested: "true",
    });

    const result = await action({ request } as any);

    expect(result).toEqual({
      intent: "commit",
      error: "Too many rows (20000). Max 10000 per import.",
    });
  });
});

describe("action: undo", () => {
  it("requires a batchId", async () => {
    const request = formRequest({ intent: "undo", batchId: "" });

    const result = await action({ request } as any);

    expect(result).toEqual({ intent: "undo", error: "Missing batchId" });
    expect(mockUndoImport).not.toHaveBeenCalled();
  });

  it("returns an error when the batch doesn't exist (or isn't this shop's)", async () => {
    mockUndoImport.mockResolvedValue(null);
    const request = formRequest({ intent: "undo", batchId: "not-mine" });

    const result = await action({ request } as any);

    expect(result).toEqual({ intent: "undo", error: "Batch not found" });
  });

  it("undoes an import batch", async () => {
    mockUndoImport.mockResolvedValue({ productsResynced: 2 });
    const request = formRequest({ intent: "undo", batchId: "b1" });

    const result = await action({ request } as any);

    expect(result).toEqual({ intent: "undo", ok: true });
    expect(mockUndoImport).toHaveBeenCalledWith(SHOP, "b1", admin);
  });
});

describe("action: unknown intent", () => {
  it("returns an error for an unrecognized intent", async () => {
    const request = formRequest({ intent: "made-up" });

    const result = await action({ request } as any);

    expect(result).toEqual({ error: "Unknown intent: made-up" });
  });
});
