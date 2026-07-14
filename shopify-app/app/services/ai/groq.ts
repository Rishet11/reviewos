import type {
  AiProvider,
  SummaryInput,
  SummaryOutput,
  FabricateReviewsInput,
  FabricatedReview,
} from "./provider";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

async function chatJSON(prompt: string): Promise<any> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`groq request failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("groq returned no content");

  try {
    return JSON.parse(content);
  } catch {
    throw new Error("groq returned invalid JSON");
  }
}

async function generateSummary(input: SummaryInput): Promise<SummaryOutput> {
  const reviewLines = input.reviews
    .map((r, i) => `${i + 1}. [${r.rating}/5] ${r.title ?? ""}: ${r.body}`)
    .join("\n");

  const prompt = `You are summarizing customer reviews for a product called "${input.productName}" (category: ${input.productCategory}).

Reviews:
${reviewLines}

Return strict JSON with this exact shape, no markdown, no extra keys:
{"pros": ["short phrase", ...], "cons": ["short phrase", ...], "summaryText": "2-3 sentence plain summary"}

Rules: pros and cons are each 2-4 short phrases drawn only from what reviewers actually said. If there are no clear cons, return an empty array for cons. Do not invent details not supported by the reviews.`;

  const parsed = await chatJSON(prompt);
  return {
    pros: Array.isArray(parsed.pros) ? parsed.pros.filter((p: unknown) => typeof p === "string") : [],
    cons: Array.isArray(parsed.cons) ? parsed.cons.filter((c: unknown) => typeof c === "string") : [],
    summaryText: typeof parsed.summaryText === "string" ? parsed.summaryText : "",
  };
}

async function fabricateReviews(input: FabricateReviewsInput): Promise<FabricatedReview[]> {
  const attrLines = input.attributeDefs
    .map((a) => `- ${a.key} (${a.label}): one of [${a.options.join(", ")}]`)
    .join("\n") || "(no attributes defined for this product)";

  const prompt = `Generate ${input.count} realistic, varied customer reviews for this product:

Name: ${input.productName}
Category: ${input.productCategory}
Description: ${input.productDescription}

Available attributes reviewers may report on:
${attrLines}

Return strict JSON: {"reviews": [{"customerName": "First L.", "rating": 1-5, "title": "short title", "body": "2-4 sentences, realistic tone", "attributes": {"key": "chosen option value"}, "daysAgo": 1-180}, ...]}

Rules: vary ratings (mostly 4-5, a couple of 2-3), vary tone and length, only include attribute keys from the list above with values from their given options, use plausible but generic names, no markdown.`;

  const parsed = await chatJSON(prompt);
  const reviews = Array.isArray(parsed.reviews) ? parsed.reviews : [];

  return reviews
    .filter((r: any) => r && typeof r.body === "string" && typeof r.rating === "number")
    .map((r: any) => ({
      customerName: typeof r.customerName === "string" ? r.customerName : "Anonymous",
      rating: Math.min(5, Math.max(1, Math.round(r.rating))),
      title: typeof r.title === "string" ? r.title : "",
      body: r.body,
      attributes:
        r.attributes && typeof r.attributes === "object" ? r.attributes : {},
      daysAgo: typeof r.daysAgo === "number" ? r.daysAgo : 30,
    }));
}

export const groqProvider: AiProvider = { generateSummary, fabricateReviews };
