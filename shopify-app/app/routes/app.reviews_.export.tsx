import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { exportReviewsCsv } from "../services/review-import.server";

// Resource route (loader-only) so "Export CSV" can be a plain link the
// browser navigates to and saves as a file, rather than a fetcher POST that
// would just return text with no download prompt.
export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const csv = await exportReviewsCsv(session.shop);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reviews-export.csv"`,
    },
  });
}
