/**
 * Draws the authored figures (diagram type svg_figure) of one lesson draft to PNG files, once in
 * the light theme and once in the dark, so a writer can look at them before saving.
 *
 *   LD_LIBRARY_PATH=/tmp/claude-1000/libs/ex/usr/lib/x86_64-linux-gnu \
 *   node scripts/render-figures.mjs content/<course>/.authoring/migration/<lesson>.json <out-dir>
 *
 * Writes <out-dir>/<step-id>-<case-id>-<light|dark>.png. Look at each one with the Read tool.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "package.json"));
const pw = readdirSync(path.join(root, "node_modules/.pnpm")).find((name) =>
  name.startsWith("playwright@"),
);
const { chromium } = require(path.join(root, "node_modules/.pnpm", pw, "node_modules/playwright"));

const [file, out] = process.argv.slice(2);
if (!file || !out) throw new Error("Usage: node scripts/render-figures.mjs <draft.json> <out-dir>");
mkdirSync(out, { recursive: true });
const draft = JSON.parse(readFileSync(file, "utf8"));
const css = [
  "tokens.css",
  "base.css",
  "learning-diagram.css",
  "brilliant.css",
  "brand.css",
  "theme-light.generated.css",
  "theme.css",
]
  .map((name) =>
    readFileSync(path.join(root, "apps/web/src/styles", name), "utf8").replace(
      /@import[^;]+;/g,
      "",
    ),
  )
  .join("\n");
const figures = [];
if (draft.lesson.intro?.hook?.diagram?.type === "svg_figure")
  figures.push(["intro", draft.lesson.intro.hook.diagram]);
for (const step of draft.lesson.steps)
  if (step.diagram?.type === "svg_figure") figures.push([step.id, step.diagram]);
const browser = await chromium.launch({
  args: [
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-sandbox",
    "--single-process",
    "--no-zygote",
  ],
});
const page = await browser.newPage({ viewport: { width: 760, height: 560 } });
for (const theme of ["light", "dark"]) {
  for (const [id, figure] of figures)
    for (const item of figure.cases) {
      const html = `<!doctype html><html data-theme="${theme}"><head><style>${css}</style></head><body style="margin:0;padding:16px;background:var(--canvas)"><figure class="learning-diagram svg-figure" style="margin:0"><div class="svg-figure-drawing">${item.svg}</div><figcaption>${figure.caption ?? ""}</figcaption></figure></body></html>`;
      await page.setContent(html);
      const name = `${id}-${item.id}-${theme}.png`;
      await page.screenshot({ path: path.join(out, name), fullPage: true });
      console.log(name);
    }
}
await browser.close();
