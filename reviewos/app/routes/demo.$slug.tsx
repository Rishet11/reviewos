import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/demo.$slug";
import { prisma } from "~/services/db.server";

export async function loader({ params }: Route.LoaderArgs) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
  });

  if (!product) {
    throw new Response("Not found", { status: 404 });
  }

  return { product };
}

export function meta() {
  return [{ title: "ReviewOS demo" }];
}

export default function DemoProduct() {
  const { product } = useLoaderData<typeof loader>();
  const priceRupees = (product.price / 100).toFixed(2);

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px", fontFamily: "sans-serif" }}>
      <Link to="/" style={{ color: "#1a56db", fontSize: 14 }}>
        &larr; All products
      </Link>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 380px) 1fr",
          gap: 32,
          marginTop: 20,
          marginBottom: 48,
        }}
      >
        <img
          src={product.imageUrl}
          alt={product.name}
          style={{ width: "100%", borderRadius: 8, objectFit: "cover" }}
        />
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 8 }}>{product.name}</h1>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>₹{priceRupees}</div>
          <p style={{ color: "#444", lineHeight: 1.6, marginBottom: 24 }}>{product.description}</p>
          <button
            type="button"
            style={{
              background: "#1a56db",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "12px 24px",
              fontSize: 15,
              cursor: "pointer",
            }}
            onClick={() => alert("Added to cart (demo only)")}
          >
            Add to cart
          </button>
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", marginBottom: 32 }} />

      {/*
        This mirrors exactly how a third-party storefront (e.g. a Shopify theme)
        would embed the widget: a script tag loading the built bundle, plus a
        host div carrying the mount config as data attributes. No React here.
      */}
      <div
        data-reviewos
        data-product={product.slug}
        data-api=""
        data-blocks="ai-summary,summary,distribution,filters,feed,write"
      />
      <link rel="stylesheet" href="/widget/reviewos.css" />
      <script src="/widget/reviewos.js" defer />
    </main>
  );
}
