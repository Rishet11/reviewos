import type { WidgetState } from "../types";
import { esc } from "../helpers";
import { getPreviewUrl, MAX_MEDIA_PER_REVIEW } from "../media-upload";

export function renderWriteModal(state: WidgetState): string {
  if (!state.writeOpen) return "";

  if (state.writeSuccess) {
    return `
      <div class="rvos-modal-overlay" data-action="close-write">
        <div class="rvos-modal" role="dialog" aria-modal="true">
          <button type="button" class="rvos-modal__close" data-action="close-write" aria-label="Close">&times;</button>
          <div class="rvos-success">
            <div class="rvos-success__icon">&#10003;</div>
            <h3>Thanks for your review!</h3>
            <p>It's been submitted and will appear once it's approved by moderation.</p>
            <button type="button" class="rvos-btn rvos-btn--primary" data-action="close-write">Done</button>
          </div>
        </div>
      </div>
    `;
  }

  const attrFields = state.attributeDefs
    .map((def) => {
      const options = def.options
        .map((opt) => `<option value="${esc(opt)}">${esc(opt)}</option>`)
        .join("");
      return `
        <label class="rvos-field">
          <span>${esc(def.label)}</span>
          <select name="attr__${esc(def.key)}" class="rvos-select">
            <option value="">Select…</option>
            ${options}
          </select>
        </label>
      `;
    })
    .join("");

  const error = state.writeError
    ? `<div class="rvos-form-error">${esc(state.writeError)}</div>`
    : "";

  const mediaPreviews = state.writeMediaFiles
    .map((file, i) => {
      const isImage = file.type.startsWith("image/");
      const preview = isImage
        ? `<img src="${getPreviewUrl(file)}" alt="${esc(file.name)}" class="rvos-media-preview__thumb" />`
        : `<div class="rvos-media-preview__video-icon" aria-hidden="true">&#9654;</div>`;
      return `
        <div class="rvos-media-preview">
          ${preview}
          <span class="rvos-media-preview__name">${esc(file.name)}</span>
          <button type="button" class="rvos-media-preview__remove" data-action="remove-write-media" data-index="${i}" aria-label="Remove ${esc(file.name)}" ${state.writeMediaUploading ? "disabled" : ""}>&times;</button>
        </div>
      `;
    })
    .join("");

  const mediaSubmitting = state.writeMediaUploading;
  const canAddMoreMedia = state.writeMediaFiles.length < MAX_MEDIA_PER_REVIEW;

  return `
    <div class="rvos-modal-overlay" data-action="close-write">
      <div class="rvos-modal" role="dialog" aria-modal="true">
        <button type="button" class="rvos-modal__close" data-action="close-write" aria-label="Close">&times;</button>
        <h3 class="rvos-modal__title">Write a review</h3>
        <form data-action="submit-write" class="rvos-form">
          <label class="rvos-field">
            <span>Your name</span>
            <input type="text" name="customerName" required maxlength="80" />
          </label>
          <div class="rvos-field">
            <span>Rating</span>
            <div class="rvos-rating-input" data-rating-input>
              ${[1, 2, 3, 4, 5]
                .map(
                  (n) =>
                    `<button type="button" class="rvos-star-btn ${n <= state.writeRating ? "rvos-star-btn--filled" : ""}" data-action="set-write-rating" data-value="${n}" aria-label="${n} star">&#9733;</button>`
                )
                .join("")}
            </div>
            <input type="hidden" name="rating" value="${state.writeRating}" />
          </div>
          <label class="rvos-field">
            <span>Title</span>
            <input type="text" name="title" maxlength="120" />
          </label>
          <label class="rvos-field">
            <span>Review</span>
            <textarea name="body" required rows="4" maxlength="2000"></textarea>
          </label>
          ${attrFields}
          <div class="rvos-field">
            <span>Photos / videos (optional, up to ${MAX_MEDIA_PER_REVIEW})</span>
            ${mediaPreviews ? `<div class="rvos-media-previews">${mediaPreviews}</div>` : ""}
            ${
              canAddMoreMedia
                ? `<input type="file" data-action="add-write-media" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime" multiple ${mediaSubmitting ? "disabled" : ""} />`
                : ""
            }
          </div>
          ${error}
          <button type="submit" class="rvos-btn rvos-btn--primary" ${state.writeSubmitting || mediaSubmitting ? "disabled" : ""}>
            ${mediaSubmitting ? "Uploading…" : state.writeSubmitting ? "Submitting…" : "Submit review"}
          </button>
        </form>
      </div>
    </div>
  `;
}
