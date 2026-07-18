import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData, useSearchParams } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { prisma } from "../services/db.server";
import {
  createReview,
  listReviewsForAdmin,
  moderateReview,
  replyToReview,
} from "../services/reviews.server";
import { REVIEW_STATUSES, type ReviewStatus } from "../services/review-status";
import { getOrGenerateSummary } from "../services/ai/summaries.server";
import { syncRatingMetafields } from "../services/metafields.server";
import { bulkModerateBatch } from "../services/review-import.server";
import { getPlan } from "../services/entitlements.server";
import {
  previewBackfill,
  runBackfill,
  countBlastRowsThisMonth,
} from "../services/review-request-backfill.server";
import { FREE_MONTHLY_CAP } from "../services/billing-limits";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "";
  const productId = url.searchParams.get("productId") ?? "";
  const batchId = url.searchParams.get("batch") ?? "";

  const { reviews, total } = await listReviewsForAdmin(session.shop, {
    status: status || undefined,
    productId: productId || undefined,
    importBatchId: batchId || undefined,
  });

  const products = await prisma.product.findMany({
    where: { shop: session.shop },
    select: { id: true, name: true, slug: true, category: true },
    orderBy: { name: "asc" },
  });

  const plan = await getPlan(billing);
  const blastCapRemaining =
    plan === "free"
      ? Math.max(0, FREE_MONTHLY_CAP - (await countBlastRowsThisMonth(session.shop)))
      : null;

  return { reviews, total, products, status, productId, batchId, plan, blastCapRemaining };
};

async function trySyncRatingMetafields(
  shop: string,
  productId: string,
  admin: Parameters<typeof syncRatingMetafields>[2]
) {
  try {
    await syncRatingMetafields(shop, productId, admin);
  } catch (err) {
    console.error("syncRatingMetafields failed", { shop, productId, err });
  }
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin, billing } = await authenticate.admin(request);

  const form = await request.formData();
  const intent = String(form.get("intent"));

  try {
    switch (intent) {
    case "moderate": {
      const reviewId = String(form.get("reviewId"));
      const status = String(form.get("status"));
      if (!REVIEW_STATUSES.includes(status as ReviewStatus)) {
        return { error: `Invalid status: ${status}` };
      }
      const updated = await moderateReview(session.shop, reviewId, status);
      if (!updated) return { error: "Review not found" };
      await trySyncRatingMetafields(session.shop, updated.productId, admin);
      return { ok: true };
    }
    case "bulk-moderate": {
      const importBatchId = String(form.get("importBatchId") ?? "");
      const status = String(form.get("status"));
      if (!importBatchId) return { error: "Missing importBatchId" };
      if (!REVIEW_STATUSES.includes(status as ReviewStatus)) {
        return { error: `Invalid status: ${status}` };
      }
      const result = await bulkModerateBatch(
        session.shop,
        importBatchId,
        status as ReviewStatus,
        admin
      );
      return { ok: true, count: result.count };
    }
    case "reply": {
      const reviewId = String(form.get("reviewId"));
      const reply = String(form.get("reply") ?? "");
      const updated = await replyToReview(session.shop, reviewId, reply);
      if (!updated) return { error: "Review not found" };
      return { ok: true };
    }
    case "regenerate-summary": {
      const productId = String(form.get("productId"));
      if (!productId) return { error: "Missing productId" };
      await getOrGenerateSummary(session.shop, productId, "overall", {}, true);
      return { ok: true };
    }
    case "create": {
      const productId = String(form.get("productId"));
      const customerName = String(form.get("customerName"));
      const rating = Number(form.get("rating"));
      const title = String(form.get("title") ?? "").trim();
      const body = String(form.get("body") ?? "");

      if (!productId || !customerName || !rating || !body) {
        return { error: "Missing required fields" };
      }

      await createReview(session.shop, {
        productId,
        customerName,
        rating,
        title: title || undefined,
        body,
        source: "merchant",
        status: "approved",
      });
      return { ok: true };
    }
    case "blast-preview": {
      const sinceDays = Number(form.get("sinceDays") ?? 30);
      if (!Number.isFinite(sinceDays) || sinceDays < 1 || sinceDays > 60) {
        return { error: "Days must be between 1 and 60" };
      }
      const plan = await getPlan(billing);
      const result = await previewBackfill(session.shop, admin, sinceDays, plan);
      return { ok: true, preview: result };
    }
    case "blast-run": {
      const sinceDays = Number(form.get("sinceDays") ?? 30);
      if (!Number.isFinite(sinceDays) || sinceDays < 1 || sinceDays > 60) {
        return { error: "Days must be between 1 and 60" };
      }
      const plan = await getPlan(billing);
      const result = await runBackfill(session.shop, admin, sinceDays, plan);
      return { ok: true, run: result };
    }
    default:
      return { error: `Unknown intent: ${intent}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
};

function badgeToneForStatus(status: string): string {
  if (status === "approved") return "success";
  if (status === "rejected") return "critical";
  return "warning";
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

type ReviewRow = Awaited<
  ReturnType<typeof listReviewsForAdmin>
>["reviews"][number];

function ReviewRowCard({
  review,
  onModerate,
  isModerating,
}: {
  review: ReviewRow;
  onModerate: (reviewId: string, status: ReviewStatus) => void;
  isModerating: boolean;
}) {
  const replyFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  useEffect(() => {
    if (replyFetcher.data && "ok" in replyFetcher.data && replyFetcher.data.ok) {
      shopify.toast.show("Reply saved");
    } else if (replyFetcher.data && "error" in replyFetcher.data && replyFetcher.data.error) {
      shopify.toast.show(replyFetcher.data.error, { isError: true });
    }
  }, [replyFetcher.data, shopify]);

  return (
    <s-box
      padding="base"
      borderWidth="base"
      borderRadius="base"
      background="subdued"
    >
      <s-stack direction="block" gap="base">
        <s-stack direction="inline" gap="base" alignItems="center">
          <s-text type="strong">{review.product.name}</s-text>
          <s-badge tone={badgeToneForStatus(review.status) as never}>
            {review.status}
          </s-badge>
          <s-text color="subdued">{review.source}</s-text>
          <s-text color="subdued">
            {new Date(review.createdAt).toLocaleDateString()}
          </s-text>
        </s-stack>

        <s-stack direction="inline" gap="base" alignItems="center">
          <s-text type="strong">{review.customerName}</s-text>
          <s-text>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</s-text>
          <s-text color="subdued">({review.rating}/5)</s-text>
        </s-stack>

        {review.title && <s-text type="strong">{review.title}</s-text>}
        <s-paragraph>{truncate(review.body, 120)}</s-paragraph>

        {review.media.length > 0 && (
          <s-stack direction="inline" gap="small">
            {review.media.map((m) =>
              m.type === "video" ? (
                <a key={m.id} href={m.url} target="_blank" rel="noreferrer">
                  <video
                    src={m.url}
                    muted
                    preload="metadata"
                    style={{
                      width: "64px",
                      height: "64px",
                      objectFit: "cover",
                      borderRadius: "4px",
                    }}
                  />
                </a>
              ) : (
                <a key={m.id} href={m.url} target="_blank" rel="noreferrer">
                  <img
                    src={m.url}
                    alt="Review media"
                    width={64}
                    height={64}
                    style={{ objectFit: "cover", borderRadius: "4px" }}
                  />
                </a>
              )
            )}
          </s-stack>
        )}

        {review.merchantReply && (
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="base"
          >
            <s-text type="strong">Merchant reply: </s-text>
            <s-text>{review.merchantReply}</s-text>
          </s-box>
        )}

        <s-stack direction="inline" gap="base">
          <s-button
            variant="secondary"
            disabled={review.status === "approved" || isModerating}
            onClick={() => onModerate(review.id, "approved")}
          >
            Approve
          </s-button>
          <s-button
            variant="secondary"
            tone="critical"
            disabled={review.status === "rejected" || isModerating}
            onClick={() => onModerate(review.id, "rejected")}
          >
            Reject
          </s-button>
        </s-stack>

        <replyFetcher.Form method="post">
          <input type="hidden" name="intent" value="reply" />
          <input type="hidden" name="reviewId" value={review.id} />
          <s-stack direction="block" gap="small">
            <s-text-area
              label="Merchant reply"
              name="reply"
              rows={2}
              defaultValue={review.merchantReply ?? ""}
            ></s-text-area>
            <s-button
              variant="tertiary"
              type="submit"
              {...(replyFetcher.state !== "idle" ? { loading: true } : {})}
            >
              Save reply
            </s-button>
          </s-stack>
        </replyFetcher.Form>
      </s-stack>
    </s-box>
  );
}

export default function Reviews() {
  const { reviews, total, products, status, productId, batchId, plan, blastCapRemaining } =
    useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();
  const moderateFetcher = useFetcher<typeof action>();
  const createFetcher = useFetcher<typeof action>();
  const summaryFetcher = useFetcher<typeof action>();
  const bulkModerateFetcher = useFetcher<typeof action>();
  const blastPreviewFetcher = useFetcher<typeof action>();
  const blastRunFetcher = useFetcher<typeof action>();
  const [blastSinceDays, setBlastSinceDays] = useState(30);
  const shopify = useAppBridge();

  const blastPreview =
    blastPreviewFetcher.data && "preview" in blastPreviewFetcher.data
      ? blastPreviewFetcher.data.preview
      : null;

  useEffect(() => {
    if (blastRunFetcher.data && "run" in blastRunFetcher.data && blastRunFetcher.data.run) {
      shopify.toast.show(`Requested reviews for ${blastRunFetcher.data.run.created} past buyers`);
    } else if (blastRunFetcher.data && "error" in blastRunFetcher.data && blastRunFetcher.data.error) {
      shopify.toast.show(blastRunFetcher.data.error, { isError: true });
    }
  }, [blastRunFetcher.data, shopify]);

  useEffect(() => {
    if (blastPreviewFetcher.data && "error" in blastPreviewFetcher.data && blastPreviewFetcher.data.error) {
      shopify.toast.show(blastPreviewFetcher.data.error, { isError: true });
    }
  }, [blastPreviewFetcher.data, shopify]);

  const handleBlastPreview = () => {
    const form = new FormData();
    form.set("intent", "blast-preview");
    form.set("sinceDays", String(blastSinceDays));
    blastPreviewFetcher.submit(form, { method: "post" });
  };

  const handleBlastRun = () => {
    const form = new FormData();
    form.set("intent", "blast-run");
    form.set("sinceDays", String(blastSinceDays));
    blastRunFetcher.submit(form, { method: "post" });
  };

  useEffect(() => {
    if (
      bulkModerateFetcher.data &&
      "ok" in bulkModerateFetcher.data &&
      bulkModerateFetcher.data.ok
    ) {
      shopify.toast.show(`Batch updated (${bulkModerateFetcher.data.count} reviews)`);
    } else if (
      bulkModerateFetcher.data &&
      "error" in bulkModerateFetcher.data &&
      bulkModerateFetcher.data.error
    ) {
      shopify.toast.show(bulkModerateFetcher.data.error, { isError: true });
    }
  }, [bulkModerateFetcher.data, shopify]);

  const handleBulkModerate = (newStatus: ReviewStatus) => {
    const form = new FormData();
    form.set("intent", "bulk-moderate");
    form.set("importBatchId", batchId);
    form.set("status", newStatus);
    bulkModerateFetcher.submit(form, { method: "post" });
  };

  useEffect(() => {
    if (
      summaryFetcher.data &&
      "ok" in summaryFetcher.data &&
      summaryFetcher.data.ok
    ) {
      shopify.toast.show("AI summary regenerated");
    } else if (summaryFetcher.data && "error" in summaryFetcher.data && summaryFetcher.data.error) {
      shopify.toast.show(summaryFetcher.data.error, { isError: true });
    }
  }, [summaryFetcher.data, shopify]);

  useEffect(() => {
    if (
      createFetcher.data &&
      "ok" in createFetcher.data &&
      createFetcher.data.ok
    ) {
      shopify.toast.show("Review created");
    } else if (createFetcher.data && "error" in createFetcher.data && createFetcher.data.error) {
      shopify.toast.show(createFetcher.data.error, { isError: true });
    }
  }, [createFetcher.data, shopify]);

  useEffect(() => {
    if (moderateFetcher.data && "error" in moderateFetcher.data && moderateFetcher.data.error) {
      shopify.toast.show(moderateFetcher.data.error, { isError: true });
    }
  }, [moderateFetcher.data, shopify]);

  const handleModerate = (reviewId: string, newStatus: ReviewStatus) => {
    const form = new FormData();
    form.set("intent", "moderate");
    form.set("reviewId", reviewId);
    form.set("status", newStatus);
    moderateFetcher.submit(form, { method: "post" });
  };

  return (
    <s-page heading="Reviews">
      <s-section heading={`Moderation queue (${total})`}>
        <s-stack direction="inline" gap="base" alignItems="end">
          <s-select
            label="Status"
            name="status"
            value={status}
            onChange={(e: Event) => {
              const value = (e.target as HTMLSelectElement).value;
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                if (value) next.set("status", value);
                else next.delete("status");
                return next;
              });
            }}
          >
            <s-option value="">All</s-option>
            {REVIEW_STATUSES.map((s) => (
              <s-option key={s} value={s}>
                {s}
              </s-option>
            ))}
          </s-select>

          <s-select
            label="Product"
            name="productId"
            value={productId}
            onChange={(e: Event) => {
              const value = (e.target as HTMLSelectElement).value;
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                if (value) next.set("productId", value);
                else next.delete("productId");
                return next;
              });
            }}
          >
            <s-option value="">All products</s-option>
            {products.map((p) => (
              <s-option key={p.id} value={p.id}>
                {p.name}
              </s-option>
            ))}
          </s-select>
        </s-stack>

        {batchId && (
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-stack direction="inline" gap="base" alignItems="center">
              <s-text>
                Filtered to import batch <s-text type="strong">{batchId}</s-text>
              </s-text>
              <s-button
                variant="secondary"
                disabled={bulkModerateFetcher.state !== "idle"}
                onClick={() => handleBulkModerate("approved")}
              >
                Approve batch
              </s-button>
              <s-button
                variant="secondary"
                tone="critical"
                disabled={bulkModerateFetcher.state !== "idle"}
                onClick={() => handleBulkModerate("rejected")}
              >
                Reject batch
              </s-button>
            </s-stack>
          </s-box>
        )}

        <s-stack direction="block" gap="base">
          {reviews.length === 0 && (
            <s-paragraph color="subdued">No reviews match this filter.</s-paragraph>
          )}
          {reviews.map((review) => (
            <ReviewRowCard
              key={review.id}
              review={review}
              onModerate={handleModerate}
              isModerating={moderateFetcher.state !== "idle"}
            />
          ))}
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="AI summary">
        <summaryFetcher.Form method="post">
          <input type="hidden" name="intent" value="regenerate-summary" />
          <s-stack direction="block" gap="base">
            <s-select label="Product" name="productId" required>
              <s-option value="">Select a product</s-option>
              {products.map((p) => (
                <s-option key={p.id} value={p.id}>
                  {p.name}
                </s-option>
              ))}
            </s-select>
            <s-button
              variant="secondary"
              type="submit"
              {...(summaryFetcher.state !== "idle" ? { loading: true } : {})}
            >
              Regenerate AI summary
            </s-button>
          </s-stack>
        </summaryFetcher.Form>
      </s-section>

      <s-section slot="aside" heading="New review">
        <createFetcher.Form method="post">
          <input type="hidden" name="intent" value="create" />
          <s-stack direction="block" gap="base">
            <s-select label="Product" name="productId" required>
              <s-option value="">Select a product</s-option>
              {products.map((p) => (
                <s-option key={p.id} value={p.id}>
                  {p.name}
                </s-option>
              ))}
            </s-select>
            <s-text-field
              label="Customer name"
              name="customerName"
              required
            ></s-text-field>
            <s-select label="Rating" name="rating" required>
              <s-option value="">Select a rating</s-option>
              {[5, 4, 3, 2, 1].map((r) => (
                <s-option key={r} value={String(r)}>
                  {r} / 5
                </s-option>
              ))}
            </s-select>
            <s-text-field label="Title (optional)" name="title"></s-text-field>
            <s-text-area label="Review body" name="body" rows={4} required></s-text-area>
            <s-button
              variant="primary"
              type="submit"
              {...(createFetcher.state !== "idle" ? { loading: true } : {})}
            >
              Create review
            </s-button>
          </s-stack>
        </createFetcher.Form>
      </s-section>

      <s-section slot="aside" heading="Request reviews from past buyers">
        <s-stack direction="block" gap="base">
          <s-number-field
            label="Look back (days)"
            name="sinceDays"
            value={String(blastSinceDays)}
            min={1}
            max={60}
            onChange={(e: Event) => {
              const value = Number((e.target as HTMLInputElement).value);
              if (Number.isFinite(value)) setBlastSinceDays(value);
            }}
          ></s-number-field>
          <s-text color="subdued">
            Shopify only returns orders from the last 60 days for this scope.
          </s-text>
          {plan === "free" && (
            <s-text color="subdued">
              Free plan: {blastCapRemaining} of {FREE_MONTHLY_CAP} blast sends left this month.
            </s-text>
          )}

          <s-button
            variant="secondary"
            {...(blastPreviewFetcher.state !== "idle" ? { loading: true } : {})}
            onClick={handleBlastPreview}
          >
            Preview
          </s-button>

          {blastPreview && (
            <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
              <s-stack direction="block" gap="small">
                <s-text type="strong">{blastPreview.eligible} eligible</s-text>
                <s-text color="subdued">
                  Excluded: {blastPreview.excluded.suppressed} suppressed,{" "}
                  {blastPreview.excluded.alreadyReviewed} already reviewed,{" "}
                  {blastPreview.excluded.maxTouches} already contacted,{" "}
                  {blastPreview.excluded.overCap} over monthly cap
                </s-text>
                <s-button
                  variant="primary"
                  disabled={blastPreview.eligible === 0}
                  {...(blastRunFetcher.state !== "idle" ? { loading: true } : {})}
                  onClick={handleBlastRun}
                >
                  Confirm and send
                </s-button>
              </s-stack>
            </s-box>
          )}
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
