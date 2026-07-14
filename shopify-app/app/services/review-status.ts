// Client-safe review-status constants. NOT a `.server` module and imports no
// Prisma — so it can be referenced from both server services and client route
// components (the moderation status dropdown). Keeping this out of
// reviews.server.ts is what lets the admin route render on the client.
export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
