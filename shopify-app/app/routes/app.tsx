import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate, BILLING_PLANS, BILLING_TEST } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, redirect } = await authenticate.admin(request);

  const url = new URL(request.url);
  if (url.pathname !== "/app/billing") {
    await billing.require({
      plans: [...BILLING_PLANS],
      isTest: BILLING_TEST,
      // Use the App Bridge-aware redirect from authenticate.admin so the embedded
      // host/id_token params survive; a plain react-router redirect drops them and
      // the iframe bounce renders a bare status code instead of the billing page.
      onFailure: async () => redirect("/app/billing"),
    });
  }

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/reviews">Reviews</s-link>
        <s-link href="/app/reviews/import">Import reviews</s-link>
        <s-link href="/app/products">Products</s-link>
        <s-link href="/app/attributes">Attributes</s-link>
        <s-link href="/app/marketplace">Marketplaces</s-link>
        <s-link href="/app/settings">Settings</s-link>
        <s-link href="/app/channels">Channels</s-link>
        <s-link href="/app/billing">Billing</s-link>
        <s-link href="/app/additional">Additional page</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
