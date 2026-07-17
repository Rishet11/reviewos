# ReviewOS: What's Live, What's Built, What's Next

## What You Can Demo Right Now

The review system is working end-to-end. After someone buys a product, they get an email asking for a review. If they bought it before, we show a verified-buyer badge. Customers can upload photos with reviews. The AI reads all reviews and shows you a summary that changes when you filter by star rating or custom attributes (like "color" or "size"). You get a star breakdown chart. Marketplace ratings from Amazon and other platforms show up as badges on your product pages. And there's a moderation dashboard to approve, edit, or remove reviews.

## This Week We Built Five Things

**CSV review importer**: You can upload reviews from Judge.me, Loox, or any CSV file with the right columns. You get a preview of what will import, an approval queue, and an undo button if something goes wrong. Unlike Judge.me's Chrome extension (which caps at 20 reviews per export), our importer handles the entire file.

**Request reviews from past customers**: Click a button, pick how many days back to look (up to 60), and we show you exactly who gets invited and why some customers are skipped. Invitations space out safely so you do not flood your email.

**New widget layouts**: Reviews can display as a list, grid, or carousel. Theme developers can restyle everything using the documented CSS structure. It fits any design.

**Staleness reminders**: Marketplace badge numbers update once a week. If your Amazon or Flipkart ratings go stale, we remind you to refresh them so customers always see current numbers.

**WhatsApp review requests**: Instead of email, we can send review requests through WhatsApp using your own WhatsApp Business account. We are in final testing now.

## You Were Right About the Mechanism

Judge.me has no secret Amazon connection. It is a Chrome extension that exports reviews to CSV, plus an upload feature. Your instinct that "get your own reviews and upload the file" is the standard play was exactly right. That is what every platform does. We built that correctly.

## Why We Will Not Scrape Amazon

In May 2026, Amazon removed review text from its public pages. Scrapers now have nothing reliable to read. More importantly, one app scraping reviews for hundreds of brands means every brand's legal risk sits on a single point of failure. Shopify does not allow that at review time. When you upload your own file, Shopify approves it because the reviews are real, from your actual customers, unedited, and you show where they came from. We display "Reviewed on Amazon" next to each imported review.

## Why We Will Not Generate Fake Reviews

This is a business risk, not a morality debate. In India, fake reviews violate the Consumer Protection Act 2019, and the mandatory review standard IS 19000:2022 is moving toward automatic checking. Amazon removed about 600 brands and more than 3,000 seller accounts in 2021 alone for review manipulation (Aukey, Mpow, RavPower), with businesses doing crores in revenue, gone overnight. In the US, the fine is $53,088 per fake review the moment you ship to a US buyer. Here is the decisive fact: if one merchant using a generation feature gets caught, Shopify removes the app for every merchant on the platform, including you. That is why Judge.me, Loox, Yotpo, and Okendo all refuse to build generation. We will not either. Also, only asking happy customers for reviews (gating by rating) is banned too, so we will not build that.

## The Honest Fast Path to 100 Reviews

Import the real reviews you already earned on marketplaces (live in a day). Use WhatsApp requests (open rates are much higher in India than email). Offer a small coupon for any honest review with the incentive clearly shown. Incentivize photos. The marketplace badges are already live. One positioning insight: brands that plan to raise money or exit can sell themselves as "audit-proof social proof." That is itself a feature.

## One Real Limit

There is no legal API for per-product ratings on Amazon.in, Flipkart, Myntra, or Nykaa. So marketplace numbers are a 2-minute manual update once a week, with automatic reminders to keep you from forgetting. It is not full auto-sync, but it is simple and does not break.

## Three Asks

One: confirm this build order makes sense for your business. Two: send one real CSV export from Judge.me or Amazon this week so we tune the importer on real data. Three: pilot WhatsApp requests on your own store first and tell us what happens.
