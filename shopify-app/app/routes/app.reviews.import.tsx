import { useEffect, useRef, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData, useRevalidator } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { prisma } from "../services/db.server";
import {
  previewImport,
  runImport,
  undoImport,
  recoverStuckBatches,
} from "../services/review-import.server";
import { PRESETS, type Preset } from "../services/import-presets";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  await recoverStuckBatches(session.shop);

  const url = new URL(request.url);
  const batchId = url.searchParams.get("batch");

  const batch = batchId
    ? await prisma.importBatch.findFirst({ where: { id: batchId, shop: session.shop } })
    : null;

  return { batch };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);

  const form = await request.formData();
  const intent = String(form.get("intent"));

  switch (intent) {
    case "preview": {
      const csvText = String(form.get("csvText") ?? "");
      const preset = String(form.get("preset") ?? "generic") as Preset;
      if (!csvText.trim()) {
        return { intent: "preview" as const, error: "No CSV content provided" };
      }
      try {
        const preview = await previewImport(session.shop, { csvText, preset });
        return { intent: "preview" as const, preview };
      } catch (err) {
        return { intent: "preview" as const, error: err instanceof Error ? err.message : String(err) };
      }
    }
    case "commit": {
      const csvText = String(form.get("csvText") ?? "");
      const preset = String(form.get("preset") ?? "generic") as Preset;
      const sourceLabel = String(form.get("sourceLabel") ?? "").trim() || "import";
      const filename = String(form.get("filename") ?? "").trim() || "import.csv";
      const attested = String(form.get("attested")) === "true";

      try {
        const { batchId } = await runImport(session.shop, {
          csvText,
          preset,
          sourceLabel,
          filename,
          attested,
        });
        return { intent: "commit" as const, ok: true, batchId };
      } catch (err) {
        return { intent: "commit" as const, error: err instanceof Error ? err.message : String(err) };
      }
    }
    case "undo": {
      const batchId = String(form.get("batchId") ?? "");
      if (!batchId) return { intent: "undo" as const, error: "Missing batchId" };
      const result = await undoImport(session.shop, batchId, admin);
      if (!result) return { intent: "undo" as const, error: "Batch not found" };
      return { intent: "undo" as const, ok: true };
    }
    default:
      return { error: `Unknown intent: ${intent}` };
  }
};

export default function ReviewImport() {
  const { batch } = useLoaderData<typeof loader>();
  const previewFetcher = useFetcher<typeof action>();
  const commitFetcher = useFetcher<typeof action>();
  const undoFetcher = useFetcher<typeof action>();
  const revalidator = useRevalidator();
  const shopify = useAppBridge();

  const csvTextRef = useRef("");
  const filenameRef = useRef("");
  const [preset, setPreset] = useState<Preset>("generic");

  // Local state only for the fields the UI needs to react to (attested
  // checkbox gates the commit button; csvText/preset/sourceLabel are read
  // straight off the DOM at submit time like the rest of this app's forms).
  const attestedRef = useRef(false);

  // Poll while a commit is in progress. React Router's own loader data is
  // the progress record - no separate polling endpoint needed.
  useEffect(() => {
    if (batch?.status !== "processing") return;
    const id = setInterval(() => revalidator.revalidate(), 2000);
    return () => clearInterval(id);
  }, [batch?.status, revalidator]);

  useEffect(() => {
    if (
      commitFetcher.data &&
      "ok" in commitFetcher.data &&
      commitFetcher.data.ok &&
      commitFetcher.data.intent === "commit"
    ) {
      shopify.toast.show("Import started");
      const url = new URL(window.location.href);
      url.searchParams.set("batch", commitFetcher.data.batchId);
      window.history.replaceState(null, "", url.toString());
      revalidator.revalidate();
    }
  }, [commitFetcher.data, shopify, revalidator]);

  useEffect(() => {
    if (undoFetcher.data && "ok" in undoFetcher.data && undoFetcher.data.ok) {
      shopify.toast.show("Import undone");
      revalidator.revalidate();
    }
  }, [undoFetcher.data, shopify, revalidator]);

  const handleFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      csvTextRef.current = text;
      filenameRef.current = file.name;
      const textarea = document.getElementById("csv-textarea") as HTMLTextAreaElement | null;
      if (textarea) textarea.value = text;
    });
  };

  const readField = (id: string): string =>
    (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null)
      ?.value ?? "";

  const handlePreview = () => {
    const csvText = readField("csv-textarea");
    csvTextRef.current = csvText;
    const form = new FormData();
    form.set("intent", "preview");
    form.set("csvText", csvText);
    form.set("preset", preset);
    previewFetcher.submit(form, { method: "post" });
  };

  const handleCommit = () => {
    const form = new FormData();
    form.set("intent", "commit");
    form.set("csvText", csvTextRef.current);
    form.set("preset", preset);
    form.set("sourceLabel", readField("source-label"));
    form.set("filename", filenameRef.current);
    form.set("attested", attestedRef.current ? "true" : "false");
    commitFetcher.submit(form, { method: "post" });
  };

  const handleUndo = () => {
    if (!batch) return;
    const form = new FormData();
    form.set("intent", "undo");
    form.set("batchId", batch.id);
    undoFetcher.submit(form, { method: "post" });
  };

  const previewData =
    previewFetcher.data && "preview" in previewFetcher.data ? previewFetcher.data.preview : null;
  const previewError =
    previewFetcher.data && "error" in previewFetcher.data ? previewFetcher.data.error : null;
  const commitError =
    commitFetcher.data && "error" in commitFetcher.data ? commitFetcher.data.error : null;

  let errorReport: { row: number; error: string }[] = [];
  try {
    errorReport = batch ? JSON.parse(batch.errorReport) : [];
  } catch {
    errorReport = [];
  }

  return (
    <s-page heading="Import reviews">
      <s-section heading="Step 1: Choose a file">
        <s-stack direction="block" gap="base">
          <input type="file" accept=".csv,text/csv" onChange={handleFileChange as never} />
          <s-text-area
            id="csv-textarea"
            label="Or paste CSV content"
            rows={8}
          ></s-text-area>
          <s-select
            label="Source format"
            value={preset}
            onChange={(e: Event) => setPreset((e.target as HTMLSelectElement).value as Preset)}
          >
            {PRESETS.map((p) => (
              <s-option key={p} value={p}>
                {p === "judgeme" ? "Judge.me" : p === "loox" ? "Loox" : "Generic"}
              </s-option>
            ))}
          </s-select>
          <s-text-field
            id="source-label"
            label="Source label"
            placeholder="e.g. Amazon"
            defaultValue="Import"
          ></s-text-field>
          <s-button
            variant="primary"
            {...(previewFetcher.state !== "idle" ? { loading: true } : {})}
            onClick={handlePreview}
          >
            Preview
          </s-button>
          {previewError && <s-paragraph tone="critical">{previewError}</s-paragraph>}
        </s-stack>
      </s-section>

      {previewData && (
        <s-section heading="Step 2: Review mapping and confirm">
          <s-stack direction="block" gap="base">
            <s-paragraph>
              {previewData.total} rows detected - {previewData.validCount} valid,{" "}
              {previewData.invalidCount} invalid.
            </s-paragraph>

            <s-stack direction="block" gap="small">
              {previewData.previewRows.map((r) => (
                <s-box
                  key={r.row}
                  padding="small"
                  borderWidth="base"
                  borderRadius="base"
                  background={r.ok ? "subdued" : "base"}
                >
                  <s-stack direction="inline" gap="base" alignItems="center">
                    <s-badge tone={r.ok ? "success" : "critical"}>{r.ok ? "ok" : "error"}</s-badge>
                    <s-text>Row {r.row}</s-text>
                    <s-text color="subdued">
                      {r.canonical.customerName ?? "(no name)"} - {r.canonical.rating ?? "?"}★ -{" "}
                      {(r.canonical.body ?? "").slice(0, 60)}
                    </s-text>
                    {r.error && <s-text tone="critical">{r.error}</s-text>}
                  </s-stack>
                </s-box>
              ))}
            </s-stack>

            <s-checkbox
              id="attested-checkbox"
              label="I confirm these are genuine reviews for the same products, unedited."
              onChange={(e: Event) => {
                attestedRef.current = (e.target as HTMLInputElement).checked;
              }}
            ></s-checkbox>

            <s-button
              variant="primary"
              {...(commitFetcher.state !== "idle" ? { loading: true } : {})}
              onClick={handleCommit}
            >
              Import {previewData.validCount} reviews
            </s-button>
            {commitError && <s-paragraph tone="critical">{commitError}</s-paragraph>}
          </s-stack>
        </s-section>
      )}

      {batch && (
        <s-section heading="Import status">
          <s-stack direction="block" gap="base">
            <s-stack direction="inline" gap="base" alignItems="center">
              <s-badge
                tone={
                  batch.status === "completed"
                    ? "success"
                    : batch.status === "failed"
                      ? "critical"
                      : "warning"
                }
              >
                {batch.status}
              </s-badge>
              <s-text>
                {batch.importedCount} imported, {batch.skippedCount} skipped (duplicates), of{" "}
                {batch.totalRows} total
              </s-text>
            </s-stack>

            {errorReport.length > 0 && (
              <s-stack direction="block" gap="small">
                <s-text type="strong">Row errors ({errorReport.length})</s-text>
                {errorReport.slice(0, 20).map((e, i) => (
                  <s-text key={i} color="subdued">
                    Row {e.row}: {e.error}
                  </s-text>
                ))}
              </s-stack>
            )}

            <s-stack direction="inline" gap="base">
              <s-link href={`/app/reviews?batch=${batch.id}`}>
                View this batch in the moderation queue
              </s-link>
              {batch.status !== "undone" && (
                <s-button
                  variant="secondary"
                  tone="critical"
                  disabled={undoFetcher.state !== "idle"}
                  onClick={handleUndo}
                >
                  Undo import
                </s-button>
              )}
            </s-stack>
          </s-stack>
        </s-section>
      )}

      <s-section slot="aside" heading="Export">
        <s-paragraph>Download all reviews as CSV (re-importable via the Generic preset).</s-paragraph>
        <s-link href="/app/reviews/export">Export reviews (CSV)</s-link>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
