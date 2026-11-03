/**
 * Draws course covers side by side to one PNG, so they can be looked at and compared:
 *   LD_LIBRARY_PATH=… node scripts/render-covers.mjs <out.png> <course-id> [<course-id> …]
 */
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(root, "package.json"));
const pw = readdirSync(path.join(root, "node_modules/.pnpm")).find((n) => n.startsWith("playwright@"));
const { chromium } = require(path.join(root, "node_modules/.pnpm", pw, "node_modules/playwright"));
const [out, ...ids] = process.argv.slice(2);
const cells = ids.map((id) => `<figure><div>${readFileSync(path.join(root, "content", id, "assets/cover.svg"), "utf8")}</div><figcaption>${id}</figcaption></figure>`).join("");
const html = `<html><body style="margin:0;background:#16181d;color:#ddd;font:13px sans-serif;display:grid;grid-template-columns:repeat(4,240px);gap:12px;padding:12px">${cells}<style>svg{width:220px;height:190px;background:#22252c;border-radius:8px}figure{margin:0}</style></body></html>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1020, height: 260 * Math.ceil(ids.length / 4) } });
await page.setContent(html);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
