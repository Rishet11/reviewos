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
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="text-lg font-semibold tracking-tight text-gray-900">
            Glow Lab
          </Link>
          <nav className="hidden gap-8 text-sm font-medium text-gray-600 sm:flex">
            <span>Shop</span>
            <span>Skincare</span>
            <span>About</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10 max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-balance text-gray-900">
            Shop the collection
          </h1>
          <p className="mt-3 text-base leading-relaxed text-gray-600">
            A ReviewOS demo storefront. Pick a product to see the embeddable review widget
            running on a real product page.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Link
              key={product.id}
              to={`/demo/${product.slug}`}
              className="group block overflow-hidden rounded-xl border border-gray-200 transition-shadow hover:shadow-md"
            >
              <div className="aspect-square overflow-hidden bg-gray-50">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <div className="font-medium text-gray-900">{product.name}</div>
                <div className="mt-1 text-sm text-gray-500">
                  ₹{(product.price / 100).toFixed(2)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
