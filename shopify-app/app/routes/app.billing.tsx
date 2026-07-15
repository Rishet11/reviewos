import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate, BILLING_PLANS, BILLING_TEST } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing } = await authenticate.admin(request);

  const subscribed = await billing.check({
    plans: [...BILLING_PLANS],
    isTest: BILLING_TEST,
  });

  return { subscribed };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing } = await authenticate.admin(request);

  return billing.request({
    plan: "Pro",
    isTest: BILLING_TEST,
    returnUrl: `https://${new URL(request.url).host}/app?charge=success`,
  });
};

export default function Billing() {
  const { subscribed } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const submitting = navigation.state !== "idle";

  return (
    <s-page heading="Billing">
      <s-section heading="Pro plan">
        <s-stack direction="block" gap="base">
          <s-text type="strong">$9.99 / month</s-text>
          <s-paragraph color="subdued">14-day free trial, cancel anytime.</s-paragraph>
          <s-stack direction="block" gap="base">
            <s-text>- AI-generated review summaries</s-text>
            <s-text>- Merchant-defined review attributes</s-text>
            <s-text>- Drag-and-drop theme blocks</s-text>
            <s-text>- Marketplace rating aggregation</s-text>
          </s-stack>
          {subscribed ? (
            <s-badge tone="success">Active plan: Pro</s-badge>
          ) : (
            <form method="post">
              <s-button
                variant="primary"
                type="submit"
                {...(submitting ? { loading: true } : {})}
              >
                Subscribe
              </s-button>
            </form>
          )}
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
