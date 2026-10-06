import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createApp, type DiscereApp } from "../../server/src/app.js";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.js";
const output = join(import.meta.dirname, "../../../docs/home-redesign/screens");
const sizes = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
];
async function capture(page: Page, name: string) {
  mkdirSync(output, { recursive: true });
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo(0, 0);
    });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
      .toBeLessThanOrEqual(1);
    if (name === "home") {
      const action = await page.locator(".home-resume").boundingBox();
      expect(action!.y + action!.height).toBeLessThanOrEqual(
        size.height - (size.width <= 700 ? 64 : 0),
      );
    }
    await page.screenshot({
      path: join(output, name + "-" + size.width + ".png"),
      fullPage: true,
      animations: "disabled",
    });
  }
}
let server: DiscereApp, address: string, directory: string;
test.beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), "discere-home-redesign-browser-"));
  server = await createApp({
    dbPath: join(directory, "home.sqlite"),
    migrate: true,
    clock: () => new Date("2026-10-02T02:00:00.000Z"),
    webRoot: join(import.meta.dirname, "../dist"),
  });
  server.store.database
    .prepare("UPDATE user_profiles SET learner_name = ? WHERE id = ?")
    .run("Journey Tester", "local-user");
  server.store.study.updatePreferences({ timeZone: "Australia/Sydney" });
  address = await server.app.listen({ host: "127.0.0.1", port: 0 });
});
test.afterAll(async () => {
  await server?.app.close();
  if (directory && directory.startsWith(join(tmpdir(), "discere-home-redesign-browser-")))
    rmSync(directory, { recursive: true, force: true });
});
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("discere:welcomed", "1"));
});
test("Home uses three main tabs and real illustrated courses at every size", async ({
  page,
  request,
}) => {
  await page.goto(address + "/?course=maths-foundations");
  await expect(
    page.getByRole("heading", { name: "Welcome to Discere, Journey Tester." }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Maths Foundations", exact: true })).toBeVisible();
  await expect(page.locator(".nav-rail-list .nav-rail-tip")).toHaveText(["Home", "Courses", "You"]);
  const catalogue = (await (await request.get(address + "/api/courses")).json()).courses;
  await expect(page.locator(".home-course-switcher button")).toHaveCount(catalogue.length);
  for (const title of ["The Rise of the Roman Empire", "Electronics Foundations"]) {
    await expect(page.getByRole("radio", { name: title, exact: true })).toHaveCount(0);
  }
  await expect(page.locator(".home-resume")).toHaveAttribute(
    "href",
    /\/courses\/maths-foundations\/lessons\//,
  );
  await capture(page, "home");
  for (const label of ["Home", "Courses", "You"])
    await expect(page.locator(".nav-rail-tip").getByText(label, { exact: true })).toBeVisible();
  const selectedButton = page.locator('.home-course-switcher button[aria-pressed="true"]');
  const selectedBox = await selectedButton.boundingBox();
  const stripBox = await page.locator(".home-course-switcher").boundingBox();
  expect(selectedBox!.x).toBeGreaterThanOrEqual(stripBox!.x);
  expect(selectedBox!.x + selectedBox!.width).toBeLessThanOrEqual(stripBox!.x + stripBox!.width);
  const cta = await page.locator(".home-resume").boundingBox();
  expect(cta!.y + cta!.height).toBeLessThanOrEqual(sizes[2]!.height - 64);
  await expect(page.getByRole("link", { name: "Review", exact: true })).toBeVisible();
});
test("the course chooser persists across refresh and starts the chosen production course", async ({
  page,
}) => {
  await page.goto(address + "/");
  const selector = page.getByRole("radio", {
    name: "Linear Algebra: Vectors and Maps",
    exact: true,
  });
  await selector.click();
  await expect(page).toHaveURL(/course=linear-algebra-vectors-and-maps/);
  await expect(selector).toHaveAttribute("aria-checked", "true");
  // The switcher is one Tab stop; arrow keys move between courses without new history entries.
  await expect(page.locator('.home-course-switcher button[tabindex="0"]')).toHaveCount(1);
  await expect(page.locator(".home-resume")).toHaveAttribute(
    "href",
    /linear-algebra-vectors-and-maps\/lessons\/read-vector-coordinates/,
  );
  await page.reload();
  await expect(
    page.getByRole("radio", { name: "Linear Algebra: Vectors and Maps", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page.locator(".home-resume").click();
  await expect(page.getByText("Read the first coordinate", { exact: false }).first()).toBeVisible();
});
test("Home resumes the saved question position after a checked answer", async ({ page }) => {
  await page.goto(address + "/courses/maths-foundations/lessons/undoing-in-the-right-order");
  // Each question-led screen's headline is its question (audit M2), so it identifies the step.
  const initial = page.locator(".step-question").first();
  const firstTitle = await initial.innerText();
  const answer = page.getByRole("button", { name: /Subtract 3, then divide by 2/ });
  if (await answer.isVisible()) {
    await answer.click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(initial).not.toHaveText(firstTitle);
  }
  const savedTitle = await initial.innerText();
  await page.goto(address + "/?course=maths-foundations");
  await expect(page.locator(".home-resume")).toHaveText(/Resume/);
  await expect(page.locator(".home-resume")).toHaveAttribute("href", /undoing-in-the-right-order/);
  await page.locator(".home-resume").click();
  await expect(page.locator(".step-question").first()).toHaveText(savedTitle);
});
test("You shows recorded stats, working filters, chart details, and preserved Progress links", async ({
  page,
  request,
}) => {
  await page.goto(address + "/progress?period=week");
  await expect(page).toHaveURL(/\/you\?period=week/);
  await expect(
    page.getByRole("heading", { name: "Your learning activity", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Week", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const week = await (await request.get(address + "/api/study/statistics?period=week")).json();
  await expect(page.locator(".you-metrics dd").nth(0)).toHaveText(
    week.totals.answers.toLocaleString(),
  );
  const currentSummary = await page.locator(".you-weekly-copy").textContent();
  for (const period of ["Month", "Year", "All time"]) {
    await page.getByRole("button", { name: period, exact: true }).click();
    const id = period === "All time" ? "all" : period.toLowerCase();
    await expect(page).toHaveURL(new RegExp("period=" + id));
    const stats = await (await request.get(address + "/api/study/statistics?period=" + id)).json();
    await expect(page.locator(".you-metrics dd").nth(0)).toHaveText(
      stats.totals.answers.toLocaleString(),
    );
    expect(await page.locator(".you-weekly-copy").textContent()).toBe(currentSummary);
  }
  await page.getByRole("button", { name: "Week", exact: true }).click();
  await expect(page.locator(".you-bars button")).not.toHaveCount(0);
  await capture(page, "you");
  await page.getByLabel("How accuracy is calculated").click();
  await expect(page.getByText(/Corrections are included/)).toBeVisible();
  await page.getByLabel("How accuracy is calculated").click();
  await page.locator(".you-bars button").first().focus();
  await page.keyboard.press("End");
  await expect(page.locator(".you-bars button").last()).toBeFocused();
  await page.keyboard.press("Home");
  await expect(page.locator(".you-bars button").first()).toBeFocused();
  await page.reload();
  await expect(page.getByRole("button", { name: "Week", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("link", { name: "You", exact: true }).click();
  await expect(page.getByRole("link", { name: "You", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
});
