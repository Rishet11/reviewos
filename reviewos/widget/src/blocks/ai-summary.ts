import type { WidgetState } from "../types";
import { esc } from "../helpers";

export function renderAiSummary(state: WidgetState): string {
  if (state.aiSummaryLoading) {
    return `<div class="rvos-ai-summary rvos-ai-summary--loading">Generating AI summary…</div>`;
  }

  const summary = state.aiSummary;
  if (!summary) return "";

  const filterCount = Object.keys(state.attrFilters).length;
  const caption =
    filterCount > 0
      ? `AI summary of ${summary.reviewCount} review${summary.reviewCount === 1 ? "" : "s"} matching ${filterCount} filter${filterCount === 1 ? "" : "s"}`
      : `AI summary of ${summary.reviewCount} review${summary.reviewCount === 1 ? "" : "s"}`;

  const pros = summary.pros
    .map((p) => `<li class="rvos-ai-summary__pro">${esc(p)}</li>`)
    .join("");
  const cons = summary.cons
    .map((c) => `<li class="rvos-ai-summary__con">${esc(c)}</li>`)
    .join("");

  return `
    <div class="rvos-ai-summary">
      <div class="rvos-ai-summary__header">
        <span class="rvos-ai-summary__badge">&#10022; AI summary</span>
      </div>
      <p class="rvos-ai-summary__text">${esc(summary.summaryText)}</p>
      ${
        summary.pros.length || summary.cons.length
          ? `<div class="rvos-ai-summary__lists">
              ${pros ? `<ul class="rvos-ai-summary__pros">${pros}</ul>` : ""}
              ${cons ? `<ul class="rvos-ai-summary__cons">${cons}</ul>` : ""}
            </div>`
          : ""
      }
      <div class="rvos-ai-summary__caption">${esc(caption)}</div>
    </div>
  `;
}
