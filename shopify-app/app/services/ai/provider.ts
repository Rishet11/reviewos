export type SummaryInput = {
  productName: string;
  productCategory: string;
  reviews: { rating: number; title: string | null; body: string }[];
};

export type SummaryOutput = {
  pros: string[];
  cons: string[];
  summaryText: string;
};

export type FabricatedReview = {
  customerName: string;
  rating: number;
  title: string;
  body: string;
  attributes: Record<string, string>;
  daysAgo: number;
};

export type FabricateReviewsInput = {
  productName: string;
  productCategory: string;
  productDescription: string;
  attributeDefs: { key: string; label: string; options: string[] }[];
  count: number;
};

export interface AiProvider {
  generateSummary(input: SummaryInput): Promise<SummaryOutput>;
  fabricateReviews(input: FabricateReviewsInput): Promise<FabricatedReview[]>;
}
