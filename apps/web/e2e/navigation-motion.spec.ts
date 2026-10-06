import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { createApp, type DiscereApp } from "../../server/src/app.js";
import { expect, test } from "./fixtures.js";

const output = join(import.meta.dirname, "../../../docs/motion-polish");
let server: DiscereApp, address: string, directory: string;

test.beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), "discere-motion-browser-"));
  mkdirSync(output, { recursive: true });
  server = await createApp({
    dbPath: join(directory, "motion.sqlite"),
    migrate: true,
    tutor: { providerId: "mock" },
    webRoot: join(import.meta.dirname, "../dist"),
  });
  address = await server.app.listen({ host: "127.0.0.1", port: 0 });
});
test.afterAll(async () => {
  await server?.app.close();
  if (directory?.startsWith(join(tmpdir(), "discere-motion-browser-")))
    rmSync(directory, { recursive: true, force: true });
});
test.beforeEach(async () => {
  server.store.study.updatePreferences({ motion: "system", sound: false });
});

async function instrument(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("discere:welcomed", "1");
    const records: {
      scene: string;
      ready: boolean;
      skipped: boolean;
      names: string[];
      finished: boolean;
    }[] = [];
    Object.assign(window, { motionRecords: records });
    const scrollTrace: unknown[] = [];
    Object.assign(window, { motionScrollTrace: scrollTrace });
    const scroll = window.scrollTo.bind(window);
    window.scrollTo = ((...args: [ScrollToOptions] | [number, number]) => {
      scrollTrace.push({
        kind: "restore",
        args,
        url: location.href,
        key: history.state?.key,
        height: document.documentElement.scrollHeight,
      });
      if (typeof args[0] === "number") scroll(args[0], args[1] ?? 0);
      else scroll(args[0]);
    }) as typeof window.scrollTo;
    window.addEventListener("scroll", () =>
      scrollTrace.push({ kind: "scroll", y: scrollY, url: location.href, key: history.state?.key }),
    );
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = (...args: Parameters<typeof start>) => {
      const record = {
        scene: document.documentElement.dataset["navigation"] ?? "",
        ready: false,
        skipped: false,
        names: [] as string[],
        finished: false,
      };
      records.push(record);
      const transition = start(...args);
      void transition.ready.then(
        () => {
          record.ready = true;
          record.names = document
            .getAnimations()
            .filter((a): a is CSSAnimation => a instanceof CSSAnimation)
            .map((a) => a.animationName);
        },
        () => {
          record.skipped = true;
        },
      );
      void transition.finished.then(() => {
        record.finished = true;
      });
      return transition;
    };
  });
}
async function records(page: Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          motionRecords: {
            scene: string;
            ready: boolean;
            skipped: boolean;
            names: string[];
            finished: boolean;
          }[];
        }
      ).motionRecords,
  );
}
async function settled(page: Page) {
  await expect(page.locator(".navigation-progress")).toHaveAttribute("data-pending", "false");
  await expect(page.locator(".app-body")).toHaveAttribute("data-route-transition", "false");
  await expect
    .poll(async () => (await records(page)).every((record) => record.finished))
    .toBe(true);
  await page.waitForTimeout(300);
}
async function clickScene(page: Page, name: string, scene = "page") {
  const count = (await records(page)).length;
  await page.getByRole("link", { name, exact: true }).click();
  await expect.poll(async () => (await records(page)).length).toBeGreaterThan(count);
  await expect.poll(async () => (await records(page)).at(-1)?.ready).toBe(true);
  const record = (await records(page)).at(-1)!;
  expect(record.scene).toBe(scene);
  expect(record.names).toContain("navigation-arrive");
  return record;
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
]) {
  test("normal-speed navigation and artwork at " + viewport.width, async ({ browser }) => {
    const context = await browser.newContext({
      viewport,
      reducedMotion: "no-preference",
      recordVideo: { dir: join(output, "recordings"), size: viewport },
    });
    const page = await context.newPage();
    await instrument(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(address + "/");
    await expect(page.locator(".home-course-panel h2")).toBeVisible();
    await page.waitForTimeout(900);
    await page.screenshot({ path: join(output, "home-" + viewport.width + ".png") });
    await clickScene(page, "Courses");
    // Sample the transition frame by frame rather than after a fixed delay: on a loaded machine
    // a fixed 90 ms can land before the arrival's first painted frame or after its last.
    const frame = await page.evaluate(async () => {
      const read = () => ({
        page: getComputedStyle(document.documentElement, "::view-transition-new(page-content)")
          .opacity,
        nav: getComputedStyle(document.documentElement, "::view-transition-new(site-navigation)")
          .opacity,
        marker: getComputedStyle(
          document.documentElement,
          "::view-transition-group(navigation-marker)",
        ).animationDuration,
      });
      const started = performance.now();
      let sample = read();
      while (performance.now() - started < 2000) {
        sample = read();
        if (Number(sample.page) > 0 && Number(sample.page) < 1) return sample;
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      return sample;
    });
    expect(Number(frame.page)).toBeGreaterThan(0);
    expect(Number(frame.page)).toBeLessThan(1);
    expect(Number(frame.nav)).toBe(1);
    await page.screenshot({ path: join(output, "courses-in-flight-" + viewport.width + ".png") });
    await settled(page);
    await clickScene(page, "You");
    await settled(page);
    await page.getByRole("button", { name: "Month", exact: true }).click();
    await expect.poll(async () => (await records(page)).at(-1)?.scene).toBe("period");
    await settled(page);
    await clickScene(page, "Settings");
    await settled(page);
    await page.goBack();
    await expect(page).toHaveURL(/\/you/);
    await expect
      .poll(async () => (await records(page)).at(-1)?.names.includes("navigation-arrive"))
      .toBe(true);
    await settled(page);
    await clickScene(page, "Home");
    await settled(page);
    await page.getByRole("radio", { name: "Logic and Reasoning", exact: true }).click();
    await expect(page.locator(".home-course-panel h2")).toHaveText("Logic and Reasoning");
    await expect.poll(async () => (await records(page)).at(-1)?.scene).toBe("course");
    await settled(page);
    await page.getByRole("link", { name: "View course roadmap", exact: true }).click();
    await expect(page.locator(".course-overview h1")).toBeVisible();
    await settled(page);
    await page.screenshot({ path: join(output, "roadmap-" + viewport.width + ".png") });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
    await page.locator(".roadmap-launch a").click();
    // The first screen is the v2 opener (Maths) or a step whose question is the headline.
    await expect(page.locator(".opener-title, .step-question, .story-title").first()).toBeVisible();
    await settled(page);
    await page.screenshot({ path: join(output, "lesson-" + viewport.width + ".png") });
    await expect(page.locator(".learning-player .stage-header")).toBeVisible();
    expect(errors).toEqual([]);
    const evidence = await records(page);
    expect(evidence.filter((record) => record.skipped)).toEqual([]);
    writeFileSync(
      join(output, "navigation-" + viewport.width + ".json"),
      JSON.stringify({ viewport, frame, records: evidence, errors }, null, 2),
    );
    const video = page.video()!;
    await context.close();
    await video.saveAs(join(output, "navigation-" + viewport.width + ".webm"));
    await video.delete();
  });
}

test("slow data preserves the current screen, and rapid navigation cannot leave a stale destination", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await instrument(page);
  await page.goto(address + "/");
  await expect(page.locator(".home-course-panel h2")).toBeVisible();
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/study/statistics?period=all", async (route) => {
    await gate;
    await route.continue();
  });
  await page.getByRole("link", { name: "You", exact: true }).click();
  await expect(page.locator(".navigation-progress")).toHaveAttribute("data-pending", "true");
  await expect(page.locator(".home-course-panel h2")).toBeVisible();
  await expect(page.locator(".loading-screen")).toHaveCount(0);
  await page.getByRole("link", { name: "Courses", exact: true }).click();
  release?.();
  await expect(page).toHaveURL(/\/courses$/);
  await settled(page);
  await expect(page.getByRole("heading", { name: "Learning paths", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "You", exact: true }).click();
  await expect.poll(async () => (await records(page)).at(-1)?.ready).toBe(true);
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveURL(address + "/");
  await settled(page);
  await expect(page.locator(".home-course-panel h2")).toBeVisible();
  await page.getByRole("link", { name: "Courses", exact: true }).click();
  await settled(page);
  const before = (await records(page)).length;
  await page.getByRole("searchbox", { name: "Search courses" }).fill("logic");
  await expect(page.locator(".course-card")).toHaveCount(1);
  expect((await records(page)).length).toBe(before);
  await expect(page.getByRole("searchbox", { name: "Search courses" })).toBeFocused();
  await page.getByRole("searchbox", { name: "Search courses" }).fill("");
  await expect(page.locator(".course-card")).toHaveCount(18);
  await page.evaluate(() => window.scrollTo(0, 650));
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
  await page.waitForTimeout(100);
  await page.getByRole("link", { name: "You", exact: true }).click();
  await settled(page);
  await page.goBack();
  await settled(page);
  writeFileSync(
    join(output, "scroll-trace.json"),
    JSON.stringify(
      await page.evaluate(() => ({
        y: scrollY,
        height: document.documentElement.scrollHeight,
        trace: (window as unknown as { motionScrollTrace: unknown[] }).motionScrollTrace,
      })),
      null,
      2,
    ),
  );
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(500);
});

test("system and saved reduced motion stop motion; unsupported browsers still get a content entrance", async ({
  page,
}) => {
  await instrument(page);
  await page.goto(address + "/");
  await expect(page.locator(".home-course-panel h2")).toBeVisible();
  await page.getByRole("link", { name: "Courses", exact: true }).click();
  await expect(page).toHaveURL(/\/courses$/);
  expect((await records(page)).length).toBe(0);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(address + "/settings");
  await page.getByRole("combobox", { name: "Motion" }).selectOption("reduced");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page.locator(".home-course-panel h2")).toBeVisible();
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  server.store.study.updatePreferences({ motion: "system" });
  await page.addInitScript(() => {
    Object.defineProperty(document, "startViewTransition", {
      value: undefined,
      configurable: true,
    });
  });
  await page.goto(address + "/");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "system");
  await page.getByRole("link", { name: "Courses", exact: true }).click();
  await expect(page).toHaveURL(/\/courses$/);
  expect(
    await page.evaluate(() => document.querySelector(".app-body")?.getAnimations().length),
  ).toBeGreaterThan(0);
  await expect(page.getByRole("heading", { name: "Learning paths", exact: true })).toBeVisible();
});

test("a stalled auxiliary service cannot trap the learner on the previous menu", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await instrument(page);
  await page.goto(address + "/");
  await expect(page.locator(".home-course-panel h2")).toBeVisible();
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/tutor/status", async (route) => {
    await gate;
    await route.continue();
  });
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible({
    timeout: 2500,
  });
  await expect(page.getByRole("combobox", { name: "Motion" })).toBeVisible();
  await page.getByRole("link", { name: "Courses", exact: true }).click();
  release?.();
  await expect(page).toHaveURL(/\/courses$/);
  await settled(page);
  await expect(page.getByRole("heading", { name: "Learning paths", exact: true })).toBeVisible();
});
