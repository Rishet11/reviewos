import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { prisma } from "../services/db.server";
import {
  deleteSource,
  deleteStat,
  listSources,
  upsertSource,
  upsertStat,
} from "../services/marketplace.server";

const STALE_THRESHOLD_DAYS = 7;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const sources = await listSources(shop);
  const stats = await prisma.marketplaceStat.findMany({
    where: { shop },
    include: { source: true, product: { select: { slug: true } } },
    orderBy: { createdAt: "desc" },
  });

  const cutoff = new Date(Date.now() - STALE_THRESHOLD_DAYS * 86_400_000);
  const staleCount = stats.filter(
    (stat) => (stat.lastCheckedAt ?? stat.updatedAt) < cutoff,
  ).length;

  return { sources, stats, staleCount, staleThresholdDays: STALE_THRESHOLD_DAYS };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const form = await request.formData();
  const intent = String(form.get("intent"));

  try {
    switch (intent) {
      case "create-source": {
        const name = String(form.get("name") ?? "").trim();
        const logoUrl = String(form.get("logoUrl") ?? "").trim();
        const baseUrl = String(form.get("baseUrl") ?? "").trim();

        if (!name || !baseUrl) {
          return { ok: false, error: "Name and base URL are required" };
        }

        await upsertSource(shop, { name, logoUrl, baseUrl });
        return { ok: true };
      }
      case "delete-source": {
        const id = String(form.get("id"));
        await deleteSource(shop, id);
        return { ok: true };
      }
      case "upsert-stat": {
        const productSlug = String(form.get("productSlug") ?? "").trim();
        const sourceId = String(form.get("sourceId") ?? "").trim();
        const rating = Number(form.get("rating"));
        const reviewCount = Number(form.get("reviewCount"));
        const url = String(form.get("url") ?? "").trim();

        if (!productSlug || !sourceId || !url || !Number.isFinite(rating) || !Number.isFinite(reviewCount)) {
          return { ok: false, error: "Product handle, source, rating, review count, and URL are required" };
        }

        await upsertStat(shop, { productSlug, sourceId, rating, reviewCount, url });
        return { ok: true };
      }
      case "delete-stat": {
        const id = String(form.get("id"));
        await deleteStat(shop, id);
        return { ok: true };
      }
      default:
        return { ok: false, error: `Unknown intent: ${intent}` };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
  }
};

type Source = Awaited<ReturnType<typeof listSources>>[number];
type Stat = Awaited<ReturnType<typeof loader>>["stats"][number];

function SourceRow({ source }: { source: Source }) {
  const deleteFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  useEffect(() => {
    if (deleteFetcher.data?.ok) {
      shopify.toast.show("Source deleted");
    }
  }, [deleteFetcher.data, shopify]);

  return (
    <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
      <s-stack direction="inline" gap="base" alignItems="center">
        <s-text type="strong">{source.name}</s-text>
        <s-text color="subdued">{source.baseUrl}</s-text>
        <deleteFetcher.Form method="post">
          <input type="hidden" name="intent" value="delete-source" />
          <input type="hidden" name="id" value={source.id} />
          <s-button
            variant="secondary"
            tone="critical"
            type="submit"
            {...(deleteFetcher.state !== "idle" ? { loading: true } : {})}
          >
            Delete
          </s-button>
        </deleteFetcher.Form>
      </s-stack>
    </s-box>
  );
}

function StatRow({ stat, staleThresholdDays }: { stat: Stat; staleThresholdDays: number }) {
  const deleteFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  useEffect(() => {
    if (deleteFetcher.data?.ok) {
      shopify.toast.show("Stat deleted");
    }
  }, [deleteFetcher.data, shopify]);

  const cutoff = Date.now() - staleThresholdDays * 86_400_000;
  const lastChecked = stat.lastCheckedAt ?? stat.updatedAt;
  const isStale = new Date(lastChecked).getTime() < cutoff;

  return (
    <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
      <s-stack direction="block" gap="small">
        <s-stack direction="inline" gap="base" alignItems="center">
          <s-badge tone="info">{stat.product.slug}</s-badge>
          <s-text type="strong">{stat.source.name}</s-text>
          <s-text color="subdued">
            {stat.rating.toFixed(1)} · {stat.reviewCount.toLocaleString()}
          </s-text>
          {isStale && <s-badge tone="warning">Stale</s-badge>}
        </s-stack>
        <s-stack direction="inline" gap="base">
          <deleteFetcher.Form method="post">
            <input type="hidden" name="intent" value="delete-stat" />
            <input type="hidden" name="id" value={stat.id} />
            <s-button
              variant="secondary"
              tone="critical"
              type="submit"
              {...(deleteFetcher.state !== "idle" ? { loading: true } : {})}
            >
              Delete
            </s-button>
          </deleteFetcher.Form>
        </s-stack>
      </s-stack>
    </s-box>
  );
}

export default function Marketplace() {
  const { sources, stats, staleCount, staleThresholdDays } = useLoaderData<typeof loader>();
  const createSourceFetcher = useFetcher<typeof action>();
  const upsertStatFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [selectedSourceId, setSelectedSourceId] = useState(sources[0]?.id ?? "");

  useEffect(() => {
    if (createSourceFetcher.data?.ok) {
      shopify.toast.show("Marketplace source saved");
    } else if (createSourceFetcher.data && !createSourceFetcher.data.ok) {
      shopify.toast.show(createSourceFetcher.data.error ?? "Something went wrong", { isError: true });
    }
  }, [createSourceFetcher.data, shopify]);

  useEffect(() => {
    if (upsertStatFetcher.data?.ok) {
      shopify.toast.show("Marketplace stat saved");
    } else if (upsertStatFetcher.data && !upsertStatFetcher.data.ok) {
      shopify.toast.show(upsertStatFetcher.data.error ?? "Something went wrong", { isError: true });
    }
  }, [upsertStatFetcher.data, shopify]);

  return (
    <s-page heading="Marketplaces">
      <s-section heading="Marketplace sources">
        <s-stack direction="block" gap="base">
          {sources.length === 0 && (
            <s-paragraph color="subdued">No marketplace sources yet.</s-paragraph>
          )}
          {sources.map((source) => (
            <SourceRow key={source.id} source={source} />
          ))}
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="New source">
        <createSourceFetcher.Form method="post">
          <input type="hidden" name="intent" value="create-source" />
          <s-stack direction="block" gap="base">
            <s-text-field label="Name" name="name" placeholder="e.g. Amazon" required></s-text-field>
            <s-text-field
              label="Base URL"
              name="baseUrl"
              placeholder="https://www.amazon.com"
              required
            ></s-text-field>
            <s-text-field
              label="Logo URL (optional)"
              name="logoUrl"
              placeholder="https://..."
              details="Only upload a marketplace logo you're licensed to use; leave blank for a text badge."
            ></s-text-field>
            <s-button
              variant="primary"
              type="submit"
              {...(createSourceFetcher.state !== "idle" ? { loading: true } : {})}
            >
              Add source
            </s-button>
          </s-stack>
        </createSourceFetcher.Form>
      </s-section>

      <s-section heading="Product stats">
        <s-stack direction="block" gap="base">
          {staleCount > 0 && (
            <s-banner tone="warning">
              {staleCount} marketplace stat{staleCount === 1 ? "" : "s"} {staleCount === 1 ? "is" : "are"} older
              than {staleThresholdDays} days.
            </s-banner>
          )}
          {stats.length === 0 && (
            <s-paragraph color="subdued">No marketplace stats yet.</s-paragraph>
          )}
          {stats.map((stat) => (
            <StatRow key={stat.id} stat={stat} staleThresholdDays={staleThresholdDays} />
          ))}
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="New / update stat">
        <upsertStatFetcher.Form method="post">
          <input type="hidden" name="intent" value="upsert-stat" />
          <s-stack direction="block" gap="base">
            <s-text-field
              label="Product handle"
              name="productSlug"
              placeholder="e.g. the-collection-snowboard-liquid"
              required
            ></s-text-field>
            <s-select
              label="Source"
              name="sourceId"
              value={selectedSourceId}
              onChange={(e: Event) => setSelectedSourceId((e.target as HTMLSelectElement).value)}
              required
            >
              {sources.map((source) => (
                <s-option key={source.id} value={source.id}>
                  {source.name}
                </s-option>
              ))}
            </s-select>
            <s-number-field
              label="Rating"
              name="rating"
              step={0.1}
              placeholder="4.6"
              required
            ></s-number-field>
            <s-number-field
              label="Review count"
              name="reviewCount"
              placeholder="12431"
              required
            ></s-number-field>
            <s-text-field
              label="URL"
              name="url"
              placeholder="https://www.amazon.com/dp/..."
              required
            ></s-text-field>
            <s-button
              variant="primary"
              type="submit"
              {...(upsertStatFetcher.state !== "idle" ? { loading: true } : {})}
            >
              Save stat
            </s-button>
          </s-stack>
        </upsertStatFetcher.Form>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
