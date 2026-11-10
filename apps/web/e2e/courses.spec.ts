import { expect, test } from "./isolated-app.js";
import { expectNoSidewaysScroll, watchPage } from "./lesson-player.js";

/**
 * The Courses page and a course's own page: every listed course has a card with artwork that
 * loads, and a course's roadmap has a stop for each lesson that the keyboard can open.
 */

interface ListedCourse {
  id: string;
  title: string;
  lessonCount: number;
}

test("the Courses page has one card for every listed course, and its artwork loads", async ({
  page,
  request,
}) => {
  const watch = watchPage(page);
  const list = (await (await request.get("/api/courses")).json()).courses as ListedCourse[];
  expect(list.length).toBeGreaterThan(0);
  expect(new Set(list.map((course) => course.id)).size).toBe(list.length);

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/courses");
  await expect(page.getByRole("heading", { level: 1, name: "Courses", exact: true })).toBeVisible();
  const cards = page.locator(".course-card");
  await expect(cards).toHaveCount(list.length);

  // Each group is a named region, and at this width it wraps instead of scrolling sideways.
  const groups = page.locator(".learning-path-courses");
  expect(await groups.count()).toBeGreaterThan(1);
  for (const group of await groups.all())
    expect(await group.evaluate((node) => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
  const last = cards.last();
  await last.focus();
  const box = (await last.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(1024);

  // Every picture a card points at is served.
  const pictures = await cards
    .locator("img")
    .evaluateAll((images) => [...new Set(images.map((image) => (image as HTMLImageElement).src))]);
  expect(pictures.length).toBeGreaterThan(0);
  for (const src of pictures) {
    const response = await request.get(src);
    expect(response.ok(), src).toBe(true);
    expect(response.headers()["content-type"], src).toMatch(/^image\//);
  }

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoSidewaysScroll(page);
  }
  watch.expectClean();
});

test("a course page has a roadmap stop for each lesson, and the keyboard opens one", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const watch = watchPage(page);
  const list = (await (await request.get("/api/courses")).json()).courses as ListedCourse[];
  // Every eighth course, so the sample moves across the catalogue as it grows.
  const sample = list.filter((_, index) => index % 8 === 0);
  expect(sample.length).toBeGreaterThan(3);
  for (const course of sample) {
    await test.step(course.id, async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/courses/${course.id}`);
      await expect(
        page.getByRole("heading", { level: 1, name: course.title, exact: true }),
      ).toBeVisible();
      const stops = page.locator(".roadmap-stop");
      await expect(stops).toHaveCount(course.lessonCount);
      const target = stops.nth(1);
      await target.focus();
      await page.keyboard.press("Enter");
      await expect(target).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator(".roadmap-launch a")).toHaveAttribute(
        "href",
        new RegExp(`^/courses/${course.id}/lessons/`),
      );
      await expectNoSidewaysScroll(page);
      await page.setViewportSize({ width: 390, height: 844 });
      await expectNoSidewaysScroll(page);
    });
  }
  watch.expectClean();
});

test("roadmap motion follows the system setting and the saved reduced-motion preference", async ({
  page,
  request,
}) => {
  const animation = () =>
    page.locator(".roadmap-companion").evaluate((node) => getComputedStyle(node).animationName);
  await request.put("/api/study/preferences", { data: { motion: "system" } });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/courses/maths-foundations");
  await expect.poll(animation).toBe("companion-arrive");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(animation).toBe("none");
  await request.put("/api/study/preferences", { data: { motion: "reduced" } });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  await expect.poll(animation).toBe("none");
});
