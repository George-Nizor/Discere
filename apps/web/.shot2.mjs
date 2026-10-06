import { chromium } from "@playwright/test";
const [,, out, w, h, ...paths] = process.argv;
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await b.newContext({ viewport: { width: +w, height: +h } });
await ctx.addInitScript(() => { try { sessionStorage.setItem("discere:welcome:v1", "seen"); } catch {} });
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
for (const [i, path] of paths.entries()) {
  await p.goto("http://127.0.0.1:4618" + path, { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}-${i}.png`, fullPage: process.env.FULL === "1" });
}
await b.close();
