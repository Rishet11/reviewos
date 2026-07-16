# ReviewOS — Shopify App Store Listing Package

Draft for submission. Placeholders marked below must be filled before the form is submitted.

---

## 1. App name (30 char max) + tagline (62 char max)

App name options:
1. `ReviewOS` (8 chars)
2. `ReviewOS: AI Reviews` (20 chars)
3. `ReviewOS Reviews + AI` (21 chars)

Tagline options (62 char limit, App Store enforces this on the listing page):
1. `AI review summaries that change with each shopper's filter` (60 chars)
2. `Reviews, photos, and marketplace ratings, AI-summarized` (56 chars)
3. `Cohort-aware AI review summaries, no coding required` (54 chars)

Recommendation: name #1 (`ReviewOS`) + tagline #1. Short name reads clean in search results and app cards; tagline #1 names the actual differentiator instead of a generic claim.

---

## 2. App introduction (100 char) + app details paragraph (500 char)

**App introduction** (100 char limit):
```
AI review summaries that adapt per shopper cohort, plus marketplace trust badges.
```
(82 chars)

**App details** (500 char limit):
```
ReviewOS collects photo and video reviews, verifies buyers against your order
history, and moderates everything in one queue. Its AI summary rewrites itself
when a shopper filters by an attribute you define, skin type, shoe width,
whatever matters for your products, so "what do buyers say" answers the
question they actually asked. Add your Amazon, Flipkart, or Nykaa ratings as
trust badges with link-outs. 8 drag-and-drop blocks, no template edits. 14-day
free trial.
```
(487 chars)

---

## 3. Feature list (5-6 bullets, ≤80 chars each)

- Cohort AI summaries: rewrites per shopper-picked attribute, not one static blurb
- 8 drag-and-drop theme blocks: feed, star badge, filters, AI summary, gallery
- Photo and video reviews with verified-buyer badges from real order data
- Marketplace trust badges: your Amazon/Flipkart/Nykaa ratings, linked out
- Post-purchase review request emails, 3-touch max, one-click unsubscribe
- Syncs Shopify's standard reviews.rating metafield for Shop app eligibility

---

## 4. Screenshot shot-list (1600x900, desktop, per App Store image specs)

1. **Admin moderation queue**
   Capture: embedded Polaris admin, moderation queue tab with 4-5 pending reviews showing star rating, photo thumbnail, verified-buyer badge, approve/reject/reply buttons visible.
   Caption: `Moderate every review in one queue. Approve, reject, or reply without leaving admin.`

2. **Theme editor with blocks**
   Capture: Shopify theme editor side panel open on a product page template, showing the app block list (review-feed, star-badge, ai-summary, etc.) with one selected and its settings panel expanded.
   Caption: `Drag 8 review blocks onto any page. No liquid, no developer needed.`

3. **Cohort AI summary swap (storefront)**
   Capture: two-panel or before/after shot of the storefront review section: filter chip unselected showing the general AI summary, then a cohort filter (e.g. "Dry skin") clicked showing the summary text visibly changed to reference that cohort.
   Caption: `Click a filter, the AI summary rewrites itself for that exact shopper.`

4. **Trust badges block (storefront)**
   Capture: storefront trust-badges block showing 2-3 marketplace logos (Amazon, Flipkart, Nykaa) each with a rating, review count, and "See reviews on Amazon" link-out, positioned near the product buy box.
   Caption: `Show your Amazon and Flipkart ratings on-store, linked back to the source.`

5. **Write-review form with photo upload**
   Capture: storefront write-review modal or inline form, star selector filled in, title/body fields with sample text, photo upload widget showing one attached thumbnail, submit button visible.
   Caption: `Shoppers upload photos and videos straight from the review form.`

6. **Review-request email**
   Capture: rendered post-purchase review-request email (in an email client preview or browser render), showing product name/image, star-rating prompt, "Write a review" CTA button, and unsubscribe link in the footer.
   Caption: `Automatic review request after delivery. Three tries max, unsubscribe always visible.`

All screenshots: 1600x900 px, desktop viewport, no browser chrome, real (not lorem ipsum) sample data.

---

## 5. Search keywords/terms (10)

1. product reviews
2. photo reviews
3. AI review summary
4. review app
5. star ratings
6. video reviews
7. verified buyer reviews
8. trust badges
9. review request email
10. UGC reviews

---

## 6. Demo store, support, privacy policy placeholders

- Demo store URL: `[PLACEHOLDER: reviewos-demo.myshopify.com, password TBD]`
- Support contact: `[PLACEHOLDER: support@reviewos.app]`
- Support/docs URL: `[PLACEHOLDER: https://reviewos.app/support]`
- Privacy policy URL: `[PLACEHOLDER: https://reviewos.app/privacy]`
  **REQUIRED before submission.** Shopify's app listing form rejects submission without a live, reachable privacy policy URL. Must cover: order data used for verified-buyer badges, customer email used for review-request emails, GDPR webhook behavior (customers/redact, customers/data_request, shop/redact), and R2 storage of uploaded photos/videos. Draft this against the actual data flows in `app/services/gdpr.server.ts` before publishing the URL.

---

## 7. Category + pricing plan copy

**Category recommendation:** Store design > Product reviews / Marketing > Reviews (Shopify's "Reviews" app category). This is where Judge.me, Loox, Okendo, Yotpo, and Stamped are all listed, so buyers comparing this category will see ReviewOS in the same results.

**Pricing plan listing copy:**

```
Pro — $9.99/mo
14-day free trial

Everything you need to collect, moderate, and display reviews that convert:
- Unlimited reviews, photos, and videos
- Cohort AI summaries (rewrite per shopper-defined filter)
- 8 theme-editor blocks, drag-and-drop
- Marketplace trust badges (Amazon, Flipkart, Nykaa, and more)
- Verified-buyer badges from order history
- Post-purchase review request emails
- Syncs Shopify's standard review metafields
```

Pricing note: at $9.99/mo, ReviewOS undercuts every AI-capable competitor's paid tier (Judge.me $15, Fera $39, Okendo $119, Yotpo $169, Stamped $199, per docs/RESEARCH.md 2026-07-15). Lead with that gap in App Store marketing copy outside the listing form itself (blog, ads), not inside the 500-char details field where space is tight.

---

## Do not claim yet (confirmed not shipped)

Do not reference these in any listing copy, screenshot, or support page until built: CSV import from Judge.me/Loox, AI review chat, WhatsApp review requests, live marketplace fetch/scraping connector. All four are roadmap items (Phase 5b, Phase 7d, v2 backlog) and are excluded from this submission build per ROADMAP.md.
