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

export type MarketplaceStat = {
  id: string;
  rating: number;
  reviewCount: number;
  url: string;
  source: {
    name: string;
    logoUrl: string;
    baseUrl: string;
  };
};

export type AiSummary = {
  pros: string[];
  cons: string[];
  summaryText: string;
  reviewCount: number;
  scope: string;
  cohortKey: string;
};

export type WidgetState = {
  apiBase: string;
  productSlug: string;
  blocks: Set<string>;
  loading: boolean;
  error: string | null;

  product: Product | null;
  summary: Summary | null;
  attributeDefs: AttributeDef[];

  aiSummary: AiSummary | null;
  aiSummaryLoading: boolean;

  marketplaceStats: MarketplaceStat[];

  lightboxIndex: number | null;
  lightboxReturnIndex: number | null;
  galleryReviews: Review[];

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

  // Files the customer picked in the write-review form, in selection order
  // (capped at MAX_MEDIA_PER_REVIEW client-side; server re-caps too).
  writeMediaFiles: File[];
  // Cache of already-uploaded results for the current writeMediaFiles set.
  // Invalidated (set to null) whenever a file is added/removed. This lets a
  // retry after a review-submission failure skip re-uploading files that
  // already made it to storage.
  writeMediaUploaded: import("./media-upload").UploadedMedia[] | null;
  writeMediaUploading: boolean;
};
