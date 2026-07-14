import type { AiProvider } from "./provider";
import { groqProvider } from "./groq";

const PROVIDERS: Record<string, AiProvider> = {
  groq: groqProvider,
};

export function getAiProvider(): AiProvider {
  const key = process.env.AI_PROVIDER ?? "groq";
  const provider = PROVIDERS[key];
  if (!provider) throw new Error(`unknown AI_PROVIDER: ${key}`);
  return provider;
}

export type { AiProvider, SummaryInput, SummaryOutput, FabricateReviewsInput, FabricatedReview } from "./provider";
