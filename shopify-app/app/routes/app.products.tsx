import { useEffect } from "react";
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
import { syncProductsFromCatalog } from "../services/products.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const products = await prisma.product.findMany({
    where: { shop: session.shop },
    orderBy: { name: "asc" },
  });

  return { products };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const form = await request.formData();
  const intent = String(form.get("intent"));

  switch (intent) {
    case "sync-products": {
      const result = await syncProductsFromCatalog(session.shop, admin);
      return { ok: true, result };
    }
    default:
      return { error: `Unknown intent: ${intent}` };
  }
};

export default function Products() {
  const { products } = useLoaderData<typeof loader>();
  const syncFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  useEffect(() => {
    if (syncFetcher.data && "ok" in syncFetcher.data && syncFetcher.data.ok) {
      const { created, updated, total } = syncFetcher.data.result;
      shopify.toast.show(
        `Synced ${total} products (${created} created, ${updated} updated)`
      );
    }
  }, [syncFetcher.data, shopify]);

  return (
    <s-page heading="Products">
      <s-section heading={`Catalog (${products.length})`}>
        <s-stack direction="block" gap="base">
          <syncFetcher.Form method="post">
            <input type="hidden" name="intent" value="sync-products" />
            <s-button
              variant="primary"
              type="submit"
              {...(syncFetcher.state !== "idle" ? { loading: true } : {})}
            >
              Sync from Shopify catalog
            </s-button>
          </syncFetcher.Form>

          {syncFetcher.data && "ok" in syncFetcher.data && syncFetcher.data.ok && (
            <s-text color="subdued">
              Created {syncFetcher.data.result.created}, updated{" "}
              {syncFetcher.data.result.updated}, total{" "}
              {syncFetcher.data.result.total}.
            </s-text>
          )}

          {products.length === 0 && (
            <s-paragraph color="subdued">
              No products yet. Sync from your Shopify catalog to populate this
              list.
            </s-paragraph>
          )}

          {products.map((product) => (
            <s-box
              key={product.id}
              padding="base"
              borderWidth="base"
              borderRadius="base"
              background="subdued"
            >
              <s-stack direction="inline" gap="base" alignItems="center">
                <s-text type="strong">{product.name}</s-text>
                <s-text color="subdued">/{product.slug}</s-text>
                {product.category && (
                  <s-text color="subdued">({product.category})</s-text>
                )}
              </s-stack>
            </s-box>
          ))}
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
