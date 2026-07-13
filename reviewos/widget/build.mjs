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
