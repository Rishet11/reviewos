// Slice 4: provider skeleton for future live-fetch marketplace integrations.
// HARD RULE: no review-body text ever persisted from any provider. The return
// type below structurally cannot carry review text (numbers + count only), so
// a future implementation cannot smuggle text through this interface.
export interface MarketplaceStatsProvider {
  key: string;
  fetchStats(input: { externalRef: string; url?: string }): Promise<{
    rating: number;
    reviewCount: number;
  }>;
}
