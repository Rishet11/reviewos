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

export interface AiProvider {
  generateSummary(input: SummaryInput): Promise<SummaryOutput>;
}
