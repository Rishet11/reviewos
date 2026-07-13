import type { CSSProperties } from "react";
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
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px", fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>ReviewOS admin (demo)</h1>
      <p style={{ color: "#555", marginBottom: 32 }}>
        Generate fabricated demo reviews and refresh AI summaries per product.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 600 }}>{product.name}</div>
          <div style={{ color: "#888", fontSize: 13 }}>/demo/{product.slug}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <generateFetcher.Form method="post">
            <input type="hidden" name="intent" value="generate-reviews" />
            <input type="hidden" name="productId" value={product.id} />
            <button type="submit" disabled={generateFetcher.state !== "idle"} style={btnStyle}>
              {generateFetcher.state !== "idle" ? "Generating…" : "Generate AI demo reviews"}
            </button>
          </generateFetcher.Form>
          <summaryFetcher.Form method="post">
            <input type="hidden" name="intent" value="regenerate-summary" />
            <input type="hidden" name="productId" value={product.id} />
            <button type="submit" disabled={summaryFetcher.state !== "idle"} style={btnStyle}>
              {summaryFetcher.state !== "idle" ? "Refreshing…" : "Regenerate summary"}
            </button>
          </summaryFetcher.Form>
        </div>
      </div>

      {generateResult && (
        <div style={{ marginTop: 8, fontSize: 13, color: generateResult.ok ? "#16794c" : "#dc2626" }}>
          {generateResult.ok
            ? `Added ${generateResult.count} reviews.`
            : generateResult.error}
        </div>
      )}
      {summaryResult && (
        <div style={{ marginTop: 8, fontSize: 13, color: summaryResult.ok ? "#16794c" : "#dc2626" }}>
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

const btnStyle: CSSProperties = {
  background: "#1a56db",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "8px 14px",
  fontSize: 13,
  cursor: "pointer",
};
