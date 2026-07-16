// Seed data for ReviewOS demo. Attribute keys (skinType, useCase, fit,
// priority, ageRange, usageDuration) are defined ONLY here and in the
// AttributeDefinition rows they populate. Application services and routes
// must never hardcode these names; they treat attributes as a generic
// JSON bag keyed by whatever AttributeDefinition rows exist per category.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SHOP = process.env.SHOP_DOMAIN ?? "reviewos-dev.myshopify.com";

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

const INDIAN_NAMES = [
  "Priya Sharma",
  "Rahul Mehta",
  "Ananya Iyer",
  "Vikram Singh",
  "Sneha Reddy",
  "Arjun Nair",
  "Kavya Menon",
  "Rohan Gupta",
  "Ishita Bansal",
  "Aditya Verma",
  "Neha Kapoor",
  "Karan Malhotra",
  "Divya Pillai",
  "Siddharth Rao",
  "Pooja Agarwal",
];

const INTL_NAMES = [
  "Emma Johnson",
  "Liam Smith",
  "Olivia Brown",
  "Noah Williams",
  "Sophia Davis",
  "James Wilson",
  "Mia Taylor",
  "Lucas Anderson",
  "Amelia Thomas",
  "Ethan Moore",
];

const NAMES = [...INDIAN_NAMES, ...INTL_NAMES];

const SOURCES = ["website", "amazon", "flipkart", "nykaa", "smytten", "generated"];

async function main() {
  // Clean slate for repeatable seeding (scoped to this shop only).
  await prisma.marketplaceStat.deleteMany({ where: { shop: SHOP } });
  await prisma.marketplaceSource.deleteMany({ where: { shop: SHOP } });
  await prisma.reviewMedia.deleteMany({ where: { review: { shop: SHOP } } });
  await prisma.review.deleteMany({ where: { shop: SHOP } });
  await prisma.attributeDefinition.deleteMany({ where: { shop: SHOP } });
  await prisma.aiSummary.deleteMany({ where: { shop: SHOP } });
  await prisma.product.deleteMany({ where: { shop: SHOP } });
  await prisma.settings.deleteMany({ where: { shop: SHOP } });

  // --- Products ---
  const serum = await prisma.product.create({
    data: {
      shop: SHOP,
      slug: "glow-lab-vitamin-c-serum",
      name: "Glow Lab Vitamin C Serum",
      category: "skincare",
      description:
        "A lightweight vitamin C serum with 10% ascorbic acid and hyaluronic acid for brighter, even-toned skin. Suitable for daily use under sunscreen.",
      price: 59900,
      imageUrl: "https://picsum.photos/seed/glowlab-serum/600/600",
    },
  });

  const shoes = await prisma.product.create({
    data: {
      shop: SHOP,
      slug: "stridewear-airflex-running-shoes",
      name: "StrideWear AirFlex Running Shoes",
      category: "shoes",
      description:
        "Breathable mesh running shoes with responsive cushioning, built for daily runs and long-distance training on Indian roads.",
      price: 349900,
      imageUrl: "https://picsum.photos/seed/stridewear-shoes/600/600",
    },
  });

  const earbuds = await prisma.product.create({
    data: {
      shop: SHOP,
      slug: "boat-airbeat-pro-earbuds",
      name: "boAt AirBeat Pro Wireless Earbuds",
      category: "earbuds",
      description:
        "True wireless earbuds with ANC, 32 hours total battery life, and punchy bass tuned for Indian listeners.",
      price: 249900,
      imageUrl: "https://picsum.photos/seed/boat-earbuds/600/600",
    },
  });

  // --- Attribute definitions (seed-only knowledge, never hardcoded in app logic) ---
  await prisma.attributeDefinition.createMany({
    data: [
      {
        shop: SHOP,
        productCategory: "skincare",
        key: "skinType",
        label: "Skin Type",
        options: JSON.stringify(["dry", "oily", "combination", "sensitive"]),
      },
      {
        shop: SHOP,
        productCategory: "skincare",
        key: "ageRange",
        label: "Age Range",
        options: JSON.stringify(["18-24", "25-34", "35-44", "45+"]),
      },
      {
        shop: SHOP,
        productCategory: "skincare",
        key: "usageDuration",
        label: "Usage Duration",
        options: JSON.stringify(["under 1 month", "1-3 months", "3-6 months", "6+ months"]),
      },
      {
        shop: SHOP,
        productCategory: "shoes",
        key: "useCase",
        label: "Use Case",
        options: JSON.stringify(["daily jogging", "long distance", "gym training", "casual wear"]),
      },
      {
        shop: SHOP,
        productCategory: "shoes",
        key: "fit",
        label: "Fit",
        options: JSON.stringify(["runs small", "true to size", "runs large"]),
      },
      {
        shop: SHOP,
        productCategory: "earbuds",
        key: "useCase",
        label: "Use Case",
        options: JSON.stringify(["commute", "gym", "work calls", "gaming"]),
      },
      {
        shop: SHOP,
        productCategory: "earbuds",
        key: "priority",
        label: "Top Priority",
        options: JSON.stringify(["battery", "sound", "comfort", "mic"]),
      },
    ],
  });

  // --- Marketplace sources ---
  const amazon = await prisma.marketplaceSource.create({
    data: { shop: SHOP, name: "Amazon", logoUrl: "https://logo.clearbit.com/amazon.in", baseUrl: "https://www.amazon.in" },
  });
  const flipkart = await prisma.marketplaceSource.create({
    data: { shop: SHOP, name: "Flipkart", logoUrl: "https://logo.clearbit.com/flipkart.com", baseUrl: "https://www.flipkart.com" },
  });
  const nykaa = await prisma.marketplaceSource.create({
    data: { shop: SHOP, name: "Nykaa", logoUrl: "https://logo.clearbit.com/nykaa.com", baseUrl: "https://www.nykaa.com" },
  });
  const smytten = await prisma.marketplaceSource.create({
    data: { shop: SHOP, name: "Smytten", logoUrl: "https://logo.clearbit.com/smytten.com", baseUrl: "https://www.smytten.com" },
  });

  // --- Marketplace stats ---
  await prisma.marketplaceStat.createMany({
    data: [
      { shop: SHOP, productId: serum.id, sourceId: amazon.id, rating: 4.3, reviewCount: 812, url: "https://www.amazon.in/dp/glow-lab-serum" },
      { shop: SHOP, productId: serum.id, sourceId: nykaa.id, rating: 4.5, reviewCount: 431, url: "https://www.nykaa.com/glow-lab-serum" },
      { shop: SHOP, productId: serum.id, sourceId: smytten.id, rating: 4.2, reviewCount: 96, url: "https://www.smytten.com/glow-lab-serum" },
      { shop: SHOP, productId: shoes.id, sourceId: amazon.id, rating: 4.1, reviewCount: 1204, url: "https://www.amazon.in/dp/stridewear-shoes" },
      { shop: SHOP, productId: shoes.id, sourceId: flipkart.id, rating: 4.0, reviewCount: 967, url: "https://www.flipkart.com/stridewear-shoes" },
      { shop: SHOP, productId: earbuds.id, sourceId: amazon.id, rating: 4.4, reviewCount: 2310, url: "https://www.amazon.in/dp/boat-airbeat-pro" },
      { shop: SHOP, productId: earbuds.id, sourceId: flipkart.id, rating: 4.3, reviewCount: 1780, url: "https://www.flipkart.com/boat-airbeat-pro" },
    ],
  });

  await seedReviewsForSerum(serum.id);
  await seedReviewsForShoes(shoes.id);
  await seedReviewsForEarbuds(earbuds.id);

  await seedTrustBadgeDemo();

  console.log("Seed complete.");
}

// Additive: separate demo shop for the Phase 5 Slice A trust-badges walkthrough
// (does not touch SHOP's data above, and is not wiped on reseed).
const TRUST_BADGE_SHOP = "reviewos.myshopify.com";

async function seedTrustBadgeDemo() {
  const snowboard = await prisma.product.upsert({
    where: {
      shop_slug: { shop: TRUST_BADGE_SHOP, slug: "the-collection-snowboard-liquid" },
    },
    update: {},
    create: {
      shop: TRUST_BADGE_SHOP,
      slug: "the-collection-snowboard-liquid",
      name: "The Collection Snowboard: Liquid",
      category: "snowboards",
      description: "",
      price: 0,
      imageUrl: "",
    },
  });

  const amazon = await prisma.marketplaceSource.upsert({
    where: { shop_name: { shop: TRUST_BADGE_SHOP, name: "Amazon" } },
    update: {},
    create: { shop: TRUST_BADGE_SHOP, name: "Amazon", logoUrl: "", baseUrl: "https://amazon.com" },
  });

  await prisma.marketplaceStat.upsert({
    where: {
      shop_productId_sourceId: {
        shop: TRUST_BADGE_SHOP,
        productId: snowboard.id,
        sourceId: amazon.id,
      },
    },
    update: { rating: 4.6, reviewCount: 12431, url: "https://amazon.com/dp/the-collection-snowboard-liquid" },
    create: {
      shop: TRUST_BADGE_SHOP,
      productId: snowboard.id,
      sourceId: amazon.id,
      rating: 4.6,
      reviewCount: 12431,
      url: "https://amazon.com/dp/the-collection-snowboard-liquid",
    },
  });
}

const SKIN_TYPES = ["dry", "oily", "combination", "sensitive"];
const AGE_RANGES = ["18-24", "25-34", "35-44", "45+"];
const USAGE_DURATIONS = ["under 1 month", "1-3 months", "3-6 months", "6+ months"];

const SKIN_TEXT: Record<string, string[]> = {
  dry: [
    "My skin is quite dry and this serum absorbed well without any flaking.",
    "Been dealing with dry patches for years, this finally helped without over-drying further.",
  ],
  oily: [
    "I have oily skin and was worried about breakouts but it stayed non-greasy all day.",
    "Oily skin type here, absorbs fast and doesn't leave that sticky film some serums do.",
  ],
  combination: [
    "Combination skin, dry cheeks and oily T-zone, this balanced both areas nicely.",
    "Works well across my combination skin without over-drying the dry parts.",
  ],
  sensitive: [
    "Sensitive skin and prone to redness, no irritation at all after two weeks of use.",
    "As someone with sensitive skin I patch tested first, no reaction, been using daily since.",
  ],
};

async function seedReviewsForSerum(productId: string) {
  const count = randomInt(28, 38);
  for (let i = 0; i < count; i++) {
    const skinType = pick(SKIN_TYPES);
    const rating = weightedRating();
    const attributes = {
      skinType,
      ageRange: pick(AGE_RANGES),
      usageDuration: pick(USAGE_DURATIONS),
    };
    const bodyBase = pick(SKIN_TEXT[skinType]);
    const body =
      rating >= 4
        ? `${bodyBase} Noticed brightening within a few weeks, will repurchase.`
        : `${bodyBase} Didn't see much difference for the price though.`;

    await createSeedReview(productId, rating, body, attributes, i);
  }
}

const USE_CASES_SHOES = ["daily jogging", "long distance", "gym training", "casual wear"];
const FITS = ["runs small", "true to size", "runs large"];

async function seedReviewsForShoes(productId: string) {
  const count = randomInt(25, 35);
  for (let i = 0; i < count; i++) {
    const useCase = pick(USE_CASES_SHOES);
    const fit = pick(FITS);
    const rating = weightedRating();
    const attributes = { useCase, fit };
    const fitText =
      fit === "runs small"
        ? "Ordered a half size up because it runs a bit small, fits perfectly now."
        : fit === "runs large"
        ? "Runs slightly large, would size down if buying again."
        : "True to size, no sizing surprises.";
    const body = `Bought these for ${useCase}. ${fitText} ${
      rating >= 4 ? "Cushioning holds up well over long runs." : "Sole wear showed up faster than expected."
    }`;

    await createSeedReview(productId, rating, body, attributes, i);
  }
}

const USE_CASES_EARBUDS = ["commute", "gym", "work calls", "gaming"];
const PRIORITIES = ["battery", "sound", "comfort", "mic"];

async function seedReviewsForEarbuds(productId: string) {
  const count = randomInt(30, 40);
  for (let i = 0; i < count; i++) {
    const useCase = pick(USE_CASES_EARBUDS);
    const priority = pick(PRIORITIES);
    const rating = weightedRating();
    const attributes = { useCase, priority };
    const priorityText: Record<string, string> = {
      battery: "Battery life easily gets me through a full day of use.",
      sound: "Sound quality is punchy with good bass, exactly what I wanted.",
      comfort: "Comfortable fit even during long sessions, no ear fatigue.",
      mic: "Mic quality on calls is clear, colleagues had no complaints.",
    };
    const body = `Using these mainly for ${useCase}. ${priorityText[priority]} ${
      rating >= 4 ? "Happy with the purchase overall." : "Had some connectivity drops occasionally."
    }`;

    await createSeedReview(productId, rating, body, attributes, i);
  }
}

function weightedRating() {
  // Skewed toward 4-5 stars.
  const r = Math.random();
  if (r < 0.45) return 5;
  if (r < 0.75) return 4;
  if (r < 0.88) return 3;
  if (r < 0.96) return 2;
  return 1;
}

async function createSeedReview(
  productId: string,
  rating: number,
  body: string,
  attributes: Record<string, string>,
  index: number
) {
  const status = index % 17 === 0 ? "pending" : index % 23 === 0 ? "rejected" : "approved";
  const hasMerchantReply = index % 13 === 0;
  const verifiedBuyer = Math.random() < 0.6;
  const verifiedMarketplace = Math.random() < 0.3;
  const source = pick(SOURCES);

  const review = await prisma.review.create({
    data: {
      shop: SHOP,
      productId,
      customerName: pick(NAMES),
      customerEmail: Math.random() < 0.5 ? `customer${index}@example.com` : null,
      rating,
      title: rating >= 4 ? "Great product" : rating === 3 ? "Decent, could be better" : "Not for me",
      body,
      attributes: JSON.stringify(attributes),
      status,
      verifiedBuyer,
      verifiedMarketplace,
      source,
      helpfulCount: randomInt(0, 40),
      merchantReply: hasMerchantReply
        ? "Thanks for the detailed feedback, glad it's working well for you."
        : null,
      merchantRepliedAt: hasMerchantReply ? daysAgo(randomInt(1, 20)) : null,
      createdAt: daysAgo(randomInt(1, 180)),
    },
  });

  if (Math.random() < 0.35) {
    const mediaCount = randomInt(1, 3);
    for (let m = 0; m < mediaCount; m++) {
      await prisma.reviewMedia.create({
        data: {
          reviewId: review.id,
          type: "image",
          url: `https://picsum.photos/seed/${review.id}-${m}/500/500`,
          storageKey: `seed/${review.id}-${m}`,
          mimeType: "image/jpeg",
          sizeBytes: 0,
        },
      });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
