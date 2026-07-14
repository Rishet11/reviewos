import * as esbuild from "esbuild";
import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "widget");

mkdirSync(outDir, { recursive: true });

await esbuild.build({
  entryPoints: [path.join(__dirname, "src", "index.ts")],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2018"],
  outfile: path.join(outDir, "reviewos.js"),
});

copyFileSync(
  path.join(__dirname, "src", "styles.css"),
  path.join(outDir, "reviewos.css")
);

console.log("widget built -> public/widget/reviewos.js + reviewos.css");

// Shopify Theme App Extension bundle: same framework-free build, separate
// entry (src/shopify/index.ts) targeting the App Proxy contract instead of
// the demo's /api/* routes. Output goes straight into the extension's
// assets/ dir so `shopify app build` picks it up without a copy step.
const extensionAssetsDir = path.join(
  __dirname,
  "..",
  "..",
  "shopify-app",
  "extensions",
  "reviewos-widgets",
  "assets"
);

mkdirSync(extensionAssetsDir, { recursive: true });

await esbuild.build({
  entryPoints: [path.join(__dirname, "src", "shopify", "index.ts")],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2018"],
  outfile: path.join(extensionAssetsDir, "reviewos.js"),
});

copyFileSync(
  path.join(__dirname, "src", "styles.css"),
  path.join(extensionAssetsDir, "reviewos.css")
);

console.log(
  "shopify widget built -> ../shopify-app/extensions/reviewos-widgets/assets/reviewos.{js,css}"
);
