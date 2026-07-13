export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  price: number;
  imageUrl: string;
};

export type ReviewMedia = { id: string; type: string; url: string };

export type Review = {
  id: string;
  customerName: string;
  rating: number;
  title: string | null;
  body: string;
  helpfulCount: number;
  merchantReply: string | null;
  merchantRepliedAt: string | null;
  verifiedBuyer: boolean;
  verifiedMarketplace: boolean;
  attributes: string;
  media: ReviewMedia[];
  createdAt: string;
};

export type AttributeDef = {
  id: string;
  key: string;
  label: string;
  options: string[];
  display: boolean;
};

export type Summary = {
  average: number;
  count: number;
  byStar: Record<string, number>;
};

export type Sort = "recent" | "helpful" | "rating_desc" | "rating_asc";

export type WidgetState = {
  apiBase: string;
  productSlug: string;
  blocks: Set<string>;
  loading: boolean;
  error: string | null;

  product: Product | null;
  summary: Summary | null;
  attributeDefs: AttributeDef[];

  reviews: Review[];
  total: number;
  page: number;
  pageSize: number;
  reviewsLoading: boolean;
  votedIds: Record<string, true>;

  ratingFilter: number | null;
  attrFilters: Record<string, string>;
  sort: Sort;

  writeOpen: boolean;
  writeRating: number;
  writeSubmitting: boolean;
  writeSuccess: boolean;
  writeError: string | null;
};
