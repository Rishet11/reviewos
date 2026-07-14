import type { AttributeDef, Sort } from "./types";

const RESERVED = new Set(["rating", "sort", "page"]);

export function readFiltersFromUrl(attributeDefs: AttributeDef[]) {
  const params = new URLSearchParams(window.location.search);
  const attrFilters: Record<string, string> = {};
  const keys = new Set(attributeDefs.map((d) => d.key));

  for (const [key, value] of params.entries()) {
    if (keys.has(key) && !RESERVED.has(key)) {
      attrFilters[key] = value;
    }
  }

  const ratingParam = params.get("rating");
  const rating = ratingParam ? Number(ratingParam) : null;
  const sort = (params.get("sort") as Sort) || "recent";

  return { attrFilters, rating, sort };
}

export function writeFiltersToUrl(
  attrFilters: Record<string, string>,
  rating: number | null,
  sort: Sort,
  push = false
) {
  const params = new URLSearchParams(window.location.search);

  for (const key of Array.from(params.keys())) {
    if (RESERVED.has(key) || attrFilters[key] !== undefined) {
      params.delete(key);
    }
  }

  for (const [key, value] of Object.entries(attrFilters)) {
    params.set(key, value);
  }
  if (rating) params.set("rating", String(rating));
  if (sort !== "recent") params.set("sort", sort);

  const query = params.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  if (push) {
    window.history.pushState(null, "", url);
  } else {
    window.history.replaceState(null, "", url);
  }
}
