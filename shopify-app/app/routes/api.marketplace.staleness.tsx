import crypto from "node:crypto";
import type { ActionFunctionArgs } from "react-router";
import { runStalenessSweep } from "../services/marketplace-staleness.server";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

// Slice 4: secret-guarded trigger for the marketplace staleness digest,
// mirroring api.review-requests.dispatch.tsx. Intended weekly cadence via a
// Render Cron Job:
//   curl -X POST http://localhost:3000/api/marketplace/staleness \
//     -H "x-cron-secret: $CRON_SECRET"
//
// Pro-gating TODO: the digest email is meant to be Pro-only, but per-shop
// billing.check() needs a request-scoped admin API client, which a headless
// cron trigger doesn't have. Wiring an unauthenticated/offline billing lookup
// is deferred until billing test-mode is settled - v1 sweeps all shops
// (isProLookup left unset). The badge/banner in app.marketplace.tsx are
// unaffected by this - they stay free-tier visible per spec.
export async function action({ request }: ActionFunctionArgs) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret");
  if (!expected || !provided || !safeEqual(provided, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json(await runStalenessSweep());
}
