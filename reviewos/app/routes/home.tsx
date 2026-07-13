import { Link } from "react-router";
import type { Route } from "./+types/home";
import { prisma } from "~/services/db.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ReviewOS demo" },
    { name: "description", content: "ReviewOS demo product catalog." },
  ];
}

export async function loader() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
  });
  return { products };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { products } = loaderData;

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "40px 20px", fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>ReviewOS demo</h1>
      <p style={{ color: "#555", marginBottom: 32 }}>
        Pick a product to see the embeddable review widget in action.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/demo/${product.slug}`}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 16,
              textDecoration: "none",
              color: "inherit",
              display: "block",
            }}
          >
            <img
              src={product.imageUrl}
              alt={product.name}
              style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 6, marginBottom: 12 }}
            />
            <div style={{ fontWeight: 600 }}>{product.name}</div>
            <div style={{ color: "#555", fontSize: 14 }}>₹{(product.price / 100).toFixed(2)}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
