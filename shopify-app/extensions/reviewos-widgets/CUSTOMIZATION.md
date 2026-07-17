# ReviewOS Widget Customization

This is the stable override contract for theme developers and merchants adding custom CSS in the theme editor (Custom CSS block, `theme.liquid` additional CSS, or a theme app extension override). Do not rely on internal implementation details not listed here; they can change without notice. Everything below is considered stable.

## CSS custom properties

Set on `.rvos-widget` or an ancestor to affect all ReviewOS blocks under it. Blocks also expose `--reviewos-accent` and, on the review-feed block, `--rvos-feed-columns` inline via block settings; both can be overridden downstream in your own CSS.

| Variable | Default | Purpose |
|---|---|---|
| `--rvos-accent` | `#1a56db` | Primary accent (buttons, active states, star fill on hover) |
| `--rvos-accent-hover` | `#1544ad` | Accent hover/active shade |
| `--rvos-accent-contrast` | `#ffffff` | Text/icon color on top of accent backgrounds |
| `--rvos-text` | `#17171a` | Primary text color |
| `--rvos-muted` | `#6b7280` | Secondary/muted text |
| `--rvos-border` | `#e7e8ec` | Border color for cards, inputs, dividers |
| `--rvos-bg` | `#ffffff` | Base background |
| `--rvos-bg-subtle` | `#f8f9fb` | Subtle background (tracks, hovers, chips) |
| `--rvos-star` | `#d8dae0` | Unfilled star color |
| `--rvos-star-filled` | `#f5a623` | Filled star color |
| `--rvos-radius` | `12px` | Corner radius for cards/modals |
| `--rvos-radius-sm` | `8px` | Corner radius for chips/inputs/buttons |
| `--rvos-danger` | `#dc2626` | Error/destructive state color |
| `--rvos-success` | `#16794c` | Success state color |
| `--rvos-shadow-sm` | `0 1px 2px rgba(16, 24, 40, 0.04)` | Light elevation shadow |
| `--rvos-shadow-md` | `0 4px 16px rgba(16, 24, 40, 0.08)` | Modal/hover elevation shadow |
| `--rvos-ease` | `cubic-bezier(0.22, 1, 0.36, 1)` | Transition easing |
| `--rvos-feed-columns` | `2` | Column count for review-feed grid layout (set by the block's Grid columns setting) |

## Stable class names

Every class below is part of the supported override surface. `__` denotes an element within a component, `--` denotes a modifier.

**Layout / shell**: `rvos-widget`, `rvos-loading`, `rvos-empty`, `rvos-error`

**Summary header**: `rvos-summary`, `rvos-summary__score`, `rvos-summary__count`, `rvos-summary__meta`, `rvos-summary__write`

**AI summary**: `rvos-ai-summary`, `rvos-ai-summary--loading`, `rvos-ai-summary__badge`, `rvos-ai-summary__header`, `rvos-ai-summary__text`, `rvos-ai-summary__lists`, `rvos-ai-summary__pros`, `rvos-ai-summary__cons`, `rvos-ai-summary__pro`, `rvos-ai-summary__con`, `rvos-ai-summary__caption`

**Ratings distribution**: `rvos-distribution`, `rvos-dist-row`, `rvos-dist-row--active`, `rvos-dist-row__label`, `rvos-dist-row__bar`, `rvos-dist-row__fill`, `rvos-dist-row__count`

**Filters**: `rvos-filters`, `rvos-filter-group`, `rvos-filter-group__label`, `rvos-filter-group__options`, `rvos-chip`, `rvos-chip--active`, `rvos-active-filters`, `rvos-active-chip`

**Review feed**: `rvos-feed__toolbar`, `rvos-feed__total`, `rvos-feed__list`, `rvos-feed__load-more`. The mount `<div data-reviewos>` carries `data-layout="list|grid|carousel"`, which switches `.rvos-feed__list` layout via attribute selectors (see Layout section below).

**Review card**: `rvos-card`, `rvos-card__head`, `rvos-card__author`, `rvos-card__date`, `rvos-card__title`, `rvos-card__body`, `rvos-card__media`, `rvos-card__thumb`, `rvos-card__reply`, `rvos-card__reply-label`, `rvos-stars`, `rvos-star`, `rvos-star--filled`, `rvos-helpful`, `rvos-badge`, `rvos-badge--marketplace`

**Media gallery / lightbox**: `rvos-gallery__strip`, `rvos-gallery__thumb`, `rvos-gallery__title`, `rvos-gallery__more`, `rvos-lightbox`, `rvos-lightbox__content`, `rvos-lightbox__image`, `rvos-lightbox__meta`, `rvos-lightbox__author`, `rvos-lightbox__snippet`, `rvos-lightbox__close`, `rvos-lightbox__nav`, `rvos-lightbox__nav--prev`, `rvos-lightbox__nav--next`

**Write-review form**: `rvos-form`, `rvos-form-error`, `rvos-field`, `rvos-select`, `rvos-rating-input`, `rvos-star-btn`, `rvos-star-btn--filled`, `rvos-media-previews`, `rvos-media-preview`, `rvos-media-preview__thumb`, `rvos-media-preview__video-icon`, `rvos-media-preview__name`, `rvos-media-preview__remove`, `rvos-btn`, `rvos-btn--primary`, `rvos-btn--outline`, `rvos-success`, `rvos-success__icon`, `rvos-link`

**Modal**: `rvos-modal-overlay`, `rvos-modal`, `rvos-modal__title`, `rvos-modal__close`

**Trust badges**: `rvos-trust-badge`, `rvos-trust-badge__logo`, `rvos-trust-badge__fallback`, `rvos-trust-badge__name`, `rvos-trust-badge__count`, `rvos-trust-badges__row`, `rvos-trust-badges__combined`

## Review-feed layout presets

The review-feed block's Layout setting (List / Grid / Carousel) sets `data-layout` on the mount div. Grid columns are controlled by `--rvos-feed-columns` (set from the block's Grid columns setting, 2-4). List is the default and unstyled by attribute selector.

## Examples

**1. Recolor to match a theme's brand palette**

```css
.rvos-widget {
  --rvos-accent: #d4361c;
  --rvos-accent-hover: #a82a15;
  --rvos-star-filled: #d4361c;
}
```

**2. Restyle review cards (square corners, thicker border)**

```css
.rvos-card {
  border-radius: 0;
  border-width: 2px;
}
```

**3. Hide the "write a review" link in the summary header**

```css
.rvos-summary__write {
  display: none;
}
```
