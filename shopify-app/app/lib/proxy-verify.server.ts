import crypto from "node:crypto";

// Verifies Shopify App Proxy signed requests.
// Shopify signs proxy requests by taking all query params (excluding
// `signature`), sorting them by key, joining as `key=value` (multi-value
// params joined with ","), concatenating with NO separator between pairs,
// then HMAC-SHA256 (hex) with the app's API secret.
// https://shopify.dev/docs/apps/build/online-store/display-dynamic-data#calculate-a-digital-signature

export function computeProxySignature(
  params: URLSearchParams,
  secret: string
): string {
  const grouped = new Map<string, string[]>();
  for (const [key, value] of params.entries()) {
    if (key === "signature") continue;
    const existing = grouped.get(key);
    if (existing) {
      existing.push(value);
    } else {
      grouped.set(key, [value]);
    }
  }

  const sortedKeys = Array.from(grouped.keys()).sort();
  const message = sortedKeys
    .map((key) => `${key}=${grouped.get(key)!.join(",")}`)
    .join("");

  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

export function verifyProxySignature(
  params: URLSearchParams,
  secret: string
): boolean {
  const signature = params.get("signature");
  if (!signature) return false;

  const expected = computeProxySignature(params, secret);

  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export function requireProxy(request: Request): { shop: string } {
  const url = new URL(request.url);
  const params = url.searchParams;

  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    throw new Response("Server misconfigured", { status: 500 });
  }

  if (!verifyProxySignature(params, secret)) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const shop = params.get("shop");
  if (!shop) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return { shop };
}
