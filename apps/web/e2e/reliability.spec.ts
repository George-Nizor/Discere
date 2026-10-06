import { expect, test } from "./fixtures.js";

/**
 * The platform audit's reliability findings (docs/platform-audit/app): a stopped engine, the
 * library search, a typed recall revealed without Check, and the orphan routes.
 */

test("a stopped engine gets one honest state with Try again, and no fake zeros", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".site-nav")).toBeVisible();
  // Every API request now fails as it does when the local engine has stopped.
  await page.route("**/api/**", (route) => route.fulfill({ status: 502, body: "" }));
  await page.goto("/review");
  await expect(
    page.getByRole("heading", { name: "Discere’s engine isn’t responding" }),
  ).toBeVisible();
  await expect(page.getByText(/Reopen Discere from Instrumenta/)).toBeVisible();
  await expect(page.getByText(/status 502/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  // The top bar shows that progress is unavailable rather than a streak of zero.
  await expect(page.locator(".site-streak")).toHaveCount(0);
  await page.unroute("**/api/**");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Review" })).toBeVisible();
});

test("library search finds lessons by the ideas they teach", async ({ page }) => {
  await page.goto("/courses?q=bayes");
  const match = page.getByRole("region", { name: "Lessons and ideas" }).getByRole("link", {
    name: /Base rates and Bayes/,
  });
  await expect(match).toBeVisible();
  await match.click();
  await expect(page).toHaveURL(/\/courses\/psychology-how-minds-work\/lessons\//);
  await page.goto("/courses?q=zzqqx");
  await expect(page.getByRole("heading", { name: "Nothing matches that search" })).toBeVisible();
});

test("revealing a typed recall records it instead of discarding it", async ({ page, request }) => {
  const created = await request.post("/api/review/sessions", {
    data: { lessonId: "what-a-letter-stands-for" },
  });
  const { sessionId } = (await created.json()) as { sessionId: string };
  await page.goto("/review/session/" + sessionId);
  await page.getByLabel("Your answer").fill("no idea");
  await expect(page.getByText("Revealing checks what you typed first.")).toBeVisible();
  await page.getByRole("button", { name: /Reveal answer/ }).click();
  await expect(page.getByRole("button", { name: /Again/ })).toHaveClass(/is-suggested/);
  const saved = await (await request.get("/api/review/sessions/" + sessionId)).json();
  expect(saved.response).toBe("no idea");
  await page.getByRole("button", { name: /Again/ }).click();
  await expect(page.getByText(/This card comes back in \d+ minutes?\./)).toBeVisible();
});

test("old and unknown addresses lead somewhere honest", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /flushSync/.test(message.text())) errors.push(message.text());
  });
  await page.goto("/progress");
  await expect(page).toHaveURL(/\/you$/);
  expect(errors).toEqual([]);
  await page.goto("/legacy/courses/maths-foundations");
  await expect(page).toHaveURL(/\/courses\/maths-foundations$/);
  await page.goto("/courses/roman-empire");
  await expect(page.getByRole("complementary", { name: "Archived course" })).toBeVisible();
  await page.goto("/somewhere/else");
  await expect(page.getByRole("heading", { name: "This page doesn’t exist" })).toBeVisible();
  await expect(page.getByRole("searchbox")).toBeVisible();
});
