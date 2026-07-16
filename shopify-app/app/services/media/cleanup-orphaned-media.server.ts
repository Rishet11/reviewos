import { prisma } from "../db.server";
import { deleteReviewMediaObject } from "../../lib/r2.server";

const DEFAULT_OLDER_THAN_MS = 24 * 60 * 60 * 1000;

// Deletes PendingReviewMedia rows (and their R2 objects) older than the
// cutoff. These are uploads a customer presigned and PUT to R2 but never
// finished submitting a review for (abandoned form, browser closed, etc.),
// so createReview never claimed/deleted the tracking row. One bad delete
// (R2 object already gone, network blip) is logged and skipped rather than
// aborting the whole sweep.
export async function sweepOrphanedMedia(olderThanMs = DEFAULT_OLDER_THAN_MS) {
  const cutoff = new Date(Date.now() - olderThanMs);
  const rows = await prisma.pendingReviewMedia.findMany({
    where: { createdAt: { lt: cutoff } },
  });

  let swept = 0;
  for (const row of rows) {
    try {
      await deleteReviewMediaObject(row.storageKey);
    } catch (err) {
      console.error("sweepOrphanedMedia: failed to delete R2 object", {
        storageKey: row.storageKey,
        err,
      });
      continue;
    }

    try {
      await prisma.pendingReviewMedia.delete({ where: { id: row.id } });
      swept++;
    } catch (err) {
      console.error("sweepOrphanedMedia: failed to delete tracking row", {
        id: row.id,
        err,
      });
    }
  }

  return { swept };
}
