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

      <main className="mx-auto max-w-6xl px-6 py-10">
        <Link to="/" className="text-sm text-gray-500 transition-colors hover:text-gray-900">
          &larr; All products
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="aspect-square overflow-hidden rounded-2xl bg-gray-50">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex flex-col lg:pt-4">
            <h1 className="text-3xl font-semibold tracking-tight text-balance text-gray-900">
              {product.name}
            </h1>
            <div className="mt-3 text-2xl font-semibold text-gray-900">₹{priceRupees}</div>
            <p className="mt-5 max-w-md text-base leading-relaxed text-pretty text-gray-600">
              {product.description}
            </p>
            <button
              type="button"
              className="mt-8 w-full max-w-xs rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 sm:w-auto"
              onClick={() => alert("Added to cart (demo only)")}
            >
              Add to cart
            </button>
          </div>
        </div>

        <hr className="my-14 border-gray-200" />

        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-xl font-semibold tracking-tight text-gray-900">
            Customer reviews
          </h2>
          {/*
            This mirrors exactly how a third-party storefront (e.g. a Shopify theme)
            would embed the widget: a script tag loading the built bundle, plus a
            host div carrying the mount config as data attributes. No React here.
          */}
          <div
            data-reviewos
            data-product={product.slug}
            data-api=""
            data-blocks="ai-summary,summary,trust-badges,distribution,filters,ugc-gallery,feed,write"
          />
        </div>
      </main>

      <link rel="stylesheet" href="/widget/reviewos.css" />
      <script src="/widget/reviewos.js" defer />
    </div>
  );
}
