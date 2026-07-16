import crypto from "node:crypto";
import type { ActionFunctionArgs } from "react-router";
import { dispatchDueReviewRequests } from "../services/review-requests-dispatch.server";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

// Phase 6 Slice C: secret-guarded trigger for the review-request send job.
// No queue/Redis infra exists yet (deferred to Phase 8), and this app
// deploys to Render/Fly (persistent Node, not serverless), so:
//   - Production: a Render Cron Job POSTs here every ~15 min.
//   - Dev: trigger manually, e.g.
//       curl -X POST http://localhost:3000/api/review-requests/dispatch \
//         -H "x-cron-secret: $CRON_SECRET"
// When Phase 8's BullMQ+Redis lands, only the trigger swaps to a queue
// processor calling dispatchDueReviewRequests() directly.
export async function action({ request }: ActionFunctionArgs) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret");
  if (!expected || !provided || !safeEqual(provided, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json(await dispatchDueReviewRequests());
}
