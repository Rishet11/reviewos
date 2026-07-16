# ReviewOS Data Retention Policy

Last updated: 2026-07-17

Purpose: this document defines how long each category of personal and review data is kept, and what triggers deletion.

## 1. Retention periods by data type

| Data type | Retention period | Notes |
|---|---|---|
| Published reviews (reviewer name, rating, review text) | While the merchant's app remains installed and the review remains published | Deleted on merchant uninstall (after `shop/redact`) or on a specific customer redaction request tied to that review's author |
| Customer email / Shopify customer ID (verified-buyer matching, review requests) | While needed to verify a review or send the associated review request, and for as long as the app is installed | Deleted immediately on a `customers/redact` request; deleted on `shop/redact` at uninstall |
| Review media (images) | Same as the review it belongs to | Removed when the parent review is deleted; orphaned media is cleared by the periodic media sweep (see Section 3) |
| Cached AI summaries | While the underlying reviews they summarize exist | Regenerated only when underlying review content changes meaningfully; deleted along with the product's review data on uninstall or redaction |
| Session / auth data (merchant admin sessions, Shopify OAuth tokens) | For the duration of an active session or until the app is uninstalled | Revoked and deleted on uninstall |

ReviewOS does not keep any of the above indefinitely once its purpose has been served or a compliance webhook requires deletion.

## 2. Deletion triggers

- **App uninstall** (`shop/redact` webhook, sent by Shopify after its standard waiting period following uninstall): ReviewOS deletes all shop data, including reviews, reviewer content, customer email/ID records, cached summaries, and review media tied to that shop.
- **Customer redaction request** (`customers/redact` webhook): ReviewOS deletes or anonymizes the specific customer's email, customer ID, and any personal data tied to that customer. Review text left by that customer may be retained in anonymized form (rating and text without the identifying fields) if the merchant needs to preserve the review record; identifying data is removed.
- **Data access request** (`customers/data_request` webhook): ReviewOS does not delete data on this trigger; it compiles and returns the requested customer's stored data per the webhook contract.
- **Email unsubscribe** (`/api/review-requests/unsubscribe`): stops future review-request emails to that address. It does not delete already-stored order-matching data by itself; a full redaction still requires a `customers/redact` request.

## 3. Media cleanup

A periodic media sweep job removes orphaned review images from Cloudflare R2, images no longer referenced by any review (e.g., because the parent review was deleted or a customer was redacted). This keeps stored media in sync with the review data it belongs to.

## 4. Backups

Neon takes automated encrypted backups of the production database as part of its managed service. Data deleted via a compliance webhook is removed from the live database immediately; backups age out on Neon's standard backup retention cycle rather than being individually purged, consistent with normal managed-database backup practice.
