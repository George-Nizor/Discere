import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Page } from "@playwright/test";
import { sqlProjects } from "../../../content/sql-from-rows-to-reports/authoring/projects.js";
import { test, expect } from "./fixtures.js";
import { createApp } from "../../server/src/app.js";
const sizes = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
];
const output = resolve(import.meta.dirname, "../../../docs/sql-projects/screens");
async function capture(page: Page, name: string) {
  mkdirSync(output, { recursive: true });
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
    await page.screenshot({ path: join(output, name + "-" + size.width + ".png"), fullPage: true });
  }
}
for (const [index, project] of sqlProjects.projects.entries()) {
  test("SQL construction: " + project.title, async ({ page, request }) => {
    test.setTimeout(120000);
    const mode = (["coach", "direct", "exam"] as const)[index]!;
    await request.put("/api/study/preferences", { data: { sound: true } });
    await page.addInitScript(() => {
      const w = window as unknown as { AudioContext: typeof AudioContext; sqlNotes: number };
      const Native = w.AudioContext;
      w.sqlNotes = 0;
      w.AudioContext = class extends Native {
        override createOscillator() {
          w.sqlNotes++;
          return super.createOscillator();
        }
      };
    });
    await page.setViewportSize(sizes[index]!);
    await page.goto("/courses/" + sqlProjects.courseId);
    await expect(page.getByRole("heading", { name: "Write your own queries" })).toBeVisible();
    await page.getByRole("link").filter({ hasText: project.title }).click();
    await expect(page.getByRole("heading", { name: project.title })).toBeVisible();
    await page.getByRole("combobox", { name: "Practice mode" }).selectOption(mode);
    if (index === 0) await capture(page, "project-introduction");
    await page.getByRole("button", { name: "Start project", exact: true }).click();
    await expect(page.getByRole("heading", { name: project.tasks[0]!.title })).toBeVisible();
    const id = page.url().split("/").pop()!;
    const endpoint = "/api/sql-projects/" + id;
    const initial = await (await request.get(endpoint)).json();
    expect(initial.current).not.toHaveProperty("cases");
    expect(initial.current).not.toHaveProperty("solution");
    expect(JSON.stringify(initial)).not.toContain(project.tasks[0]!.solution);
    for (const [i, task] of project.tasks.entries()) {
      await expect(page.getByRole("heading", { name: task.title })).toBeVisible();
      if (i === 0) {
        await capture(page, project.id + "-question");
        await page.setViewportSize(sizes[index]!);
      }
      const editor = page.getByLabel("Your query", { exact: true });
      if (index === 0 && i === 0) {
        const draft = "SELECT j.id, j.item FROM jobs AS j";
        await editor.fill(draft);
        await expect
          .poll(async () => (await (await request.get(endpoint)).json()).current.query)
          .toBe(draft);
        await page.reload();
        await expect(editor).toHaveValue(draft);
        const saved = await (await request.get(endpoint)).json();
        const other = await request.post(endpoint + "/actions", {
          data: {
            taskId: task.id,
            revision: saved.revision,
            requestId: crypto.randomUUID(),
            action: "save",
            query: draft + " ORDER BY j.id DESC",
          },
        });
        expect(other.ok()).toBe(true);
        await page.getByRole("button", { name: "Run query", exact: true }).click();
        await expect(
          page.getByText("This project changed in another tab.", { exact: false }),
        ).toBeVisible();
        await page.getByRole("button", { name: "Load saved progress" }).click();
        await expect(editor).toHaveValue(draft + " ORDER BY j.id DESC");
        await editor.fill(
          "SELECT 12 AS id, 'lamp' AS item UNION ALL SELECT 15, 'chair' UNION ALL SELECT 19, 'lamp'",
        );
        await page.getByRole("button", { name: "Check query", exact: true }).click();
        await expect(
          page.getByText("This works for the displayed rows, but fails when the data changes.", {
            exact: false,
          }),
        ).toBeVisible();
        await expect(page.locator(".sql-workspace--correct")).toHaveCount(0);
        // A wrong check never turns the main button into Continue: retry is primary, skipping
        // is a separate, quieter choice.
        await expect(page.getByRole("button", { name: "Check again", exact: true })).toBeDisabled();
        await expect(
          page.getByRole("button", { name: "Skip this task", exact: true }),
        ).toBeVisible();
        await expect(page.getByRole("button", { name: /^Continue/ })).toHaveCount(0);
        await capture(page, "changing-data-correction");
      }
      if (index === 1 && i === 0) {
        await page.getByRole("button", { name: "Worked query", exact: true }).click();
        await page
          .getByLabel("What would you like to compare?")
          .fill("How to count unknown durations.");
        await page.getByRole("button", { name: "Request worked query", exact: true }).click();
        await page.getByLabel("Type “show answer” to open the worked query.").fill("show answer");
        await page
          .getByRole("button", { name: "Show worked query", exact: true })
          .click({ timeout: 10000 });
        await expect(page.getByRole("heading", { name: "One way to write it" })).toBeVisible();
        await page.getByRole("button", { name: "Continue", exact: true }).click();
        continue;
      }
      await editor.fill(task.solution);
      await page.getByRole("button", { name: "Run query", exact: true }).click();
      await expect(page.getByRole("region", { name: "Query result", exact: true })).toBeVisible();
      expect(await (await request.get(endpoint)).json()).not.toHaveProperty("results");
      await page
        .getByRole("button", {
          // After a wrong check, retrying stays the main action and is named for it.
          name: mode === "exam" ? "Submit query" : /^Check (query|again)$/,
          ...(mode === "exam" ? { exact: true } : {}),
        })
        .click();
      if (mode === "exam") {
        await expect(
          page.getByText("Response saved. Feedback will appear after the last task."),
        ).toBeVisible();
        const state = await (await request.get(endpoint)).json();
        expect(state.current).not.toHaveProperty("feedback");
        expect(state.xp).toBe(0);
        await expect(page.getByRole("button", { name: "Hint", exact: true })).toHaveCount(0);
      } else {
        await expect(page.locator(".sql-workspace--correct")).toBeVisible();
        await page.getByRole("button", { name: "Why?", exact: true }).click();
        await expect(page.getByText(task.explanation, { exact: true })).toBeVisible();
        await expect
          .poll(() => page.evaluate(() => (window as unknown as { sqlNotes: number }).sqlNotes))
          .toBeGreaterThanOrEqual(2);
      }
      if (i === 0 || i === project.tasks.length - 1) {
        await capture(page, project.id + "-feedback-" + i);
        await page.setViewportSize(sizes[index]!);
      }
      await page
        .getByRole("button", {
          name:
            i === project.tasks.length - 1
              ? mode === "exam"
                ? "Finish exam"
                : "See results"
              : "Continue",
          exact: true,
        })
        .click();
    }
    await expect(page.getByText("Project complete", { exact: true })).toBeVisible();
    const final = await (await request.get(endpoint)).json();
    expect(final.results).toHaveLength(5);
    expect(final.xp).toBe(index === 0 ? 22 : index === 1 ? 20 : 25);
    await page.reload();
    await expect(page.getByText("Project complete", { exact: true })).toBeVisible();
    await capture(page, project.id + "-results");
    await page.getByRole("link", { name: "Return to the roadmap" }).click();
    await expect(page.getByRole("heading", { name: "Write your own queries" })).toBeVisible();
    await page.getByRole("link").filter({ hasText: project.title }).click();
    await expect(page.getByText("Project complete", { exact: true })).toBeVisible();
  });
}

test("an exam can be submitted early without grading an unfinished draft as correct", async ({
  page,
}) => {
  const isolated = await createApp({
    dbPath: ":memory:",
    migrate: true,
    webRoot: resolve(import.meta.dirname, "../dist"),
  });
  const address = await isolated.app.listen({ host: "127.0.0.1", port: 0 });
  try {
    const project = sqlProjects.projects[0]!;
    const started = await isolated.app.inject({
      method: "POST",
      url: "/api/courses/" + sqlProjects.courseId + "/sql-projects/" + project.id,
      payload: { mode: "exam" },
    });
    expect(started.statusCode).toBe(200);
    await page.goto(address + "/sql-projects/" + started.json().id);
    await page.getByLabel("Your query", { exact: true }).fill(project.tasks[0]!.solution);
    await page.getByRole("button", { name: "Submit query", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByLabel("Your query", { exact: true }).fill("SELECT item FROM repairs");
    await page.getByRole("button", { name: "End exam early", exact: true }).click();
    await expect(page.getByRole("region", { name: "Finish the exam now" })).toBeVisible();
    await page.getByRole("button", { name: "Keep working", exact: true }).click();
    await expect(page.getByRole("region", { name: "Finish the exam now" })).toHaveCount(0);
    await page.getByRole("button", { name: "End exam early", exact: true }).click();
    await page.getByRole("button", { name: "Submit exam now", exact: true }).click();
    await expect(page.getByText("Project complete", { exact: true })).toBeVisible();
    await expect(
      page.getByText("1 of 5 queries matched all datasets. 1 solved independently."),
    ).toBeVisible();
    await expect(page.getByText("+5 XP", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("+5 XP", { exact: true })).toBeVisible();
  } finally {
    await isolated.app.close();
  }
});
