import { useFetcher } from "react-router";
import type { Route } from "./+types/admin";
import { prisma } from "~/services/db.server";
import { createReview } from "~/services/reviews.server";
import { getAttributeDefinitions } from "~/services/attributes.server";
import { getOrGenerateSummary } from "~/services/ai/summaries.server";
import { getAiProvider } from "~/services/ai";

const GENERATE_COUNT = 8;

export function meta() {
  return [{ title: "ReviewOS admin (demo)" }];
}

export async function loader() {
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  return { products };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get("intent"));
  const productId = String(formData.get("productId"));

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return { ok: false, productId, error: "Product not found." };
  }

  try {
    if (intent === "generate-reviews") {
      const attributeDefs = await getAttributeDefinitions(product.category);
      const provider = getAiProvider();
      const fabricated = await provider.fabricateReviews({
        productName: product.name,
        productCategory: product.category,
        productDescription: product.description,
        attributeDefs: attributeDefs.map((d) => ({ key: d.key, label: d.label, options: d.options })),
        count: GENERATE_COUNT,
      });

      for (const r of fabricated) {
        await createReview({
          productId: product.id,
          customerName: r.customerName,
          rating: r.rating,
          title: r.title,
          body: r.body,
          attributes: JSON.stringify(r.attributes),
          source: "ai-demo",
          status: "approved",
          createdAt: new Date(Date.now() - r.daysAgo * 86400000),
        });
      }

      return { ok: true, productId, intent, count: fabricated.length };
    }

    if (intent === "regenerate-summary") {
      const summary = await getOrGenerateSummary(product.id, "overall", {}, true);
      return { ok: true, productId, intent, generated: summary !== null };
    }

    return { ok: false, productId, error: "Unknown action." };
  } catch (err) {
    return { ok: false, productId, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export default function Admin({ loaderData }: Route.ComponentProps) {
  const { products } = loaderData;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">ReviewOS admin (demo)</h1>
      <p className="mb-8 text-gray-500">
        Generate fabricated demo reviews and refresh AI summaries per product.
      </p>

      <div className="flex flex-col gap-3">
        {products.map((product) => (
          <ProductRow key={product.id} product={product} />
        ))}
      </div>
    </main>
  );
}

function ProductRow({ product }: { product: { id: string; name: string; slug: string } }) {
  const generateFetcher = useFetcher();
  const summaryFetcher = useFetcher();

  const generateResult = generateFetcher.data as { ok: boolean; error?: string; count?: number } | undefined;
  const summaryResult = summaryFetcher.data as { ok: boolean; error?: string; generated?: boolean } | undefined;

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-medium text-gray-900">{product.name}</div>
          <div className="text-sm text-gray-400">/demo/{product.slug}</div>
        </div>
        <div className="flex gap-2">
          <generateFetcher.Form method="post">
            <input type="hidden" name="intent" value="generate-reviews" />
            <input type="hidden" name="productId" value={product.id} />
            <button
              type="submit"
              disabled={generateFetcher.state !== "idle"}
              className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {generateFetcher.state !== "idle" ? "Generating…" : "Generate AI demo reviews"}
            </button>
          </generateFetcher.Form>
          <summaryFetcher.Form method="post">
            <input type="hidden" name="intent" value="regenerate-summary" />
            <input type="hidden" name="productId" value={product.id} />
            <button
              type="submit"
              disabled={summaryFetcher.state !== "idle"}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {summaryFetcher.state !== "idle" ? "Refreshing…" : "Regenerate summary"}
            </button>
          </summaryFetcher.Form>
        </div>
      </div>

      {generateResult && (
        <div className={`mt-2 text-sm ${generateResult.ok ? "text-emerald-700" : "text-red-600"}`}>
          {generateResult.ok ? `Added ${generateResult.count} reviews.` : generateResult.error}
        </div>
      )}
      {summaryResult && (
        <div className={`mt-2 text-sm ${summaryResult.ok ? "text-emerald-700" : "text-red-600"}`}>
          {summaryResult.ok
            ? summaryResult.generated
              ? "Summary regenerated."
              : "Not enough reviews to generate a summary."
            : summaryResult.error}
        </div>
      )}
    </div>
  );
}
