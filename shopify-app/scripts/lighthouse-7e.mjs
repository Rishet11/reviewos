#!/usr/bin/env node
/**
 * Lighthouse baseline runner for Shopify App Store storefront-performance methodology.
 *
 * Authenticates past a password-protected dev store's storefront password page,
 * then runs Lighthouse (mobile, performance-only) 3x per page type, computing
 * the median score per page and the weighted average per Shopify's methodology
 * (home 17%, product 40%, collection 43%).
 *
 * Usage:
 *   node scripts/lighthouse-7e.mjs
 *
 * Env overrides (optional):
 *   STORE_URL           default https://reviewos.myshopify.com
 *   STORE_PASSWORD      default imefru
 *   PRODUCT_PATH        default /products/the-collection-snowboard-liquid
 *   COLLECTION_PATH     default /collections/all
 *   RUNS_PER_PAGE       default 3
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

const STORE_URL = (process.env.STORE_URL || "https://reviewos.myshopify.com").replace(/\/$/, "");
const STORE_PASSWORD = process.env.STORE_PASSWORD || "imefru";
const PRODUCT_PATH = process.env.PRODUCT_PATH || "/products/the-collection-snowboard-liquid";
const COLLECTION_PATH = process.env.COLLECTION_PATH || "/collections/all";
const RUNS_PER_PAGE = parseInt(process.env.RUNS_PER_PAGE || "3", 10);

const WEIGHTS = { home: 0.17, product: 0.4, collection: 0.43 };

const PAGES = [
  { key: "home", url: `${STORE_URL}/` },
  { key: "product", url: `${STORE_URL}${PRODUCT_PATH}` },
  { key: "collection", url: `${STORE_URL}${COLLECTION_PATH}` },
];

function median(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Fetch the auth cookie by POSTing the storefront password form.
 * Shopify dev stores show a password gate at "/password"; posting form_type=storefront_password
 * to the password endpoint sets an httpOnly `_shopify_essential` cookie that unlocks the rest
 * of the store (current Shopify behavior; there is no separate `storefront_digest` cookie
 * observed on this store despite that being the commonly-cited name).
 */
async function getUnlockCookie() {
  const res = await fetch(`${STORE_URL}/password`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      form_type: "storefront_password",
      utf8: "✓",
      password: STORE_PASSWORD,
    }).toString(),
  });

  // Shopify responds with a redirect (302) and sets cookies on success.
  const setCookieHeaders = [];
  // node's fetch Headers doesn't expose multiple set-cookie via get(), use getSetCookie if available
  if (typeof res.headers.getSetCookie === "function") {
    setCookieHeaders.push(...res.headers.getSetCookie());
  } else {
    const single = res.headers.get("set-cookie");
    if (single) setCookieHeaders.push(single);
  }

  const cookies = setCookieHeaders.map((c) => c.split(";")[0]);
  const essentialCookie = cookies.find((c) => c.startsWith("_shopify_essential="));

  if (!essentialCookie) {
    throw new Error(
      `Failed to obtain unlock cookie. Status: ${res.status}. ` +
        `Set-Cookie headers seen: ${JSON.stringify(setCookieHeaders)}`
    );
  }

  return essentialCookie; // e.g. "_shopify_essential=:...:"
}

/**
 * Verify the cookie actually unlocks a page (paywall bypass check).
 */
async function verifyUnlocked(cookie, url) {
  const res = await fetch(url, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  // If still password-gated, Shopify redirects to /password (302/303) or serves the password page.
  const location = res.headers.get("location") || "";
  const isRedirectToPassword = res.status >= 300 && res.status < 400 && location.includes("/password");
  let hasPasswordForm = false;
  if (res.status < 300) {
    const text = await res.clone().text();
    hasPasswordForm = text.includes("storefront_password");
  }
  return { ok: res.status < 400 && !isRedirectToPassword && !hasPasswordForm, status: res.status, location };
}

async function runLighthouseOnce(url, cookie, outDir, idx) {
  const outputPath = path.join(outDir, `${idx}.json`);
  const args = [
    "lighthouse",
    url,
    "--preset=perf",
    "--form-factor=mobile",
    "--screenEmulation.mobile",
    "--only-categories=performance",
    `--extra-headers=${JSON.stringify({ Cookie: cookie })}`,
    "--output=json",
    `--output-path=${outputPath}`,
    "--chrome-flags=--headless=new --no-sandbox",
    "--quiet",
  ];

  await execFileAsync("npx", args, {
    maxBuffer: 1024 * 1024 * 50,
    cwd: path.resolve(new URL(".", import.meta.url).pathname, ".."),
  });

  const raw = await readFile(outputPath, "utf-8");
  const json = JSON.parse(raw);
  const score = json.categories?.performance?.score;
  if (score == null) {
    throw new Error(`No performance score found in Lighthouse output for ${url}`);
  }
  return Math.round(score * 100);
}

async function main() {
  console.log(`Store: ${STORE_URL}`);
  console.log("Fetching unlock cookie...");
  const cookie = await getUnlockCookie();
  console.log(`Got cookie: ${cookie.split("=")[0]}=<redacted>`);

  const results = {};
  const failures = [];

  for (const page of PAGES) {
    console.log(`\nVerifying access: ${page.key} -> ${page.url}`);
    const check = await verifyUnlocked(cookie, page.url);
    if (!check.ok) {
      console.error(
        `FAILED to bypass paywall for ${page.key} (${page.url}). status=${check.status} location=${check.location}`
      );
      failures.push({ page: page.key, url: page.url, reason: `status=${check.status} location=${check.location}` });
      continue;
    }
    console.log(`OK (status ${check.status})`);

    const outDir = await mkdtemp(path.join(tmpdir(), "lh-"));
    const scores = [];
    for (let i = 0; i < RUNS_PER_PAGE; i++) {
      process.stdout.write(`  run ${i + 1}/${RUNS_PER_PAGE} for ${page.key}... `);
      try {
        const score = await runLighthouseOnce(page.url, cookie, outDir, i);
        scores.push(score);
        console.log(`score=${score}`);
      } catch (err) {
        console.log(`ERROR: ${err.message}`);
        failures.push({ page: page.key, url: page.url, reason: err.message });
      }
    }
    await rm(outDir, { recursive: true, force: true });

    if (scores.length > 0) {
      results[page.key] = { url: page.url, scores, median: median(scores) };
    }
  }

  console.log("\n=== Results ===");
  let weightedTotal = 0;
  let weightSum = 0;
  for (const key of Object.keys(WEIGHTS)) {
    const r = results[key];
    if (!r) {
      console.log(`${key}: FAILED TO LOAD`);
      continue;
    }
    console.log(`${key}: scores=[${r.scores.join(", ")}] median=${r.median} url=${r.url}`);
    weightedTotal += r.median * WEIGHTS[key];
    weightSum += WEIGHTS[key];
  }

  if (weightSum > 0) {
    console.log(`\nWeighted average (of pages that loaded, weights renormalized if any missing): ${(weightedTotal / weightSum).toFixed(2)}`);
  }
  if (weightSum === 3 || Object.keys(results).length === 3) {
    console.log(`Weighted total (full methodology, home .17/product .40/collection .43): ${weightedTotal.toFixed(2)}`);
  }

  if (failures.length > 0) {
    console.log("\n=== Failures ===");
    for (const f of failures) {
      console.log(`- ${f.page} (${f.url}): ${f.reason}`);
    }
  }

  console.log("\n=== JSON summary ===");
  console.log(JSON.stringify({ results, weightedTotal: weightSum > 0 ? weightedTotal : null, failures }, null, 2));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
