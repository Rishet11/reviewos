# ReviewOS: Status and Next Steps

## Where we are

The demo is live on a test store, showing the full review experience. The Shopify admin panel is built and working: merchants can moderate reviews, define custom review attributes (color, size, wear pattern), and adjust settings. Next we wire the review widget into theme templates so customer reviews actually appear on product pages.

## Questions we need you to answer

### 1. What does "generate reviews" mean?
Do you mean (a) AI creating completely fake reviews with AI-generated photos and names, or (b) AI reading real customer feedback (from Amazon, marketplace exports, WhatsApp, old review files) and turning it into tags, summaries, and polished text?

Note: Approach (a) is illegal in the US and rejected by the Shopify App Store if reviews claim to be genuine customer feedback. If that's the goal, we need to know the market and positioning first.

### 2. How should marketplace reviews appear on the store?
Just show the summary ("4.4 stars, 2,300 reviews on Amazon") with a link out, or display actual review text on the product page?

### 3. Which marketplaces should we prioritize?
Rank these for your market: Amazon.in, Flipkart, Myntra, Nykaa.

### 4. WhatsApp review requests: how much setup is acceptable?
Should each brand set up their own WhatsApp Business API number with Meta (one-time, takes a day), or do you need zero setup where ReviewOS connects for them automatically?

### 5. What are the persona images for?
Are they reviewer avatars (profile pictures for summaries), or product photos meant to look like customer uploads?

## What we found (evidence-based)

- URL-paste Amazon review import works on the Shopify App Store. Opinew, Areviews, and Reputon are live with no takedowns. The practical ceiling is roughly 100 reviews per product before Amazon blocks logged-out access.
- No competitor sends review requests natively via WhatsApp yet. All route through email/SMS. This is an open gap, especially in India.
- Using AI to condense real reviews (keywords, filterable tags, summaries by customer cohort) avoids legal risk entirely and matches what competitors charge $39-199/month for. It's the strongest foundation for a paid plan.
