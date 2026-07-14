import type { LoaderFunctionArgs } from "react-router";

// TODO: Shopify signs proxy requests with a `signature` query param;
// production code must verify it before trusting the request.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  return Response.json({
    ok: true,
    app: "reviewos",
    route: "app-proxy-root",
  });
};
