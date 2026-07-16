# Lighthouse Baseline — Before App Install (2026-07-16)

Store: `https://reviewos.myshopify.com` (password-protected dev store)
ReviewOS app status: **UNINSTALLED** — this is the clean "before" baseline per Shopify's
App Store storefront-performance methodology.

Methodology: mobile Lighthouse, performance category only, 3 runs per page, median per page,
weighted average = home 17% + product 40% + collection 43%. Shopify requires an app to cost
no more than 10 points off this baseline after install.

## Results

| Page | URL | Run 1 | Run 2 | Run 3 | Median |
|---|---|---|---|---|---|
| Home | https://reviewos.myshopify.com/ | 89 | 89 | 76 | **89** |
| Product | https://reviewos.myshopify.com/products/the-collection-snowboard-liquid | 90 | 90 | 82 | **90** |
| Collection | https://reviewos.myshopify.com/collections/all | 82 | 96 | 97 | **96** |

## Weighted baseline score

```
(89 × 0.17) + (90 × 0.40) + (96 × 0.43) = 92.41
```

**Weighted baseline: 92.41 / 100**

Post-install budget: ≥ 82.41 (Shopify's ≤10-point-cost rule).

## Notes

- No pages failed to load. Paywall bypass worked for all three page types (home, product,
  collection) — verified before each Lighthouse run by confirming the response is not a
  redirect to `/password` and does not contain the `storefront_password` form.
- The password-gate cookie mechanism observed on this store is **`_shopify_essential`**
  (an httpOnly cookie set on the `POST /password` response), not a separate `storefront_digest`
  cookie as sometimes cited. The runner script auto-detects and uses whichever cookie Shopify
  actually issues.
- Run-to-run variance was moderate (home swung 76-89, collection swung 82-97), typical for
  local headless Lighthouse without CPU/network throttling calibration; median-of-3 is used to
  reduce noise per the standard methodology.
- Runner script: `/Users/rishetmehra/Desktop/ReviewOS/shopify-app/scripts/lighthouse-7e.mjs`
- Raw run log: session scratchpad `lh-full-run.log` (not committed).

## Rerun command (for the "after install" pass)

```bash
cd /Users/rishetmehra/Desktop/ReviewOS/shopify-app
node scripts/lighthouse-7e.mjs
```

Optional env overrides: `STORE_URL`, `STORE_PASSWORD`, `PRODUCT_PATH`, `COLLECTION_PATH`,
`RUNS_PER_PAGE` (default 3).
