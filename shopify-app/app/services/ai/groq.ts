import type { AiProvider, SummaryInput, SummaryOutput } from "./provider";

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

export const groqProvider: AiProvider = { generateSummary };
