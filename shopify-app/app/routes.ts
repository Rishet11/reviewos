import { flatRoutes } from "@react-router/fs-routes";

// Exclude colocated test files from route generation. Without this, a file like
// app/routes/webhooks.whatsapp.test.ts is registered as a phantom route and typegen
// emits a +types/*.test.ts stub that vitest then collects as an empty (failing) suite.
export default flatRoutes({
  ignoredRouteFiles: ["**/*.test.{ts,tsx}"],
});
