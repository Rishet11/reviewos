import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("api/products/:slug", "routes/api.products.$slug.ts"),
  route("api/reviews", "routes/api.reviews.ts"),
  route("api/reviews/:id/helpful", "routes/api.reviews.$id.helpful.ts"),
  route("api/attributes", "routes/api.attributes.ts"),
  route("api/marketplace", "routes/api.marketplace.ts"),
] satisfies RouteConfig;
