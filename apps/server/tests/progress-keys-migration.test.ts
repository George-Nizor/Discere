import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listMigrations } from "../src/db/migrations.js";
import { DiscereStore } from "../src/db/store.js";

/**
 * Migration 0011 renames positional progress keys. It runs once against the owner's real
 * database, so it is exercised here against a realistic legacy database: rows written exactly
 * the way the pre-0011 player wrote them, across several courses and every stage state.
 */
const MIGRATION = "0011_stable_progress_keys.sql";

interface SnapshotLesson {
  courseId: string;
  lessonId: string;
  steps: string[];
  questions: string[];
}

/** The lesson structure the migration was written against, read back from the migration. */
function snapshot(): SnapshotLesson[] {
  const sql = readFileSync(new URL(`../drizzle/${MIGRATION}`, import.meta.url), "utf8");
  const lessons = new Map<string, SnapshotLesson>();
  const lesson = (journeyId: string) => {
    const separator = journeyId.indexOf(":");
    const key = journeyId;
    const existing = lessons.get(key);
    if (existing) return existing;
    const created = {
      courseId: journeyId.slice(0, separator),
      lessonId: journeyId.slice(separator + 1),
      steps: [],
      questions: [],
    };
    lessons.set(key, created);
    return created;
  };
  for (const match of sql.matchAll(/\('([^']+)', '[^']+:quiz-(\d+)', '[^']+:check:([^']+)'\)/gu))
    lesson(match[1]!).questions[Number(match[2]) - 1] = match[3]!;
  for (const match of sql.matchAll(/\('([^']+)', '[^']+:explainer', (\d+), '([^']+)'\)/gu))
    lesson(match[1]!).steps[Number(match[2])] = match[3]!;
  return [...lessons.values()];
}

let directory: string;
let databasePath: string;
beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), "discere-progress-keys-"));
  databasePath = path.join(directory, "discere.sqlite");
});
afterEach(() => rmSync(directory, { recursive: true, force: true }));

const at = (minute: number) =>
  `2026-10-0${1 + (minute % 5)}T08:${String(minute % 60).padStart(2, "0")}:00.000Z`;

/** Builds the database as it stood before 0011, then writes progress the way the old player did. */
function legacyDatabase(lessons: SnapshotLesson[]): void {
  const legacy = new Database(databasePath);
  legacy.exec("CREATE TABLE schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
  for (const name of listMigrations().filter((name) => name < "0011")) {
    legacy.exec(readFileSync(new URL(`../drizzle/${name}`, import.meta.url), "utf8"));
    legacy.prepare("INSERT INTO schema_migrations VALUES (?, ?)").run(name, at(0));
  }
  const save = legacy.prepare(
    "INSERT INTO journey_progress (user_id, journey_id, stage_id, state, interaction_state, updated_at) VALUES ('local-user', ?, ?, ?, ?, ?)",
  );
  const reward = legacy.prepare(
    "INSERT INTO learning_events (user_id, event_key, kind, reference_id, occurred_at, updated_at, xp, correct, independent, qualifying) VALUES ('local-user', ?, 'stage', ?, ?, ?, ?, 0, 0, 0)",
  );
  const write = legacy.transaction(() =>
    lessons.forEach((lesson, index) => {
      const journey = `${lesson.courseId}:${lesson.lessonId}`;
      const quiz = (n: number) => `${lesson.lessonId}:quiz-${n}`;
      const scenario = index % 5;
      if (scenario === 0) {
        // Mid-lesson: the old player saved only the step index.
        save.run(
          journey,
          `${lesson.lessonId}:explainer`,
          "active",
          JSON.stringify({ stepIndex: 2 }),
          at(index),
        );
      } else if (scenario === 1) {
        // Explainer done, first check done, second check open.
        save.run(journey, `${lesson.lessonId}:explainer`, "completed", "{}", at(index));
        save.run(journey, quiz(1), "completed", "{}", at(index + 1));
        save.run(journey, quiz(2), "active", "{}", at(index + 2));
        reward.run(
          `stage:${journey}:${lesson.lessonId}:explainer`,
          journey,
          at(index),
          at(index),
          10,
        );
        reward.run(`stage:${journey}:${quiz(1)}`, journey, at(index + 1), at(index + 1), 5);
      } else if (scenario === 2) {
        // Finished lesson, including the completion stage.
        save.run(journey, `${lesson.lessonId}:explainer`, "completed", "{}", at(index));
        lesson.questions.forEach((_, n) => {
          save.run(journey, quiz(n + 1), "completed", "{}", at(index + n + 1));
          reward.run(`stage:${journey}:${quiz(n + 1)}`, journey, at(index), at(index), 5);
        });
        save.run(journey, `${lesson.lessonId}:review`, "completed", "{}", at(index + 5));
        save.run(journey, `${lesson.lessonId}:completion`, "completed", "{}", at(index + 6));
      } else if (scenario === 3) {
        // An index past the end and a hand-edited row: both must survive untouched.
        save.run(
          journey,
          `${lesson.lessonId}:explainer`,
          "active",
          JSON.stringify({ stepIndex: 99 }),
          at(index),
        );
      } else {
        save.run(journey, `${lesson.lessonId}:explainer`, "active", "not json", at(index));
      }
    }),
  );
  write();
  legacy.close();
}

describe("migration 0011: stable progress keys", () => {
  const lessons = snapshot();

  it("covers every active course's lessons", () => {
    expect(lessons.length).toBeGreaterThan(200);
    expect(
      lessons.every((lesson) => lesson.steps.length >= 3 && lesson.questions.length >= 1),
    ).toBe(true);
  });

  it("renames positional keys without losing a row, a state, a timestamp or any XP", () => {
    legacyDatabase(lessons);
    const before = new Database(databasePath, { readonly: true });
    const rowsBefore = before.prepare("SELECT COUNT(*) AS n FROM journey_progress").get() as {
      n: number;
    };
    const xpBefore = before
      .prepare("SELECT SUM(xp) AS xp, COUNT(*) AS n FROM learning_events")
      .get();
    const completedBefore = before
      .prepare("SELECT COUNT(*) AS n FROM journey_progress WHERE state = 'completed'")
      .get();
    before.close();

    const store = new DiscereStore(databasePath, { migrate: true });
    const db = store.database;
    expect(db.prepare("SELECT COUNT(*) AS n FROM journey_progress").get()).toEqual(rowsBefore);
    expect(db.prepare("SELECT SUM(xp) AS xp, COUNT(*) AS n FROM learning_events").get()).toEqual(
      xpBefore,
    );
    expect(
      db.prepare("SELECT COUNT(*) AS n FROM journey_progress WHERE state = 'completed'").get(),
    ).toEqual(completedBefore);
    expect(
      db.prepare("SELECT COUNT(*) AS n FROM journey_progress WHERE stage_id LIKE '%:quiz-%'").get(),
    ).toEqual({ n: 0 });
    expect(
      db.prepare("SELECT COUNT(*) AS n FROM learning_events WHERE event_key LIKE '%:quiz-%'").get(),
    ).toEqual({ n: 0 });

    lessons.forEach((lesson, index) => {
      const journey = `${lesson.courseId}:${lesson.lessonId}`;
      const row = (stage: string) =>
        db
          .prepare(
            "SELECT state, interaction_state AS interactionState, updated_at AS updatedAt FROM journey_progress WHERE journey_id = ? AND stage_id = ?",
          )
          .get(journey, stage) as
          | { state: string; interactionState: string; updatedAt: string }
          | undefined;
      const check = (n: number) => `${lesson.lessonId}:check:${lesson.questions[n - 1]}`;
      switch (index % 5) {
        case 0:
          expect(JSON.parse(row(`${lesson.lessonId}:explainer`)!.interactionState)).toEqual({
            stepIndex: 2,
            stepId: lesson.steps[2],
          });
          break;
        case 1:
          expect(row(check(1))).toMatchObject({ state: "completed", updatedAt: at(index + 1) });
          expect(row(check(2))).toMatchObject({ state: "active", updatedAt: at(index + 2) });
          expect(
            db
              .prepare("SELECT xp FROM learning_events WHERE event_key = ?")
              .get(`stage:${journey}:${check(1)}`),
          ).toEqual({ xp: 5 });
          break;
        case 2:
          for (let n = 1; n <= lesson.questions.length; n += 1)
            expect(row(check(n))?.state).toBe("completed");
          break;
        case 3:
          expect(JSON.parse(row(`${lesson.lessonId}:explainer`)!.interactionState)).toEqual({
            stepIndex: 99,
          });
          break;
        default:
          expect(row(`${lesson.lessonId}:explainer`)!.interactionState).toBe("not json");
      }
    });

    // A finished lesson is still finished, and the old player's resume point is the new one's.
    expect(store.completedJourneyIds().size).toBe(
      lessons.filter((_, index) => index % 5 === 2).length,
    );
    store.close();

    // Re-opening applies nothing twice.
    const reopened = new DiscereStore(databasePath, { migrate: true });
    expect(reopened.database.prepare("SELECT COUNT(*) AS n FROM journey_progress").get()).toEqual(
      rowsBefore,
    );
    reopened.close();
  });

  it("reports the renamed checks as the active stage through the journey progress read", () => {
    const lesson = lessons.find(
      (item) => item.courseId === "probability-statistics" && item.questions.length >= 2,
    )!;
    legacyDatabase([lesson, lesson, lesson].slice(0, 1).map((item) => item));
    // Scenario 0 only wrote the explainer; add the mid-check scenario by hand for this lesson.
    const legacy = new Database(databasePath);
    const journey = `${lesson.courseId}:${lesson.lessonId}`;
    legacy
      .prepare("UPDATE journey_progress SET state = 'completed' WHERE journey_id = ?")
      .run(journey);
    legacy
      .prepare(
        "INSERT INTO journey_progress VALUES ('local-user', ?, ?, 'completed', '{}', ?), ('local-user', ?, ?, 'active', '{}', ?)",
      )
      .run(
        journey,
        `${lesson.lessonId}:quiz-1`,
        at(3),
        journey,
        `${lesson.lessonId}:quiz-2`,
        at(4),
      );
    legacy.close();
    const store = new DiscereStore(databasePath, { migrate: true });
    const order = [
      `${lesson.lessonId}:explainer`,
      ...lesson.questions.map((id) => `${lesson.lessonId}:check:${id}`),
      `${lesson.lessonId}:review`,
      `${lesson.lessonId}:completion`,
    ];
    const progress = store.getJourneyProgress(journey, order);
    expect(progress.activeStageId).toBe(`${lesson.lessonId}:check:${lesson.questions[1]}`);
    expect(progress.stages[1]?.state).toBe("completed");
    store.close();
  });
});
