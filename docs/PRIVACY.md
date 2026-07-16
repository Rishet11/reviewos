# ReviewOS Privacy Policy

Last updated: 2026-07-17

Purpose: this document explains what personal data ReviewOS collects when installed on a merchant's Shopify store, why, who else can see it, and how data subjects can exercise their rights.

## 1. Who this applies to

ReviewOS is a Shopify app installed by merchants ("merchant," "you") to collect and display product reviews. This policy covers personal data belonging to the merchant's customers ("shoppers," "reviewers") that passes through ReviewOS while the app operates on the merchant's store.

ReviewOS is operated by a single developer with no employees. There is no separate legal or support team; the contact below reaches the operator directly.

## 2. What we collect and why

| Data | Source | Purpose |
|---|---|---|
| Customer email | Shopify order webhooks (`order.email` or `order.customer.email`) | Match a submitted review to a real order ("verified buyer" badge); send a post-purchase review-request email |
| Shopify customer ID (`admin_graphql_api_id`) | Shopify order webhooks | Internal reference key for matching reviews to orders |
| Order and fulfillment state | `orders/paid`, `orders/fulfilled`, `orders/cancelled` webhooks | Time review-request emails to send only after fulfillment, and determine eligibility |
| Reviewer name, rating, review text | Submitted directly by the reviewer through the review form | Displayed as the review; the name shown is whatever the reviewer typed, not pulled from Shopify customer records |
| Review images | Uploaded by the reviewer through the review form | Displayed alongside the review |

Email and customer ID are the only protected customer data fields ReviewOS reads from Shopify. ReviewOS does not collect phone numbers, physical addresses, or payment data, and has no access to them through the APIs it uses.

Review text is sent to Groq (see Sub-processors) to generate a cached AI summary. Summaries are generated once and stored; they are not regenerated on every page view.

ReviewOS does not sell personal data to any third party. It does not use personal data to make automated decisions that have a legal or similarly significant effect on a shopper; the only automated processing of review content is text summarization.

## 3. Legal basis and purpose limitation

Data is processed only to run the reviews feature the merchant has installed: verifying reviewers as real buyers, sending review-request emails the merchant configured, and displaying reviews and summaries on the merchant's storefront. The basis for this processing is the merchant's need to perform the service under its own agreement with its customers, and (for review-request emails) the customer's transactional relationship with the merchant, combined with an unsubscribe mechanism.

ReviewOS follows data minimization: only the fields listed above are read from Shopify. No additional Shopify Admin API scopes are requested beyond what is needed for orders and product data used by the reviews feature.

## 4. Sub-processors

| Sub-processor | What it handles |
|---|---|
| Render | Hosts the ReviewOS web application (application servers) |
| Neon | Managed PostgreSQL database in production; stores reviews, order-matching data, and cached summaries. Encrypts data at rest and takes automated encrypted backups |
| Cloudflare R2 | Stores review images uploaded by reviewers. Encrypts data at rest |
| Resend | Delivers transactional review-request emails |
| Groq | Receives review text to generate AI summaries. Summaries are cached in the database, not regenerated per page load |

All data in transit between ReviewOS and these providers, and between ReviewOS and Shopify, moves over HTTPS/TLS.

## 5. Data subject rights

Shoppers whose data passes through ReviewOS can exercise their rights through Shopify's standard GDPR/CCPA compliance mechanism, which ReviewOS implements and handles at `/webhooks/compliance`:

- **Access request** (`customers/data_request`): ReviewOS locates any stored data tied to the requested customer and returns it to the merchant/Shopify per the webhook contract.
- **Customer redaction** (`customers/redact`): ReviewOS deletes or anonymizes the customer's email, customer ID, and any personal data tied to that customer.
- **Shop redaction** (`shop/redact`): sent by Shopify after uninstall plus the required waiting period; ReviewOS deletes the shop's stored data.

Shoppers who no longer want review-request emails can opt out through the signed unsubscribe link included in every email, handled at `/api/review-requests/unsubscribe`. Opting out stops future review-request emails to that address.

Requests can also be sent directly to the contact below.

## 6. Data retention

Retention periods per data type are defined in `DATA-RETENTION.md`. In summary: reviewer content is kept while the review is published and the app remains installed; email/customer-ID data used for verification and review requests is kept only as long as needed for that purpose and is deleted on redaction request; all categories are purged on the relevant Shopify compliance webhook.

## 7. Merchant Data Processing Terms

This section governs the processing relationship between the merchant and ReviewOS and functions as the data processing terms referenced in the merchant's use of the app.

- **Roles.** The merchant is the data controller for its customers' personal data. ReviewOS acts as a data processor, processing personal data only to provide the reviews service as configured by the merchant.
- **Instructions.** ReviewOS processes personal data solely on the merchant's instructions, meaning solely to operate the features the merchant has installed and configured (review collection, verified-buyer matching, review-request emails, AI summaries, widget display). ReviewOS does not use merchant customer data for any other purpose.
- **Sub-processors.** ReviewOS uses the sub-processors listed in Section 4 to provide the service. The merchant consents to their use for these purposes.
- **Deletion.** On app uninstall, ReviewOS deletes shop data upon receiving the `shop/redact` webhook (sent by Shopify after its standard waiting period). On a specific customer redaction request, ReviewOS deletes that customer's personal data upon receiving `customers/redact`.
- **Compliance webhooks.** ReviewOS implements and responds to Shopify's `customers/data_request`, `customers/redact`, and `shop/redact` webhooks as described in Section 5.
- **Security.** ReviewOS applies the security controls described in `SECURITY.md`, including encryption in transit and at rest and access limited to the app operator.

## 8. Contact

Privacy questions, access requests, or deletion requests: **rishetmehra11@gmail.com**. Published publicly at `/privacy` on the app domain (https://reviewos-6p4p.onrender.com/privacy).
