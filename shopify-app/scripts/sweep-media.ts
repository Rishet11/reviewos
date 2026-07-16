// CLI entry for the orphaned-media sweep (run via `npm run cleanup:media`).
// Deletes PendingReviewMedia rows (+ their R2 objects) older than 24h that
// were never claimed by a submitted review.
import { sweepOrphanedMedia } from "../app/services/media/cleanup-orphaned-media.server";

sweepOrphanedMedia()
  .then(({ swept }) => {
    console.log(`sweepOrphanedMedia: swept ${swept} orphaned media object(s)`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("sweepOrphanedMedia failed", err);
    process.exit(1);
  });
