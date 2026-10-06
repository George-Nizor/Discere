import { mkdtempSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import type { Page, APIRequestContext } from "@playwright/test";
import {
  CourseBundleSchema,
  type CourseBundle,
  type CourseCheckDefinition,
} from "@discere/contracts";
import { createApp, type DiscereApp } from "../../server/src/app.js";
import { test, expect } from "./fixtures.js";
const root = resolve(import.meta.dirname, "../../..");
const sizes = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
];
const output = join(root, "docs/course-checks/screens/data");
const candidate = process.env["DISCERE_DATA_CHECKS_CANDIDATE"] === "1";
async function layout(page: Page) {
  for (const size of sizes) {
    await page.setViewportSize(size);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
      .toBeLessThanOrEqual(1);
    const response = page.getByLabel("Value", { exact: true });
    const target = (await response.count())
      ? response
      : page.getByRole("group", { name: "Answer choices" }).getByRole("button").last();
    await target.scrollIntoViewIfNeeded();
    const r = await target.boundingBox(),
      f = await page.locator(".check-actions").boundingBox();
    expect(r!.y + r!.height).toBeLessThanOrEqual(f!.y + 1);
    await page.getByRole("radio", { name: "Very sure", exact: true }).scrollIntoViewIfNeeded();
    const confidence = await page
      .getByRole("radio", { name: "Very sure", exact: true })
      .boundingBox();
    expect(confidence!.y + confidence!.height).toBeLessThanOrEqual(f!.y + 1);
  }
}
async function capture(page: Page, name: string) {
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    if (await page.locator(".check-question-scroll").count())
      await page
        .locator(".check-question-scroll")
        .evaluate((e) => e.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: join(output, name + "-" + size.width + ".png") });
  }
}
async function select(page: Page, item: CourseCheckDefinition["items"][number], wrong = false) {
  const a = item.question.answerAuthority;
  if (a.kind === "numeric")
    await page.getByLabel("Value", { exact: true }).fill(String(wrong ? a.value + 1000 : a.value));
  else {
    const choice = item.question.choices!.find((c) =>
      wrong ? !a.acceptedIdeas.includes(c.label) : a.acceptedIdeas.includes(c.label),
    )!;
    await page
      .getByRole("group", { name: "Answer choices" })
      .getByRole("button")
      .filter({ has: page.getByText(choice.label, { exact: true }) })
      .click();
  }
  await page.getByRole("radio", { name: "Very sure", exact: true }).check();
}
async function save(page: Page) {
  await page.getByRole("button", { name: /^(Save and continue|Finish check)$/ }).click();
}
async function completeLessons(request: APIRequestContext, address: string, bundle: CourseBundle) {
  const post = async (url: string, data: unknown = {}) => {
    const r = await request.post(address + url, { data });
    expect(r.ok(), await r.text()).toBe(true);
    return r.json();
  };
  for (const l of bundle.lessons) {
    for (const id of [...l.steps.map((s) => s.checkQuestionId), ...l.questionIds].filter(Boolean)) {
      const q = bundle.questions.find((q) => q.id === id)!,
        a = q.answerAuthority;
      const r = await post("/api/attempts", {
        questionId: q.id,
        response: a.kind === "numeric" ? String(a.value) : a.acceptedIdeas[0],
        mode: "coach",
      });
      expect(r.correct, q.id).toBe(true);
    }
    for (const id of l.flashcardIds) {
      const c = bundle.flashcards.find((c) => c.id === id)!,
        a = c.answerAuthority!;
      const s = await post("/api/review/sessions", { lessonId: l.id, cardId: id, mode: "coach" });
      await post("/api/review/sessions/" + s.sessionId + "/respond", {
        response: a.kind === "numeric" ? String(a.value) : a.acceptedIdeas[0],
      });
      await post("/api/review/sessions/" + s.sessionId + "/reveal");
      await post("/api/review/sessions/" + s.sessionId + "/rate", {
        rating: "easy",
        recalled: true,
      });
    }
    const route = "/api/courses/" + bundle.course.id + "/lessons/" + l.id;
    const j = await (await request.get(address + route + "/journey")).json();
    for (const s of j.stages) {
      const r = await request.put(address + route + "/progress", {
        data: { stageId: s.id, state: "completed", interactionState: {} },
      });
      expect(r.ok(), await r.text()).toBe(true);
    }
  }
}
for (const id of ["sql-from-rows-to-reports", "python-for-data-analysis"])
  test.describe(id + " independent checks", () => {
    const bundle = CourseBundleSchema.parse(
      JSON.parse(
        readFileSync(
          join(root, "content", id, candidate ? ".authoring/candidate.json" : "bundle.json"),
          "utf8",
        ),
      ),
    );
    let directory: string,
      address: string,
      server: DiscereApp,
      now = new Date("2026-10-02T00:00:00Z");
    test.beforeAll(async () => {
      directory = mkdtempSync(join(tmpdir(), "discere-data-checks-"));
      server = await createApp({
        dbPath: join(directory, "checks.sqlite"),
        migrate: true,
        clock: () => now,
        webRoot: resolve(import.meta.dirname, "../dist"),
      });
      if (candidate) {
        // Preview only in this disposable in-memory content catalogue; no published file changes.
        server.content.bundle(id)!.courseChecks = structuredClone(bundle.courseChecks!);
        server.content.bundle(id)!.course.version = bundle.course.version;
      }
      address = await server.app.listen({ port: 0, host: "127.0.0.1" });
      mkdirSync(output, { recursive: true });
    });
    test.afterAll(async () => {
      await server?.app.close();
      if (directory) rmSync(directory, { recursive: true, force: true });
    });
    test("placement keeps drafts, conceals answers and recommends the missed lesson", async ({
      page,
      request,
    }) => {
      test.setTimeout(120000);
      const check = bundle.courseChecks![0]!;
      await page.goto(address + "/courses/" + id);
      await page.getByRole("link", { name: "Find your starting point", exact: true }).click();
      await capture(page, id + "-intro");
      await page.getByRole("button", { name: "Start check", exact: true }).click();
      const summary = await (await request.get(address + "/api/courses/" + id + "/checks")).json();
      const sessionId = summary.checks.find((c: { id: string }) => c.id === check.id).sessionId;
      for (const [i, item] of check.items.entries()) {
        await expect(
          page.getByRole("heading", { name: item.question.prompt, exact: true }),
        ).toBeVisible();
        const s = await (
          await request.get(address + "/api/course-check-sessions/" + sessionId)
        ).json();
        expect(s.result).toBeUndefined();
        expect(JSON.stringify(s.current)).not.toMatch(
          /answerAuthority|acceptedIdeas|workedAnswer|exampleAnswer/,
        );
        await layout(page);
        if (
          [0, 4, 7, 9, 12, 14].includes(i) ||
          item.visual.type === "data_series" ||
          item.visual.type === "program" ||
          "conclusion" in item.visual
        )
          await capture(page, id + "-placement-" + (i + 1));
        await select(page, item, i === 0);
        if (i === 0) {
          await page.reload();
          await expect(page.getByRole("radio", { name: "Very sure", exact: true })).toBeChecked();
          if (item.question.answerAuthority.kind === "numeric")
            await expect(page.getByLabel("Value", { exact: true })).toHaveValue(
              String(item.question.answerAuthority.value + 1000),
            );
          else await expect(page.locator(".choice-card-selected")).toHaveCount(1);
        }
        await save(page);
        if (i === 1) await page.reload();
      }
      await expect(page.locator(".check-result-score")).toHaveText(
        check.items.length - 1 + " / " + check.items.length + " correct",
      );
      const lesson = bundle.lessons.find((l) => l.id === check.items[0]!.lessonId)!;
      // The missed lesson leads the recommendations, tagged "Start here".
      const start = page
        .getByRole("region", { name: "Recommended lessons" })
        .getByRole("link")
        .first();
      await expect(start).toContainText(lesson.title);
      await expect(start).toContainText("Start here");
      await capture(page, id + "-placement-result");
      await page.locator(".check-explanations summary").first().click();
      const a = check.items[0]!.question.answerAuthority;
      await expect(page.locator(".check-explanation-body").first()).toContainText(
        a.kind === "numeric" ? a.workedAnswer : a.exampleAnswer,
      );
      await page.reload();
      await expect(page.locator(".check-player")).not.toHaveClass(/is-fresh-finish/);
    });
    test("mixed and delayed sets require all lessons, persist answers and wait seven days", async ({
      page,
      request,
    }) => {
      test.setTimeout(240000);
      const mixed = bundle.courseChecks![1]!,
        later = bundle.courseChecks![2]!;
      await page.goto(address + "/courses/" + id + "/checks/" + mixed.id);
      await expect(page.getByRole("button", { name: "Start check", exact: true })).toHaveCount(0);
      await completeLessons(request, address, bundle);
      await page.reload();
      await page.getByRole("button", { name: "Start check", exact: true }).click();
      for (const [i, item] of mixed.items.entries()) {
        await expect(
          page.getByRole("heading", { name: item.question.prompt, exact: true }),
        ).toBeVisible();
        await layout(page);
        if (i === 0 || i === 3) await capture(page, id + "-mixed-" + (i + 1));
        await select(page, item);
        await save(page);
      }
      await expect(page.locator(".check-result-score")).toHaveText(
        mixed.items.length + " / " + mixed.items.length + " correct",
      );
      await page.goto(address + "/courses/" + id + "/checks/" + later.id);
      await expect(page.getByRole("button", { name: "Start check", exact: true })).toHaveCount(0);
      now = new Date(now.getTime() + 7 * 86400000 - 1);
      await page.reload();
      await expect(page.getByRole("button", { name: "Start check", exact: true })).toHaveCount(0);
      now = new Date(now.getTime() + 1);
      await page.goto(address + "/review");
      await page
        .getByRole("region", { name: "Later course checks" })
        .getByRole("link", { name: "Use it a week later", exact: true })
        .click();
      await page.getByRole("button", { name: "Start check", exact: true }).click();
      for (const [i, item] of later.items.entries()) {
        await expect(
          page.getByRole("heading", { name: item.question.prompt, exact: true }),
        ).toBeVisible();
        await layout(page);
        if (i === 0 || i === 2) await capture(page, id + "-transfer-" + (i + 1));
        await select(page, item);
        await save(page);
      }
      await expect(page.locator(".check-result-score")).toHaveText(
        later.items.length + " / " + later.items.length + " correct",
      );
      await capture(page, id + "-transfer-result");
      await page.goto(address + "/review");
      await expect(page.getByRole("region", { name: "Later course checks" })).toHaveCount(0);
    });
  });
