import type { MarketplaceStatsProvider } from "./provider";

// Empty registry: no real provider is implemented yet (Slice 4 is a skeleton).
const registry = new Map<string, MarketplaceStatsProvider>();

// KILL SWITCH: getProvider only ever returns a provider when
// MARKETPLACE_LIVE_FETCH_ENABLED === "true" AND the key is registered. This
// env var must stay unset/false in production until live-fetch is explicitly
// cleared for release, and Phase 5b live-fetch code must never ship in an
// App Store submission build. Do not remove or weaken this check.
export function getProvider(key: string): MarketplaceStatsProvider | undefined {
  if (process.env.MARKETPLACE_LIVE_FETCH_ENABLED !== "true") return undefined;
  return registry.get(key);
}
