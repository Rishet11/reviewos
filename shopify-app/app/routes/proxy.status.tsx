import type { LoaderFunctionArgs } from "react-router";
import { requireProxy } from "../lib/proxy-verify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { shop } = requireProxy(request);

  return Response.json({
    ok: true,
    app: "reviewos",
    route: "app-proxy",
    path: "/apps/reviewos/status",
    shop,
  });
};
