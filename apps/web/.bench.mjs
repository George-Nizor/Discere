import { chromium } from "@playwright/test";
const out = process.argv[2];
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  p.on("console", (m) => m.type() === "error" && console.log("CONSOLE", m.text()));
  await p.goto("http://127.0.0.1:4618/courses/physics-motion-and-forces/lessons/speed-and-direction", { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}-${w}-toolbar.png` });
  await p.getByRole("textbox").first().click().catch(() => {});
  await p.getByRole("button", { name: "Calculator" }).click();
  await p.waitForTimeout(500);
  for (const k of ["sin", "3", "0", ")", "×", "4"]) await p.getByRole("group", { name: "Calculator keys" }).getByRole("button", { name: k === "sin" ? "sin" : k === "×" ? "Multiply" : k, exact: true }).click();
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${out}-${w}-calc.png` });
  await p.getByRole("button", { name: "Use in answer" }).click();
  await p.waitForTimeout(300);
  console.log(w, "answer box now:", await p.locator(".stage-canvas input").first().inputValue().catch(() => "?"));
  await p.getByRole("tab", { name: "Working" }).click();
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}-${w}-working.png` });
  await p.getByRole("tab", { name: "Tutor" }).click();
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}-${w}-tutor.png` });
  await p.close();
}
await b.close();
