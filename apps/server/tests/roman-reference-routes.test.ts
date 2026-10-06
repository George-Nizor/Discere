import type { RomanReferenceProgress } from "@discere/contracts";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { DiscereStore } from "../src/db/store.js";
import {
  ROMAN_REFERENCE_JOURNEY_ID,
  ROMAN_REFERENCE_STATE_STAGE_ID,
} from "../src/roman-reference-routes.js";

const PATH = "/api/courses/roman-empire/lessons/rise-of-the-roman-empire/reference/progress";
const CORRECT_ORDER = ["augustus", "extent", "division", "deposition"];
const WRONG_ORDER = ["deposition", "division", "extent", "augustus"];

const STORED_DEFAULT = {
  version: 1,
  opening: {
    order: ["extent", "deposition", "augustus", "division"],
    submittedOrder: null,
    status: "editing",
    wasCorrect: null,
  },
  augustus: { completed: false },
  expansion: {
    milestoneId: "117-ce",
    answerOpen: false,
    answer: "",
    saved: false,
  },
};

let app: FastifyInstance;
let store: DiscereStore;

beforeEach(async () => {
  ({ app, store } = await createApp({ dbPath: ":memory:", migrate: true }));
});

afterEach(async () => {
  await app.close();
});

async function getProgress(): Promise<RomanReferenceProgress> {
  const response = await app.inject({ method: "GET", url: PATH });
  expect(response.statusCode).toBe(200);
  return response.json() as RomanReferenceProgress;
}

async function act(payload: Record<string, unknown>): Promise<RomanReferenceProgress> {
  const response = await app.inject({ method: "PUT", url: PATH, payload });
  expect(response.statusCode).toBe(200);
  return response.json() as RomanReferenceProgress;
}

describe("Roman recovery reference progress", () => {
  it("returns a stable non-solution default without creating a row or exposing authority", async () => {
    const response = await app.inject({ method: "GET", url: PATH });
    expect(response.statusCode).toBe(200);
    const progress = response.json() as RomanReferenceProgress;

    expect(progress).toMatchObject({
      version: 4,
      activeBeat: "opening",
      updatedAt: null,
      opening: {
        order: ["extent", "deposition", "augustus", "division"],
        submittedOrder: null,
        status: "editing",
        wasCorrect: null,
      },
      augustus: { completed: false },
      expansion: {
        milestoneId: "117-ce",
        answerOpen: false,
        answer: "",
        saved: false,
        completed: false,
      },
    });
    expect(progress.opening.order).not.toEqual(CORRECT_ORDER);
    expect(response.body).not.toContain("correctOrder");
    expect(store.database.prepare("SELECT COUNT(*) AS count FROM journey_progress").get()).toEqual({
      count: 0,
    });
  });

  it("keeps one active synthetic row without affecting learner evidence or catalogue progress", async () => {
    const profileBefore = store.getProfile();
    const conceptsBefore = store.getProgress();

    await act({ action: "reorder_opening", order: WRONG_ORDER });
    await act({ action: "select_expansion_milestone", milestoneId: "284-ce" });

    const restored = await getProgress();
    expect(restored.opening.order).toEqual(WRONG_ORDER);
    expect(restored.expansion.milestoneId).toBe("284-ce");
    expect(restored.updatedAt).not.toBeNull();

    const rows = store.database
      .prepare("SELECT journey_id AS journeyId, stage_id AS stageId, state FROM journey_progress")
      .all();
    expect(rows).toEqual([
      {
        journeyId: ROMAN_REFERENCE_JOURNEY_ID,
        stageId: ROMAN_REFERENCE_STATE_STAGE_ID,
        state: "active",
      },
    ]);
    expect(ROMAN_REFERENCE_JOURNEY_ID).not.toContain(":");
    expect(store.getProfile()).toEqual(profileBefore);
    expect(store.getProgress()).toEqual(conceptsBefore);
    expect(store.courseActivity()).toEqual(new Map());
    expect(store.completedLessonsByCourse()).toEqual(new Map());
    expect(store.completedJourneyIds()).toEqual(new Set());
    expect(store.activityByDay("2000-01-01")).toEqual([]);
    expect(store.database.prepare("SELECT COUNT(*) AS count FROM attempts").get()).toEqual({
      count: 0,
    });
  });

  it("checks an opening order on the server and preserves both the guess and revealed sequence", async () => {
    const checked = await act({ action: "check_opening", order: WRONG_ORDER });

    expect(checked.activeBeat).toBe("augustus");
    expect(checked.opening).toEqual({
      order: CORRECT_ORDER,
      submittedOrder: WRONG_ORDER,
      status: "checked",
      wasCorrect: false,
    });
    expect((await getProgress()).opening).toEqual(checked.opening);
  });

  it("records a correct opening submission without changing its submitted order", async () => {
    const checked = await act({ action: "check_opening", order: CORRECT_ORDER });
    expect(checked.opening).toEqual({
      order: CORRECT_ORDER,
      submittedOrder: CORRECT_ORDER,
      status: "checked",
      wasCorrect: true,
    });
  });

  it("skips without judging or revealing the learner's guess", async () => {
    const skipped = await act({ action: "skip_opening", order: WRONG_ORDER });
    expect(skipped.activeBeat).toBe("augustus");
    expect(skipped.opening).toEqual({
      order: WRONG_ORDER,
      submittedOrder: null,
      status: "skipped",
      wasCorrect: null,
    });
    expect(skipped.opening.order).not.toEqual(CORRECT_ORDER);
  });

  it.each([
    ["check_opening", { action: "check_opening", order: WRONG_ORDER }],
    ["skip_opening", { action: "skip_opening", order: WRONG_ORDER }],
  ])(
    "returns an identical %s retry without rewriting the terminal state",
    async (_case, payload) => {
      const applied = await act(payload);
      const retainedTimestamp = "2026-08-21T00:00:00.000Z";
      store.database
        .prepare("UPDATE journey_progress SET updated_at = ? WHERE journey_id = ? AND stage_id = ?")
        .run(retainedTimestamp, ROMAN_REFERENCE_JOURNEY_ID, ROMAN_REFERENCE_STATE_STAGE_ID);

      const response = await app.inject({ method: "PUT", url: PATH, payload });
      expect(response.statusCode).toBe(200);
      const retried = response.json() as RomanReferenceProgress;
      expect(retried.opening).toEqual(applied.opening);
      expect(retried.updatedAt).toBe(retainedTimestamp);
      expect(
        store.database
          .prepare(
            "SELECT updated_at AS updatedAt FROM journey_progress WHERE journey_id = ? AND stage_id = ?",
          )
          .get(ROMAN_REFERENCE_JOURNEY_ID, ROMAN_REFERENCE_STATE_STAGE_ID),
      ).toEqual({ updatedAt: retainedTimestamp });
    },
  );

  it.each([
    [
      "a different checked order",
      { action: "check_opening", order: WRONG_ORDER },
      { action: "check_opening", order: CORRECT_ORDER },
    ],
    [
      "skip after check",
      { action: "check_opening", order: WRONG_ORDER },
      { action: "skip_opening", order: WRONG_ORDER },
    ],
    [
      "a different skipped order",
      { action: "skip_opening", order: WRONG_ORDER },
      { action: "skip_opening", order: CORRECT_ORDER },
    ],
    [
      "check after skip",
      { action: "skip_opening", order: WRONG_ORDER },
      { action: "check_opening", order: WRONG_ORDER },
    ],
  ])("rejects %s after the opening is terminal", async (_case, first, conflicting) => {
    await act(first);

    const response = await app.inject({ method: "PUT", url: PATH, payload: conflicting });
    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      code: "OPENING_ALREADY_RESOLVED",
      message: "The opening challenge has already been resolved.",
    });
  });

  it("derives the frontier from opening resolution and Augustus completion", async () => {
    const earlyCompletion = await act({ action: "complete_augustus" });
    expect(earlyCompletion.augustus.completed).toBe(true);
    expect(earlyCompletion.activeBeat).toBe("opening");

    const advanced = await act({ action: "skip_opening", order: WRONG_ORDER });
    expect(advanced.activeBeat).toBe("expansion");
  });

  it("persists the selected milestone, draft, and explicitly saved response", async () => {
    await act({ action: "select_expansion_milestone", milestoneId: "476-ce" });
    const draft = await act({
      action: "update_expansion_draft",
      answerOpen: true,
      answer: "Rome expanded around the Mediterranean.",
    });
    expect(draft.expansion).toMatchObject({
      milestoneId: "476-ce",
      answerOpen: true,
      answer: "Rome expanded around the Mediterranean.",
      saved: false,
    });

    const answer = "Roman territory expanded substantially and reached its greatest extent.";
    const saved = await act({ action: "save_expansion_response", answer });
    expect(saved.expansion).toEqual({
      milestoneId: "476-ce",
      answerOpen: true,
      answer,
      saved: true,
      completed: false,
    });
    expect((await getProgress()).expansion).toEqual(saved.expansion);
  });

  it("rejects malformed actions and paths outside the exact reference lesson", async () => {
    const duplicate = await app.inject({
      method: "PUT",
      url: PATH,
      payload: {
        action: "reorder_opening",
        order: ["augustus", "augustus", "division", "deposition"],
      },
    });
    expect(duplicate.statusCode).toBe(400);
    expect(duplicate.json().code).toBe("VALIDATION_ERROR");

    const blank = await app.inject({
      method: "PUT",
      url: PATH,
      payload: { action: "save_expansion_response", answer: "   " },
    });
    expect(blank.statusCode).toBe(400);

    const extra = await app.inject({
      method: "PUT",
      url: PATH,
      payload: { action: "complete_augustus", unexpected: true },
    });
    expect(extra.statusCode).toBe(400);

    const wrongLesson = await app.inject({
      method: "GET",
      url: "/api/courses/roman-empire/lessons/fall-and-legacy/reference/progress",
    });
    expect(wrongLesson.statusCode).toBe(404);
  });

  it("falls back from malformed stored JSON and repairs it on the next action", async () => {
    const timestamp = "2026-08-22T00:00:00.000Z";
    store.database
      .prepare(
        "INSERT INTO journey_progress (user_id, journey_id, stage_id, state, interaction_state, updated_at) VALUES ('local-user', ?, ?, 'active', ?, ?)",
      )
      .run(ROMAN_REFERENCE_JOURNEY_ID, ROMAN_REFERENCE_STATE_STAGE_ID, "{bad json", timestamp);

    const fallback = await getProgress();
    expect(fallback.activeBeat).toBe("opening");
    expect(fallback.updatedAt).toBeNull();
    expect(fallback.opening.order).not.toEqual(CORRECT_ORDER);

    const repaired = await act({
      action: "select_expansion_milestone",
      milestoneId: "27-bce",
    });
    expect(repaired.expansion.milestoneId).toBe("27-bce");
    const stored = store.database
      .prepare(
        "SELECT interaction_state AS interactionState FROM journey_progress WHERE journey_id = ?",
      )
      .get(ROMAN_REFERENCE_JOURNEY_ID) as { interactionState: string };
    expect(() => JSON.parse(stored.interactionState)).not.toThrow();
  });

  it("falls back from an invalid stored timestamp and repairs it on the next action", async () => {
    store.database
      .prepare(
        "INSERT INTO journey_progress (user_id, journey_id, stage_id, state, interaction_state, updated_at) VALUES ('local-user', ?, ?, 'active', ?, ?)",
      )
      .run(
        ROMAN_REFERENCE_JOURNEY_ID,
        ROMAN_REFERENCE_STATE_STAGE_ID,
        JSON.stringify(STORED_DEFAULT),
        "not-a-timestamp",
      );

    const fallback = await getProgress();
    expect(fallback).toMatchObject({
      activeBeat: "opening",
      updatedAt: null,
      opening: STORED_DEFAULT.opening,
      expansion: STORED_DEFAULT.expansion,
    });

    const repaired = await act({
      action: "select_expansion_milestone",
      milestoneId: "284-ce",
    });
    expect(repaired.expansion.milestoneId).toBe("284-ce");
    expect(repaired.updatedAt).not.toBeNull();
    expect(Number.isNaN(Date.parse(repaired.updatedAt ?? ""))).toBe(false);
    expect(await getProgress()).toEqual(repaired);
  });

  it.each([
    [
      "a checked opening without a result",
      {
        ...STORED_DEFAULT,
        opening: {
          ...STORED_DEFAULT.opening,
          status: "checked",
        },
      },
    ],
    [
      "a noncanonical revealed order",
      {
        ...STORED_DEFAULT,
        opening: {
          order: WRONG_ORDER,
          submittedOrder: WRONG_ORDER,
          status: "checked",
          wasCorrect: false,
        },
      },
    ],
    [
      "an inconsistent correctness judgement",
      {
        ...STORED_DEFAULT,
        opening: {
          order: CORRECT_ORDER,
          submittedOrder: WRONG_ORDER,
          status: "checked",
          wasCorrect: true,
        },
      },
    ],
    [
      "an impossible saved expansion response",
      {
        ...STORED_DEFAULT,
        expansion: {
          milestoneId: "117-ce",
          answerOpen: false,
          answer: "",
          saved: true,
        },
      },
    ],
  ])("falls back from %s and repairs it on the next action", async (_case, interactionState) => {
    store.database
      .prepare(
        "INSERT INTO journey_progress (user_id, journey_id, stage_id, state, interaction_state, updated_at) VALUES ('local-user', ?, ?, 'active', ?, ?)",
      )
      .run(
        ROMAN_REFERENCE_JOURNEY_ID,
        ROMAN_REFERENCE_STATE_STAGE_ID,
        JSON.stringify(interactionState),
        "2026-08-22T00:00:00.000Z",
      );

    const fallback = await getProgress();
    expect(fallback).toMatchObject({
      activeBeat: "opening",
      updatedAt: null,
      opening: STORED_DEFAULT.opening,
      expansion: STORED_DEFAULT.expansion,
    });

    const repaired = await act({
      action: "select_expansion_milestone",
      milestoneId: "27-bce",
    });
    expect(repaired.expansion.milestoneId).toBe("27-bce");
    expect(repaired.updatedAt).not.toBeNull();
    expect((await getProgress()).expansion.milestoneId).toBe("27-bce");
  });
});
