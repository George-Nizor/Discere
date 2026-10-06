import { randomUUID } from "node:crypto";
import type { RomanReferenceProgress } from "@discere/contracts";
import { lintText } from "@discere/writing-engine";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { validateTutorReply } from "../src/companion.js";
import type { DiscereStore } from "../src/db/store.js";
import {
  answerForRomanReferenceQuestion,
  assessRomanReferenceQuestion,
  privateQuestionForRomanReference,
  ROMAN_REFERENCE_AUTHORED_COPY,
} from "../src/roman-reference-assessment.js";
import {
  lessonForRomanReferenceTutor,
  ROMAN_REFERENCE_JOURNEY_ID,
  ROMAN_REFERENCE_STATE_STAGE_ID,
} from "../src/roman-reference-routes.js";

const PATH = "/api/courses/roman-empire/lessons/rise-of-the-roman-empire/reference/progress";
const CORRECT_Q1 = ["augustus", "extent", "division", "deposition"] as const;
const WRONG_Q1 = ["deposition", "division", "extent", "augustus"] as const;
const SCRAMBLED_Q1 = ["extent", "deposition", "augustus", "division"] as const;
const Q4_MODEL =
  "Roman territory expanded substantially after 27 BCE and reached its greatest extent under Trajan in 117 CE. Augustus kept republican offices in place, but he held the powers that made him the dominant ruler.";

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

async function advanceToQuestions(): Promise<void> {
  await put({ action: "skip_opening", order: WRONG_Q1 });
  await put({ action: "complete_augustus" });
  await put({ action: "save_expansion_response", answer: "Rome expanded across new territory." });
  const completed = await put({ action: "complete_expansion" });
  expect(completed.activeBeat).toBe("questions");
}

function progressQuestion(progress: RomanReferenceProgress, id: string) {
  const question = progress.questions.find((candidate) => candidate.progress.id === id);
  if (!question) throw new Error(`Missing question '${id}'.`);
  return question;
}

async function submitExamSet(): Promise<RomanReferenceProgress> {
  await put({
    action: "submit_question",
    questionId: "turning-points",
    response: { kind: "ordering", order: CORRECT_Q1 },
    mode: "exam",
  });
  await put({
    action: "submit_question",
    questionId: "476-continuity",
    response: { kind: "selection", choiceId: "western-change" },
    mode: "exam",
  });
  await put({
    action: "submit_question",
    questionId: "map-117",
    response: { kind: "multi_select", choiceIds: ["britain", "mesopotamia"] },
    mode: "exam",
  });
  return put({
    action: "submit_question",
    questionId: "two-sentence",
    response: { kind: "free_response", text: Q4_MODEL },
    mode: "exam",
  });
}

describe("Gate 3 Roman reference assessment authority", () => {
  it("returns scrambled learner content without answer mappings or private authority", async () => {
    const response = await app.inject({ method: "GET", url: PATH });
    expect(response.statusCode).toBe(200);
    const progress = response.json() as RomanReferenceProgress;
    const q1 = progressQuestion(progress, "turning-points");
    const q3 = progressQuestion(progress, "map-117");

    expect(q1.content.kind).toBe("ordering");
    if (q1.content.kind !== "ordering" || q3.content.kind !== "multi_select") return;
    expect(q1.content.options.map((option) => option.id)).toEqual(SCRAMBLED_Q1);
    expect(q1.content.options.map((option) => option.id)).not.toEqual(CORRECT_Q1);
    expect(q3.content.choices.map((choice) => choice.id)).toEqual([
      "scandinavia",
      "britain",
      "india",
      "mesopotamia",
    ]);
    expect(q3.content.mapDescription).toContain("crosses the Channel");
    expect(progress.questions.every((question) => question.progress.revealedAnswer === null)).toBe(
      true,
    );
    expect(response.body).not.toContain("answerAuthority");
    expect(response.body).not.toContain("correctOrder");
    expect(response.body).not.toContain(Q4_MODEL);
  });

  it("migrates a valid v1 row in memory, preserves Gate 2 data and timestamp, then saves v3", async () => {
    const timestamp = "2026-08-21T04:05:06.000Z";
    const v1 = {
      version: 1,
      opening: {
        order: WRONG_Q1,
        submittedOrder: null,
        status: "skipped",
        wasCorrect: null,
      },
      augustus: { completed: true },
      expansion: {
        milestoneId: "476-ce",
        answerOpen: true,
        answer: "The western court changed while the east continued.",
        saved: true,
      },
    };
    store.database
      .prepare(
        "INSERT INTO journey_progress (user_id, journey_id, stage_id, state, interaction_state, updated_at) VALUES ('local-user', ?, ?, 'active', ?, ?)",
      )
      .run(
        ROMAN_REFERENCE_JOURNEY_ID,
        ROMAN_REFERENCE_STATE_STAGE_ID,
        JSON.stringify(v1),
        timestamp,
      );

    const migrated = await getProgress();
    expect(migrated).toMatchObject({
      version: 4,
      opening: v1.opening,
      augustus: v1.augustus,
      expansion: { ...v1.expansion, completed: false },
      updatedAt: timestamp,
      activeBeat: "expansion",
    });
    const beforeAction = store.database
      .prepare("SELECT interaction_state AS state FROM journey_progress WHERE journey_id = ?")
      .get(ROMAN_REFERENCE_JOURNEY_ID) as { state: string };
    expect(JSON.parse(beforeAction.state).version).toBe(1);

    const persisted = await put({ action: "complete_expansion" });
    expect(persisted.version).toBe(4);
    expect(persisted.expansion.completed).toBe(true);
    const afterAction = store.database
      .prepare("SELECT interaction_state AS state FROM journey_progress WHERE journey_id = ?")
      .get(ROMAN_REFERENCE_JOURNEY_ID) as { state: string };
    expect(JSON.parse(afterAction.state).version).toBe(4);
  });

  it("falls back safely from an impossible shape-valid v1 expansion row", async () => {
    const impossibleV1 = {
      version: 1,
      opening: {
        order: SCRAMBLED_Q1,
        submittedOrder: null,
        status: "editing",
        wasCorrect: null,
      },
      augustus: { completed: false },
      expansion: {
        milestoneId: "117-ce",
        answerOpen: false,
        answer: "",
        saved: true,
      },
    };
    store.database
      .prepare(
        "INSERT INTO journey_progress (user_id, journey_id, stage_id, state, interaction_state, updated_at) VALUES ('local-user', ?, ?, 'active', ?, '2026-08-22T00:00:00.000Z')",
      )
      .run(
        ROMAN_REFERENCE_JOURNEY_ID,
        ROMAN_REFERENCE_STATE_STAGE_ID,
        JSON.stringify(impossibleV1),
      );

    const fallback = await getProgress();
    expect(fallback).toMatchObject({ version: 4, activeBeat: "opening", updatedAt: null });
    const repaired = await put({ action: "complete_augustus" });
    expect(repaired.augustus.completed).toBe(true);
    expect(repaired.updatedAt).not.toBeNull();
  });

  it("keeps direct-link later work but derives the earliest truthful frontier", async () => {
    const later = await put({
      action: "submit_question",
      questionId: "476-continuity",
      response: { kind: "selection", choiceId: "western-change" },
      mode: "coach",
    });
    expect(later.activeBeat).toBe("opening");
    expect(progressQuestion(later, "476-continuity").progress.result).toBe("correct");

    await advanceToQuestions();
    const restored = await getProgress();
    expect(restored.activeQuestionId).toBe("turning-points");
    expect(progressQuestion(restored, "476-continuity").progress.result).toBe("correct");
  });

  it("keeps formative misses revisable, locks the mode and rejects hints after correctness", async () => {
    await advanceToQuestions();
    const wrong = await put({
      action: "submit_question",
      questionId: "turning-points",
      response: { kind: "ordering", order: WRONG_Q1 },
      mode: "coach",
    });
    expect(progressQuestion(wrong, "turning-points").progress).toMatchObject({
      status: "submitted",
      result: "incorrect",
      mode: "coach",
    });
    expect(wrong.activeQuestionId).toBe("turning-points");

    const hinted = await put({
      action: "request_question_hint",
      questionId: "turning-points",
      mode: "coach",
    });
    expect(progressQuestion(hinted, "turning-points").progress.hints).toEqual([
      {
        level: 1,
        text: "Anchor the sequence with Augustus at the beginning and the western deposition at the end.",
      },
    ]);

    const drafted = await put({
      action: "update_question_draft",
      questionId: "turning-points",
      response: { kind: "ordering", order: CORRECT_Q1 },
    });
    expect(progressQuestion(drafted, "turning-points").progress).toMatchObject({
      result: "incorrect",
      draft: { kind: "ordering", order: CORRECT_Q1 },
      submittedResponse: { kind: "ordering", order: WRONG_Q1 },
    });

    const corrected = await put({
      action: "submit_question",
      questionId: "turning-points",
      response: { kind: "ordering", order: CORRECT_Q1 },
      mode: "coach",
    });
    expect(progressQuestion(corrected, "turning-points").progress.result).toBe("correct");
    expect(corrected.activeQuestionId).toBe("476-continuity");

    const hintAfterCorrect = await app.inject({
      method: "PUT",
      url: PATH,
      payload: {
        action: "request_question_hint",
        questionId: "turning-points",
        mode: "coach",
      },
    });
    expect(hintAfterCorrect.statusCode).toBe(409);
    expect(hintAfterCorrect.json().code).toBe("QUESTION_ALREADY_RESOLVED");

    await put({
      action: "access_question_sources",
      questionId: "476-continuity",
      mode: "assisted",
    });
    const mismatch = await app.inject({
      method: "PUT",
      url: PATH,
      payload: {
        action: "submit_question",
        questionId: "476-continuity",
        response: { kind: "selection", choiceId: "western-change" },
        mode: "coach",
      },
    });
    expect(mismatch.statusCode).toBe(409);
    expect(mismatch.json().code).toBe("QUESTION_MODE_LOCKED");
  });

  it("rejects an incomplete map submission and reveals only through Direct friction", async () => {
    await advanceToQuestions();
    const incomplete = await app.inject({
      method: "PUT",
      url: PATH,
      payload: {
        action: "submit_question",
        questionId: "map-117",
        response: { kind: "multi_select", choiceIds: ["britain"] },
        mode: "coach",
      },
    });
    expect(incomplete.statusCode).toBe(400);
    expect(incomplete.json().code).toBe("MAP_SELECTION_COUNT");

    const wrong = await put({
      action: "submit_question",
      questionId: "map-117",
      response: { kind: "multi_select", choiceIds: ["scandinavia", "india"] },
      mode: "direct",
    });
    expect(progressQuestion(wrong, "map-117").progress).toMatchObject({
      status: "submitted",
      result: "incorrect",
      revealedAnswer: null,
    });

    const revealed = await put({
      action: "reveal_question",
      questionId: "map-117",
      mode: "direct",
      reason: "I traced both edges and cannot resolve the eastern end.",
      confirmation: "show answer",
    });
    expect(progressQuestion(revealed, "map-117").progress).toMatchObject({
      status: "revealed",
      result: "incorrect",
      revealedAnswer: { kind: "multi_select", choiceIds: ["britain", "mesopotamia"] },
    });

    const directHint = await app.inject({
      method: "PUT",
      url: PATH,
      payload: { action: "request_question_hint", questionId: "map-117", mode: "direct" },
    });
    expect(directHint.statusCode).toBe(403);
  });

  it("defers all Exam grading, blocks assistance, and refuses an unsent revision at finish", async () => {
    await advanceToQuestions();
    const submitted = await submitExamSet();
    expect(submitted.activeQuestionId).toBeNull();
    expect(
      submitted.questions.every(
        (question) => question.progress.result === null && question.progress.feedback === null,
      ),
    ).toBe(true);

    for (const payload of [
      { action: "request_question_hint", questionId: "turning-points", mode: "exam" },
      { action: "access_question_sources", questionId: "turning-points", mode: "exam" },
      { action: "access_question_tutor", questionId: "turning-points", mode: "exam" },
      {
        action: "reveal_question",
        questionId: "turning-points",
        mode: "exam",
        reason: "I have completed the item and want to inspect the answer.",
        confirmation: "show answer",
      },
    ]) {
      const guarded = await app.inject({ method: "PUT", url: PATH, payload });
      expect(guarded.statusCode).toBe(403);
      expect(guarded.json().code).toBe("EXAM_GUARDRAIL");
    }

    const revised = await put({
      action: "update_question_draft",
      questionId: "two-sentence",
      response: {
        kind: "free_response",
        text: `${Q4_MODEL} This third sentence is not submitted yet.`,
      },
    });
    expect(revised.activeQuestionId).toBe("two-sentence");
    const staleFinish = await app.inject({
      method: "PUT",
      url: PATH,
      payload: { action: "finish_assessment" },
    });
    expect(staleFinish.statusCode).toBe(409);
    expect(staleFinish.json().code).toBe("UNSUBMITTED_QUESTION_DRAFT");

    await put({
      action: "submit_question",
      questionId: "two-sentence",
      response: { kind: "free_response", text: Q4_MODEL },
      mode: "exam",
    });
    const finished = await put({ action: "finish_assessment" });
    expect(finished.assessmentFinished).toBe(true);
    expect(finished.activeQuestionId).toBeNull();
    expect(finished.questions.every((question) => question.progress.feedback !== null)).toBe(true);
    expect(progressQuestion(finished, "two-sentence").progress.result).toBe("correct");
  });

  it("keeps the synthetic assessment isolated from XP, mastery, attempts and catalogue evidence", async () => {
    const profileBefore = store.getProfile();
    const conceptsBefore = store.getProgress();
    await advanceToQuestions();
    await submitExamSet();
    await put({ action: "finish_assessment" });

    expect(store.getProfile()).toEqual(profileBefore);
    expect(store.getProgress()).toEqual(conceptsBefore);
    expect(store.courseActivity()).toEqual(new Map());
    expect(store.completedLessonsByCourse()).toEqual(new Map());
    expect(store.completedJourneyIds()).toEqual(new Set());
    expect(store.database.prepare("SELECT COUNT(*) AS count FROM attempts").get()).toEqual({
      count: 0,
    });
  });
});

describe("Roman reference grading and authored copy", () => {
  it("grades the four private authorities with specific, concept-aware feedback", () => {
    expect(
      assessRomanReferenceQuestion("turning-points", {
        kind: "ordering",
        order: ["augustus", "extent", "deposition", "division"],
      }),
    ).toMatchObject({ result: "partly_correct", feedback: expect.stringContaining("395 CE") });
    expect(
      assessRomanReferenceQuestion("476-continuity", {
        kind: "selection",
        choiceId: "augustus-created",
      }),
    ).toEqual({
      result: "incorrect",
      feedback:
        "Augustus received his title in 27 BCE. In 476 CE, the last western emperor was removed while Roman government continued in the east.",
    });
    expect(
      assessRomanReferenceQuestion("map-117", {
        kind: "multi_select",
        choiceIds: ["britain", "india"],
      }),
    ).toMatchObject({ result: "partly_correct", feedback: expect.stringContaining("India") });

    const model = answerForRomanReferenceQuestion("two-sentence");
    expect(model).toEqual({ kind: "free_response", text: Q4_MODEL });
    expect(assessRomanReferenceQuestion("two-sentence", model)).toMatchObject({
      result: "correct",
    });
    expect(
      assessRomanReferenceQuestion("two-sentence", {
        kind: "free_response",
        text: "Rome was large. Augustus was emperor.",
      }).result,
    ).toBe("incorrect");
    expect(
      assessRomanReferenceQuestion("two-sentence", {
        kind: "free_response",
        text: "Roman territory contracted by 117 CE. Augustus kept republican offices but held real power.",
      }),
    ).toMatchObject({
      result: "incorrect",
      feedback: expect.stringContaining("not a contraction"),
    });
  });

  it("passes every authored learner-facing server string through the writing gate", () => {
    const findings = ROMAN_REFERENCE_AUTHORED_COPY.flatMap((copy) =>
      lintText(copy, { context: "lesson" }).violations.map((violation) => ({ copy, violation })),
    );
    expect(findings.filter(({ violation }) => violation.severity === "hard")).toEqual([]);
    // Triads are advisory, but this compact assessment copy has none that need an editorial waiver.
    expect(findings.filter(({ violation }) => violation.ruleId.startsWith("TRI"))).toEqual([]);
  });
});

describe("Roman reference tutor resolution", () => {
  it("builds a learner-safe, item-specific direct tutor packet from the stored mode lock", async () => {
    await put({ action: "access_question_tutor", questionId: "map-117", mode: "coach" });
    const response = await app.inject({
      method: "POST",
      url: "/api/tutor/ask",
      payload: {
        lessonId: "rise-of-the-roman-empire",
        referenceQuestionId: "map-117",
        mode: "coach",
        question: "How should I read the map boundary?",
      },
    });
    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().status).toBe("packet_required");
    const packet = response.json().packet.text as string;
    expect(packet).toContain("activeReferenceQuestion");
    expect(packet).toContain("Select the two regions");
    expect(packet).toContain("commons-roman-empire-extent-map");
    expect(packet).not.toContain("answerAuthority");
    expect(packet).not.toContain(Q4_MODEL);

    const wrongMode = await app.inject({
      method: "POST",
      url: "/api/tutor/ask",
      payload: {
        lessonId: "rise-of-the-roman-empire",
        referenceQuestionId: "map-117",
        mode: "assisted",
        question: "How should I read the map boundary?",
      },
    });
    expect(wrongMode.statusCode).toBe(409);
    expect(wrongMode.json().code).toBe("QUESTION_MODE_LOCKED");
  });

  it("rejects paraphrased answers in the shared in-process tutor acceptance gate", () => {
    const continuityIssues = validateTutorReply({
      reply: {
        answer:
          "The western court changed, while imperial government survived from Constantinople.",
        followUpQuestion: "Which option matches that distinction?",
        sourceIds: [],
        uncertainty: [],
      },
      mode: "coach",
      lesson: lessonForRomanReferenceTutor(content, "476-continuity"),
      question: privateQuestionForRomanReference("476-continuity"),
      referenceQuestionId: "476-continuity",
    });
    expect(continuityIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ANS006_REFERENCE_ANSWER_LEAK", severity: "hard" }),
      ]),
    );

    const coachMapIssues = validateTutorReply({
      reply: {
        answer: "Britain is the northwestern region to choose.",
        followUpQuestion: "Now trace the other end.",
        sourceIds: [],
        uncertainty: [],
      },
      mode: "coach",
      lesson: lessonForRomanReferenceTutor(content, "map-117"),
      question: privateQuestionForRomanReference("map-117"),
      referenceQuestionId: "map-117",
    });
    expect(coachMapIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ANS006_REFERENCE_ANSWER_LEAK", severity: "hard" }),
      ]),
    );

    const assistedMapIssues = validateTutorReply({
      reply: {
        answer: "Keep Britain, then use Mesopotamia for the eastern end.",
        followUpQuestion: "Can you select the pair now?",
        sourceIds: [],
        uncertainty: [],
      },
      mode: "assisted",
      lesson: lessonForRomanReferenceTutor(content, "map-117"),
      question: privateQuestionForRomanReference("map-117"),
      referenceQuestionId: "map-117",
    });
    expect(assistedMapIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ANS006_REFERENCE_ANSWER_LEAK", severity: "hard" }),
      ]),
    );

    expect(
      validateTutorReply({
        reply: {
          answer: "Britain and Mesopotamia are the two regions.",
          followUpQuestion: "Compare that answer with the shaded boundary.",
          sourceIds: [],
          uncertainty: [],
        },
        mode: "direct",
        lesson: lessonForRomanReferenceTutor(content, "map-117"),
        question: privateQuestionForRomanReference("map-117"),
        referenceQuestionId: "map-117",
      }).some((issue) => issue.code === "ANS006_REFERENCE_ANSWER_LEAK"),
    ).toBe(false);
  });

  it("rejects semantic answer leaks on companion import against the actual reference item", async () => {
    await put({ action: "access_question_tutor", questionId: "map-117", mode: "coach" });
    const requestId = randomUUID();
    const envelope = {
      protocolVersion: "0.2",
      operation: "tutor_reply",
      requestId,
      generatedAt: "2026-08-22T00:00:00.000Z",
      payload: {
        answer: "Britain and Mesopotamia are the two regions to select.",
        followUpQuestion: "Can you now select those two regions?",
        sourceIds: [],
        uncertainty: [],
      },
    };
    const response = await app.inject({
      method: "POST",
      url: "/api/tutor/companion/import",
      payload: {
        text: JSON.stringify(envelope),
        mode: "coach",
        expectedRequestId: requestId,
        referenceQuestionId: "map-117",
      },
    });
    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().accepted).toBe(false);
    expect(response.json().issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ANS006_REFERENCE_ANSWER_LEAK", severity: "hard" }),
      ]),
    );
  });

  it("uses the reference source allowlist and never records a generic attempt", async () => {
    await put({
      action: "access_question_tutor",
      questionId: "476-continuity",
      mode: "coach",
    });
    const requestId = randomUUID();
    const safeEnvelope = {
      protocolVersion: "0.2",
      operation: "tutor_reply",
      requestId,
      generatedAt: "2026-08-22T00:00:00.000Z",
      payload: {
        answer: "First decide whether the date describes one court or the whole Roman world.",
        followUpQuestion: "Which option limits its claim to the western court?",
        sourceIds: ["wikipedia-fall-western-empire"],
        uncertainty: [],
      },
    };
    const accepted = await app.inject({
      method: "POST",
      url: "/api/tutor/companion/import",
      payload: {
        text: JSON.stringify(safeEnvelope),
        mode: "coach",
        expectedRequestId: requestId,
        referenceQuestionId: "476-continuity",
      },
    });
    expect(accepted.statusCode, accepted.body).toBe(200);
    expect(accepted.json().accepted).toBe(true);
    expect(store.database.prepare("SELECT COUNT(*) AS count FROM attempts").get()).toEqual({
      count: 0,
    });

    const mixedBinding = await app.inject({
      method: "POST",
      url: "/api/tutor/companion/import",
      payload: {
        text: JSON.stringify(safeEnvelope),
        mode: "coach",
        expectedRequestId: requestId,
        referenceQuestionId: "476-continuity",
        attemptId: randomUUID(),
      },
    });
    expect(mixedBinding.statusCode).toBe(400);
    expect(mixedBinding.json().code).toBe("REFERENCE_ATTEMPT_UNSUPPORTED");
  });
});
