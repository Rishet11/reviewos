import type { Review, WidgetState } from "../types";
import { esc, stars } from "../helpers";

const VISIBLE_CAP = 8;

export type GalleryPhoto = { url: string; review: Review };

export function getGalleryPhotos(state: WidgetState): GalleryPhoto[] {
  const photos: GalleryPhoto[] = [];
  for (const review of state.galleryReviews) {
    for (const media of review.media) {
      if (media.type === "image") photos.push({ url: media.url, review });
    }
  }
  return photos;
}

export function renderUgcGallery(state: WidgetState): string {
  const photos = getGalleryPhotos(state);
  if (photos.length === 0) return "";

  const visible = photos.slice(0, VISIBLE_CAP);
  const extraCount = photos.length - visible.length;

  const thumbs = visible
    .map(
      (photo, i) => `
        <button type="button" class="rvos-gallery__thumb" data-action="open-lightbox" data-photo-index="${i}">
          <img src="${esc(photo.url)}" alt="Photo from ${esc(photo.review.customerName)}" loading="lazy" />
        </button>
      `
    )
    .join("");

  const moreTile =
    extraCount > 0
      ? `<button type="button" class="rvos-gallery__thumb rvos-gallery__more" data-action="open-lightbox" data-photo-index="${visible.length}">
          <span>+${extraCount} more</span>
        </button>`
      : "";

  return `
    <div class="rvos-gallery">
      <div class="rvos-gallery__title">Photos from customers</div>
      <div class="rvos-gallery__strip">${thumbs}${moreTile}</div>
    </div>
  `;
}

export function renderLightbox(state: WidgetState): string {
  if (!state.blocks.has("ugc-gallery")) return "";
  if (state.lightboxIndex === null) return "";

  const photos = getGalleryPhotos(state);
  const index = state.lightboxIndex;
  const photo = photos[index];
  if (!photo) return "";

  const { review } = photo;
  const snippet = review.title || review.body;

  return `
    <div class="rvos-lightbox" data-action="close-lightbox" tabindex="-1" role="dialog" aria-modal="true">
      <button type="button" class="rvos-lightbox__close" data-action="close-lightbox" aria-label="Close">&times;</button>
      ${
        index > 0
          ? `<button type="button" class="rvos-lightbox__nav rvos-lightbox__nav--prev" data-action="lightbox-prev" aria-label="Previous photo">&#8249;</button>`
          : ""
      }
      ${
        index < photos.length - 1
          ? `<button type="button" class="rvos-lightbox__nav rvos-lightbox__nav--next" data-action="lightbox-next" aria-label="Next photo">&#8250;</button>`
          : ""
      }
      <div class="rvos-lightbox__content">
        <img class="rvos-lightbox__image" src="${esc(photo.url)}" alt="Photo from ${esc(review.customerName)}" />
        <div class="rvos-lightbox__meta">
          <div class="rvos-lightbox__author">${esc(review.customerName)}</div>
          <div class="rvos-stars">${stars(review.rating)}</div>
          <div class="rvos-lightbox__snippet">${esc(snippet)}</div>
        </div>
      </div>
    </div>
  `;
}
