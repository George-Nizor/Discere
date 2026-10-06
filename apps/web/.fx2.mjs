import { chromium } from "@playwright/test";
const out = process.argv[2];
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [w, h] of [[1440, 900], [390, 844]]) {
const p = await b.newPage({ viewport: { width: w, height: h } });
p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await p.goto("http://127.0.0.1:4618/courses/calculus-change-and-accumulation", { waitUntil: "networkidle" });
const lesson = await p.evaluate(async () => (await (await fetch("/api/courses/calculus-change-and-accumulation")).json()).lessons[0].id);
await p.goto("http://127.0.0.1:4618/courses/calculus-change-and-accumulation/lessons/" + lesson, { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}-${w}.png` });
await p.close();
}
await b.close();
