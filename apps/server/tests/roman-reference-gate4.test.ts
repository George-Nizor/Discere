import type { RomanReferenceProgress } from "@discere/contracts";
import { lintText } from "@discere/writing-engine";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { validateTutorReply } from "../src/companion.js";
import type { DiscereStore } from "../src/db/store.js";
import { assessRomanReferenceQuestion } from "../src/roman-reference-assessment.js";
import {
  assessRomanReferenceEssay,
  privateEssayQuestionForRomanReference,
  ROMAN_REFERENCE_ESSAY_CONTENT,
  romanReferenceEssayFeedbackProse,
  romanReferenceTutorReplyWritesEssay,
} from "../src/roman-reference-essay.js";
import {
  lessonForRomanReferenceEssayTutor,
  resolveRomanReferenceTutorEssay,
  ROMAN_REFERENCE_JOURNEY_ID,
  ROMAN_REFERENCE_STATE_STAGE_ID,
} from "../src/roman-reference-routes.js";

const PATH = "/api/courses/roman-empire/lessons/rise-of-the-roman-empire/reference/progress";
const CORRECT_Q1 = ["augustus", "extent", "division", "deposition"] as const;
const WRONG_Q1 = ["deposition", "division", "extent", "augustus"] as const;
const Q4_MODEL =
  "Roman territory expanded substantially after 27 BCE and reached its greatest extent under Trajan in 117 CE. Augustus kept republican offices in place, but he held the powers that made him the dominant ruler.";

/**
 * A draft that satisfies all five rubric dimensions, so a test asserting a failure is failing for
 * the reason it names rather than because the writing happened to be thin.
 */
const STRONG_ESSAY = [
  "Political conflict mattered more than size to Rome's transformation, because the state kept",
  "governing a large territory long after its politics stopped working.",
  "Augustus settled the succession problem in 27 BCE by keeping republican offices while holding",
  "the powers that decided things, which meant the constitution said one thing and practice",
  "another.",
  "Territory reached its greatest extent under Trajan in 117 CE, and the empire governed it for",
  "another century without breaking.",
  "The third-century crisis from 235 CE produced repeated claimants and civil wars, and that",
  "instability, not the size of the frontier, is what emptied the treasury.",
  "Diocletian answered it in 284 CE by dividing rule between four emperors, which shows the",
  "problem was understood as political rather than territorial.",
  "Although size made the succession problem harder to contain, because a distant army could",
  "raise its own emperor, the tetrarchy shows Rome could hold the territory once the political",
  "question was addressed.",
].join(" ");

const SHORT_ESSAY = "Size mattered more than political conflict because Rome was large.";

let app: FastifyInstance;
let store: DiscereStore;
let content: Awaited<ReturnType<typeof createApp>>["content"];

beforeEach(async () => {
  ({ app, store, content } = await createApp({
    dbPath: ":memory:",
    migrate: true,
    tutor: { providerId: "companion" },
  }));
});

afterEach(async () => {
  await app.close();
});

async function getProgress(): Promise<RomanReferenceProgress> {
  const response = await app.inject({ method: "GET", url: PATH });
  expect(response.statusCode).toBe(200);
  return response.json() as RomanReferenceProgress;
}

async function put(payload: Record<string, unknown>): Promise<RomanReferenceProgress> {
  const response = await app.inject({ method: "PUT", url: PATH, payload });
  expect(response.statusCode, response.body).toBe(200);
  return response.json() as RomanReferenceProgress;
}

async function reject(
  payload: Record<string, unknown>,
  status: number,
): Promise<{ code: string; message: string }> {
  const response = await app.inject({ method: "PUT", url: PATH, payload });
  expect(response.statusCode, response.body).toBe(status);
  return response.json() as { code: string; message: string };
}

/** Walks the lesson to the point where the essay opens: four questions submitted and finished. */
async function reachEssay(mode = "coach"): Promise<RomanReferenceProgress> {
  await put({ action: "skip_opening", order: WRONG_Q1 });
  await put({ action: "complete_augustus" });
  await put({ action: "save_expansion_response", answer: "Rome expanded across new territory." });
  await put({ action: "complete_expansion" });
  await put({
    action: "submit_question",
    questionId: "turning-points",
    response: { kind: "ordering", order: CORRECT_Q1 },
    mode,
  });
  await put({
    action: "submit_question",
    questionId: "476-continuity",
    response: { kind: "selection", choiceId: "western-change" },
    mode,
  });
  await put({
    action: "submit_question",
    questionId: "map-117",
    response: { kind: "multi_select", choiceIds: ["britain", "mesopotamia"] },
    mode,
  });
  await put({
    action: "submit_question",
    questionId: "two-sentence",
    response: { kind: "free_response", text: Q4_MODEL },
    mode,
  });
  const finished = await put({ action: "finish_assessment" });
  expect(finished.activeBeat).toBe("essay");
  return finished;
}

function writingGateRuns(): Array<{ context: string; passed: number; violations: number }> {
  return store.database
    .prepare(
      "SELECT context, passed, violation_count AS violations FROM writing_gate_runs ORDER BY rowid",
    )
    .all() as Array<{ context: string; passed: number; violations: number }>;
}

describe("Gate 4 essay state, authority, and boundaries", () => {
  it("opens only after the assessment is finished, and refuses a submission before then", async () => {
    await put({ action: "skip_opening", order: WRONG_Q1 });
    await put({ action: "complete_augustus" });
    await put({ action: "save_expansion_response", answer: "Rome expanded." });
    const atQuestions = await put({ action: "complete_expansion" });
    expect(atQuestions.activeBeat).toBe("questions");
    expect(atQuestions.essay.progress).toMatchObject({ status: "editing", submissions: [] });

    const refusal = await reject(
      { action: "submit_essay_revision", content: STRONG_ESSAY, mode: "coach" },
      409,
    );
    expect(refusal.code).toBe("ASSESSMENT_INCOMPLETE");
    expect((await getProgress()).essay.progress.submissions).toHaveLength(0);
  });

  it("carries a draft, a plan, and evidence selections across the submit and revise transitions", async () => {
    await reachEssay();
    const drafted = await put({
      action: "update_essay_draft",
      draft: STRONG_ESSAY,
      claimPlan: "Political conflict outweighed size.",
      evidencePlan: ["third-century-crisis", "tetrarchy-284-ce"],
      complicationPlan: "Size made the succession problem harder to contain.",
    });
    expect(drafted.essay.progress).toMatchObject({
      draft: STRONG_ESSAY,
      claimPlan: "Political conflict outweighed size.",
      evidencePlan: ["third-century-crisis", "tetrarchy-284-ce"],
      status: "editing",
    });

    const submitted = await put({
      action: "submit_essay_revision",
      content: STRONG_ESSAY,
      mode: "coach",
    });
    expect(submitted.essay.progress.status).toBe("submitted");
    expect(submitted.essay.progress.submissions).toHaveLength(1);
    expect(submitted.essay.progress.submissions[0]?.revision).toBe(1);
    // The plan is the learner's working, so submitting must not clear it.
    expect(submitted.essay.progress.claimPlan).toBe("Political conflict outweighed size.");

    const editingAgain = await put({ action: "start_essay_revision" });
    expect(editingAgain.essay.progress.status).toBe("editing");
    expect(editingAgain.essay.progress.submissions).toHaveLength(1);

    const revised = await put({
      action: "submit_essay_revision",
      content: `${STRONG_ESSAY} The eastern half continued governing from Constantinople after 330 CE.`,
      mode: "coach",
    });
    expect(revised.essay.progress.submissions.map((item) => item.revision)).toEqual([1, 2]);

    const finished = await put({ action: "finish_essay" });
    expect(finished.essay.progress.finished).toBe(true);
  });

  it("refuses a resubmission without a revision, and locks the essay once it is finished", async () => {
    await reachEssay();
    await put({ action: "submit_essay_revision", content: STRONG_ESSAY, mode: "coach" });

    // The same content is an idempotent retry of a submission that already landed.
    const retry = await put({
      action: "submit_essay_revision",
      content: STRONG_ESSAY,
      mode: "coach",
    });
    expect(retry.essay.progress.submissions).toHaveLength(1);

    const withoutRevision = await reject(
      {
        action: "submit_essay_revision",
        content: `${STRONG_ESSAY} A new sentence.`,
        mode: "coach",
      },
      409,
    );
    expect(withoutRevision.code).toBe("ESSAY_REVISION_REQUIRED");

    await put({ action: "finish_essay" });
    const afterFinish = await reject(
      {
        action: "update_essay_draft",
        draft: "Rewriting after finishing.",
        claimPlan: "",
        evidencePlan: [],
        complicationPlan: "",
      },
      409,
    );
    expect(afterFinish.code).toBe("ESSAY_FINISHED");
  });

  it("enforces the word bounds the content declares", async () => {
    await reachEssay();
    const tooShort = await reject(
      { action: "submit_essay_revision", content: SHORT_ESSAY, mode: "coach" },
      400,
    );
    expect(tooShort.code).toBe("ESSAY_TOO_SHORT");
    expect(tooShort.message).toContain(String(ROMAN_REFERENCE_ESSAY_CONTENT.minWords));

    const tooLong = await reject(
      {
        action: "submit_essay_revision",
        content: `word `.repeat(ROMAN_REFERENCE_ESSAY_CONTENT.maxWords + 1),
        mode: "coach",
      },
      400,
    );
    expect(tooLong.code).toBe("ESSAY_TOO_LONG");
    expect((await getProgress()).essay.progress.submissions).toHaveLength(0);
  });

  it("locks the essay to its first mode and suppresses assistance in Exam", async () => {
    await reachEssay();
    const locked = await put({ action: "access_essay_tutor", mode: "coach" });
    expect(locked.essay.progress.mode).toBe("coach");

    const mismatched = await reject(
      { action: "submit_essay_revision", content: STRONG_ESSAY, mode: "assisted" },
      409,
    );
    expect(mismatched.code).toBe("ESSAY_MODE_LOCKED");
  });

  it("refuses Exam assistance and never records source access for it", async () => {
    await reachEssay("exam");
    const tutorRefusal = await reject({ action: "access_essay_tutor", mode: "exam" }, 403);
    expect(tutorRefusal.code).toBe("EXAM_GUARDRAIL");
    const sourcesRefusal = await reject({ action: "access_essay_sources", mode: "exam" }, 403);
    expect(sourcesRefusal.code).toBe("EXAM_GUARDRAIL");
    expect((await getProgress()).essay.progress.sourcesOpened).toBe(false);
  });

  it("withholds the evidence pack until the learner opens it", async () => {
    await reachEssay();
    expect((await getProgress()).essay.content.evidence).toEqual([]);
    const opened = await put({ action: "access_essay_sources", mode: "coach" });
    expect(opened.essay.content.evidence.length).toBeGreaterThan(0);
    expect(opened.essay.progress.sourcesOpened).toBe(true);
    expect(opened.essay.progress.mode).toBe("coach");
  });
});

describe("Gate 4 progress migration", () => {
  it("migrates a v2 row in memory, preserves Gates 2 and 3, and adds a blank essay", async () => {
    const timestamp = "2026-08-22T04:05:06.000Z";
    const v2 = {
      version: 2,
      opening: {
        order: [...CORRECT_Q1],
        submittedOrder: [...CORRECT_Q1],
        status: "checked",
        wasCorrect: true,
      },
      augustus: { completed: true },
      expansion: {
        milestoneId: "117-ce",
        answerOpen: true,
        answer: "Rome reached its greatest extent.",
        saved: true,
        completed: true,
      },
      assessmentFinished: false,
      questions: [
        {
          id: "turning-points",
          draft: { kind: "ordering", order: [...CORRECT_Q1] },
          submittedResponse: { kind: "ordering", order: [...CORRECT_Q1] },
          status: "submitted",
          // A stored row is only migrated when its result and feedback are the ones this server
          // would have produced, so the fixture asks the assessor rather than inventing them.
          ...assessRomanReferenceQuestion("turning-points", {
            kind: "ordering",
            order: [...CORRECT_Q1],
          }),
          mode: "coach",
          hints: [],
          revealedAnswer: null,
        },
        {
          id: "476-continuity",
          draft: null,
          submittedResponse: null,
          status: "editing",
          result: null,
          feedback: null,
          mode: null,
          hints: [],
          revealedAnswer: null,
        },
        {
          id: "map-117",
          draft: null,
          submittedResponse: null,
          status: "editing",
          result: null,
          feedback: null,
          mode: null,
          hints: [],
          revealedAnswer: null,
        },
        {
          id: "two-sentence",
          draft: null,
          submittedResponse: null,
          status: "editing",
          result: null,
          feedback: null,
          mode: null,
          hints: [],
          revealedAnswer: null,
        },
      ],
    };
    store.database
      .prepare(
        "INSERT INTO journey_progress (user_id, journey_id, stage_id, state, interaction_state, updated_at) VALUES ('local-user', ?, ?, 'active', ?, ?)",
      )
      .run(
        ROMAN_REFERENCE_JOURNEY_ID,
        ROMAN_REFERENCE_STATE_STAGE_ID,
        JSON.stringify(v2),
        timestamp,
      );

    const migrated = await getProgress();
    expect(migrated).toMatchObject({
      version: 3,
      opening: v2.opening,
      expansion: v2.expansion,
      updatedAt: timestamp,
      activeBeat: "questions",
      activeQuestionId: "476-continuity",
    });
    expect(migrated.essay.progress).toMatchObject({
      draft: "",
      status: "editing",
      mode: null,
      sourcesOpened: false,
      submissions: [],
      finished: false,
    });
    // Q1's earned result survives the upgrade rather than being reset with the schema.
    const q1 = migrated.questions.find((item) => item.progress.id === "turning-points");
    expect(q1?.progress.result).toBe("correct");

    // Reading does not rewrite the row; the next action does.
    const beforeAction = store.database
      .prepare("SELECT interaction_state AS state FROM journey_progress WHERE journey_id = ?")
      .get(ROMAN_REFERENCE_JOURNEY_ID) as { state: string };
    expect(JSON.parse(beforeAction.state).version).toBe(2);
    await put({
      action: "submit_question",
      questionId: "476-continuity",
      response: { kind: "selection", choiceId: "western-change" },
      mode: "coach",
    });
    const afterAction = store.database
      .prepare("SELECT interaction_state AS state FROM journey_progress WHERE journey_id = ?")
      .get(ROMAN_REFERENCE_JOURNEY_ID) as { state: string };
    expect(JSON.parse(afterAction.state).version).toBe(3);
  });

  it("falls back to a clean default when a stored essay contradicts its own history", async () => {
    const impossible = {
      version: 3,
      opening: {
        order: [...CORRECT_Q1],
        submittedOrder: [...CORRECT_Q1],
        status: "checked",
        wasCorrect: true,
      },
      augustus: { completed: true },
      expansion: {
        milestoneId: "117-ce",
        answerOpen: true,
        answer: "Rome reached its greatest extent.",
        saved: true,
        completed: true,
      },
      assessmentFinished: true,
      questions: ["turning-points", "476-continuity", "map-117", "two-sentence"].map((id) => ({
        id,
        draft: null,
        submittedResponse: null,
        status: "editing",
        result: null,
        feedback: null,
        mode: null,
        hints: [],
        revealedAnswer: null,
      })),
      essay: {
        draft: STRONG_ESSAY,
        claimPlan: "",
        evidencePlan: [],
        complicationPlan: "",
        status: "submitted",
        mode: "coach",
        sourcesOpened: false,
        // Feedback that was never produced by this server's assessor.
        submissions: [
          {
            revision: 1,
            submittedAt: "2026-08-22T00:00:00.000Z",
            wordCount: 9,
            content: STRONG_ESSAY,
            summary: "Fabricated summary.",
            nextStep: "Fabricated next step.",
            dimensions: ROMAN_REFERENCE_ESSAY_CONTENT.rubric.map((item) => ({
              id: item.id,
              label: item.label,
              status: "met",
              comment: "Fabricated comment.",
              excerpt: null,
            })),
            usedEvidenceIds: [],
          },
        ],
        finished: false,
      },
    };
    store.database
      .prepare(
        "INSERT INTO journey_progress (user_id, journey_id, stage_id, state, interaction_state, updated_at) VALUES ('local-user', ?, ?, 'active', ?, '2026-08-22T00:00:00.000Z')",
      )
      .run(ROMAN_REFERENCE_JOURNEY_ID, ROMAN_REFERENCE_STATE_STAGE_ID, JSON.stringify(impossible));

    const recovered = await getProgress();
    expect(recovered.activeBeat).toBe("opening");
    expect(recovered.essay.progress.submissions).toEqual([]);
    expect(recovered.updatedAt).toBeNull();
  });
});

describe("Gate 4 isolation from learning evidence", () => {
  it("awards no XP, records no attempt, and creates no catalogue completion", async () => {
    const xpBefore = store.getProfile().xp;
    await reachEssay();
    await put({ action: "submit_essay_revision", content: STRONG_ESSAY, mode: "coach" });
    await put({ action: "finish_essay" });

    expect(store.getProfile().xp).toBe(xpBefore);
    expect(store.database.prepare("SELECT COUNT(*) AS count FROM attempts").get()).toEqual({
      count: 0,
    });
    const rows = store.database
      .prepare("SELECT journey_id AS journeyId FROM journey_progress")
      .all() as Array<{ journeyId: string }>;
    expect(rows).toEqual([{ journeyId: ROMAN_REFERENCE_JOURNEY_ID }]);
    // The catalogue keys course completion on `courseId:lessonId`; the reference row must not.
    expect(rows.every((row) => !row.journeyId.includes(":"))).toBe(true);
  });
});

describe("Gate 4 feedback and the writing gate", () => {
  it("produces rubric feedback tied to the learner's own sentences", () => {
    const feedback = assessRomanReferenceEssay({
      content: STRONG_ESSAY,
      revision: 1,
      submittedAt: "2026-08-22T00:00:00.000Z",
    });
    expect(feedback.dimensions.map((item) => item.id)).toEqual([
      "claim",
      "evidence",
      "reasoning",
      "complication",
      "accuracy",
    ]);
    expect(feedback.dimensions.every((item) => item.status === "met")).toBe(true);
    expect(feedback.usedEvidenceIds.length).toBeGreaterThanOrEqual(3);
    for (const excerpt of feedback.dimensions.map((item) => item.excerpt)) {
      if (excerpt === null) continue;
      // Every quoted excerpt must be the learner's text, not the assessor's invention.
      expect(STRONG_ESSAY).toContain(excerpt.replace(/\.\.\.$/, ""));
    }
  });

  it("quotes a different sentence for each rubric row it can", () => {
    const feedback = assessRomanReferenceEssay({
      content: STRONG_ESSAY,
      revision: 1,
      submittedAt: "2026-08-22T00:00:00.000Z",
    });
    const excerpts = feedback.dimensions
      .map((item) => item.excerpt)
      .filter((excerpt): excerpt is string => excerpt !== null);
    expect(new Set(excerpts).size).toBe(excerpts.length);

    // The complication row must quote the concession, not a sentence that merely contains "while".
    const complication = feedback.dimensions.find((item) => item.id === "complication");
    expect(complication?.status).toBe("met");
    expect(complication?.excerpt ?? "").toMatch(/^Although size made the succession problem/);

    // A row is met because the essay does the thing, not because a quote was still available.
    const reasoning = feedback.dimensions.find((item) => item.id === "reasoning");
    expect(reasoning?.status).toBe("met");
  });

  it("names the missing dimension rather than praising what is there", () => {
    const feedback = assessRomanReferenceEssay({
      content: [
        "Augustus took power in 27 BCE.",
        "Trajan reached the greatest extent in 117 CE.",
        "Diocletian created the tetrarchy in 284 CE.",
      ].join(" "),
      revision: 1,
      submittedAt: "2026-08-22T00:00:00.000Z",
    });
    const byId = new Map(feedback.dimensions.map((item) => [item.id, item]));
    expect(byId.get("evidence")?.status).toBe("met");
    expect(byId.get("claim")?.status).toBe("missing");
    expect(byId.get("complication")?.status).toBe("missing");
    expect(feedback.nextStep).toBe(byId.get("claim")?.comment);
  });

  it("passes generated feedback through the writing gate across every rubric outcome", () => {
    const drafts = [STRONG_ESSAY, SHORT_ESSAY, "All of Rome fell in 476 CE and nothing continued."];
    for (const draft of drafts) {
      const prose = romanReferenceEssayFeedbackProse(
        assessRomanReferenceEssay({
          content: draft,
          revision: 1,
          submittedAt: "2026-08-22T00:00:00.000Z",
        }),
      );
      const result = lintText(prose, { context: "feedback" });
      const hard = result.violations.filter((violation) => violation.severity === "hard");
      expect(hard, `${draft.slice(0, 40)}: ${JSON.stringify(hard)}`).toEqual([]);
      // The excerpts are the learner's words, so the linted prose is ours alone.
      expect(prose).not.toContain(draft);
    }
  });

  it("retains a writing gate record for each submission and none for other actions", async () => {
    await reachEssay();
    expect(writingGateRuns()).toEqual([]);
    await put({
      action: "update_essay_draft",
      draft: STRONG_ESSAY,
      claimPlan: "",
      evidencePlan: [],
      complicationPlan: "",
    });
    expect(writingGateRuns()).toEqual([]);

    await put({ action: "submit_essay_revision", content: STRONG_ESSAY, mode: "coach" });
    const first = writingGateRuns();
    expect(first).toHaveLength(1);
    expect(first[0]?.context).toBe("recovery-v2:roman-reference-essay-feedback");
    expect(first[0]?.passed).toBe(1);

    // An idempotent retry produces no new feedback, so it produces no new record.
    await put({ action: "submit_essay_revision", content: STRONG_ESSAY, mode: "coach" });
    expect(writingGateRuns()).toHaveLength(1);

    await put({ action: "start_essay_revision" });
    await put({
      action: "submit_essay_revision",
      content: `${STRONG_ESSAY} Constantinople was dedicated in 330 CE.`,
      mode: "coach",
    });
    expect(writingGateRuns()).toHaveLength(2);
  });
});

describe("Gate 4 tutor binding", () => {
  it("refuses to resolve before the assessment is finished", async () => {
    await put({ action: "skip_opening", order: WRONG_Q1 });
    expect(() => resolveRomanReferenceTutorEssay(store, { mode: "coach" })).toThrowError(
      /Finish the four questions/,
    );
  });

  it("refuses to resolve before the essay has locked a mode", async () => {
    await reachEssay();
    expect(() => resolveRomanReferenceTutorEssay(store, { mode: "coach" })).toThrowError(
      /Open tutor help from the essay/,
    );
  });

  it("hands the tutor the learner's draft, plan, and latest rubric result", async () => {
    await reachEssay();
    await put({ action: "access_essay_tutor", mode: "coach" });
    await put({
      action: "update_essay_draft",
      draft: STRONG_ESSAY,
      claimPlan: "Political conflict outweighed size.",
      evidencePlan: ["third-century-crisis"],
      complicationPlan: "Size made succession harder to contain.",
    });
    await put({ action: "submit_essay_revision", content: STRONG_ESSAY, mode: "coach" });

    const resolved = resolveRomanReferenceTutorEssay(store, { mode: "coach" });
    expect(resolved.mode).toBe("coach");
    expect(resolved.essayContext.draft).toBe(STRONG_ESSAY);
    expect(resolved.essayContext.claimPlan).toBe("Political conflict outweighed size.");
    expect(resolved.essayContext.evidencePlan).toEqual(["third-century-crisis"]);
    expect(resolved.essayContext.status).toBe("submitted");
    expect(resolved.essayContext.revisions).toBe(1);
    expect(resolved.essayContext.latestFeedback?.revision).toBe(1);
    // The tutor sees only the essay's own sources.
    const lesson = lessonForRomanReferenceEssayTutor(content);
    expect(lesson.sources.map((source) => source.id).sort()).toEqual(
      [...resolved.sourceIds].sort(),
    );
  });

  it("rejects a mode the browser asks for that the essay is not locked to", async () => {
    await reachEssay();
    await put({ action: "access_essay_tutor", mode: "coach" });
    expect(() => resolveRomanReferenceTutorEssay(store, { mode: "assisted" })).toThrowError(
      /locked to coach mode/,
    );
  });

  it("refuses Exam tutoring even when the client asks with a permitted mode", async () => {
    await reachEssay("exam");
    await put({ action: "submit_essay_revision", content: STRONG_ESSAY, mode: "exam" });
    expect(() => resolveRomanReferenceTutorEssay(store, { mode: "coach" })).toThrowError(
      /locked to exam mode/,
    );
    expect(() => resolveRomanReferenceTutorEssay(store, { mode: "exam" })).toThrowError(
      /unavailable in Exam mode/,
    );
  });

  it("refuses a tutor request naming both the reference question and the essay", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/tutor/ask",
      payload: {
        lessonId: "rise-of-the-roman-empire",
        mode: "coach",
        question: "What should I argue?",
        referenceQuestionId: "map-117",
        referenceEssayId: "transformation",
      },
    });
    expect(response.statusCode).toBe(400);
  });

  it("refuses to link essay tutoring to a generic attempt", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/tutor/ask",
      payload: {
        lessonId: "rise-of-the-roman-empire",
        mode: "coach",
        question: "What should I argue?",
        referenceEssayId: "transformation",
        attemptId: "6f1f6a3c-4f27-4b0a-9c0e-0d1f2a3b4c5d",
      },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("REFERENCE_ATTEMPT_UNSUPPORTED");
  });

  it("refuses essay tutoring bound to a different lesson", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/tutor/ask",
      payload: {
        lessonId: "some-other-lesson",
        mode: "coach",
        question: "What should I argue?",
        referenceEssayId: "transformation",
      },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("REFERENCE_LESSON_MISMATCH");
  });
});

describe("Gate 4 tutor reply boundary", () => {
  const teaching = [
    "The third-century crisis ran from 235 to 284 CE. Rival claimants were proclaimed by their own",
    "armies, which meant the empire fought itself while its frontiers were under pressure. That is",
    "the mechanism to look at: an army that can make an emperor has a reason to.",
  ].join(" ");

  const drafted = [
    "Here is a draft opening you could use.",
    "Political conflict mattered more than size to Rome's transformation. Augustus settled the",
    "succession in 27 BCE by keeping republican offices while holding real power, and the",
    "third-century crisis from 235 CE showed what happened when that settlement failed. Diocletian's",
    "tetrarchy in 284 CE answered a political problem, not a territorial one.",
  ].join(" ");

  it("allows explanation and refuses supplied wording", () => {
    expect(romanReferenceTutorReplyWritesEssay(teaching)).toBe(false);
    expect(romanReferenceTutorReplyWritesEssay(drafted)).toBe(true);
  });

  it("allows a suggestion that names a topic without writing it", () => {
    expect(
      romanReferenceTutorReplyWritesEssay(
        "You could write about the tetrarchy here, then connect it back to your claim.",
      ),
    ).toBe(false);
  });

  it("refuses a long quoted passage even without an offer", () => {
    const quoted = `"${STRONG_ESSAY}"`;
    expect(romanReferenceTutorReplyWritesEssay(quoted)).toBe(true);
  });

  it("raises a hard issue only when the reply is bound to the essay", () => {
    const lesson = lessonForRomanReferenceEssayTutor(content);
    const question = privateEssayQuestionForRomanReference();
    const reply = {
      answer: drafted,
      followUpQuestion: "Which part would you change?",
      sourceIds: [],
      uncertainty: [],
    };

    const bound = validateTutorReply({
      reply,
      mode: "coach",
      lesson,
      question,
      referenceEssayId: "transformation",
    });
    expect(bound.some((issue) => issue.code === "ANS007_REFERENCE_ESSAY_WRITTEN")).toBe(true);
    expect(bound.some((issue) => issue.severity === "hard")).toBe(true);

    const unbound = validateTutorReply({ reply, mode: "coach", lesson, question });
    expect(unbound.some((issue) => issue.code === "ANS007_REFERENCE_ESSAY_WRITTEN")).toBe(false);
  });

  it("accepts a teaching reply bound to the essay", () => {
    const issues = validateTutorReply({
      reply: {
        answer: teaching,
        followUpQuestion: "Which of those two pressures does your claim rest on?",
        sourceIds: ["openstax-world-history-eastward-shift"],
        uncertainty: [],
      },
      mode: "coach",
      lesson: lessonForRomanReferenceEssayTutor(content),
      question: privateEssayQuestionForRomanReference(),
      referenceEssayId: "transformation",
    });
    expect(issues.filter((issue) => issue.severity === "hard")).toEqual([]);
  });
});
