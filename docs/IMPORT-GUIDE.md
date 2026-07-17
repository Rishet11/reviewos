# How to Import Reviews

Upload a CSV file to bulk-add reviews. One row per review.

## Column Guide

| Column | Required | What to put |
|--------|----------|-------------|
| `product_handle` | Yes | Product URL handle (e.g., `vitamin-c-serum`). Found in your product URLs. |
| `customer_name` | Yes | Shopper's display name. |
| `customer_email` | No | Used for verification emails. Leave blank if unknown. |
| `rating` | Yes | 1 to 5. |
| `title` | No | Short summary. |
| `body` | Yes | The review text. |
| `created_at` | No | Date in YYYY-MM-DD format. Defaults to today if blank. |
| `external_ref` | No | Your order/reference ID. Helps with lookups. |

## Import from Judge.me or Loox

Use the **Source** dropdown and pick your previous platform. Export files from
Judge.me or Loox can be uploaded as-is with no column rearranging.

## How It Works

- Reviews arrive as **pending** and appear on your store only after you approve
  them in the admin panel.
- Every import can be **undone in one click** from the import history page.
- The source you select (Judge.me, Loox, or Manual CSV) is shown to shoppers
  next to each review so they know where it came from.

## Honesty Rule

Only upload real, unedited reviews written by actual customers for the exact
product listed. Never fabricate or alter reviews. The source label keeps
everything transparent for your shoppers.
