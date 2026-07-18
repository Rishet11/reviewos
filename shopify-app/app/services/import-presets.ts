// Plain (non-.server) module: preset ids are needed by the client component
// (dropdown) in app.reviews.import.tsx, so this can't live in
// review-import.server.ts (that module pulls in prisma/node "crypto" and
// would be bundled into the client if imported from the component).

export type Preset = "judgeme" | "loox" | "generic";

export const PRESETS: Preset[] = ["judgeme", "loox", "generic"];
