import type { RomanReferenceProgress } from "@discere/contracts";
import { lintText } from "@discere/writing-engine";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import {
  assessRomanReferenceRecall,
  REFERENCE_RECALL_BACK,
} from "../src/roman-reference-review.js";
import { ROMAN_REFERENCE_JOURNEY_ID } from "../src/roman-reference-routes.js";

const PATH = "/api/courses/roman-empire/lessons/rise-of-the-roman-empire/reference/progress";
const RESPONSE =
  "The western emperor was removed in 476 CE. Roman government continued in the east from Constantinople.";
const ESSAY =
  "Political conflicts mattered more because they changed who exercised power. Augustus kept republican offices in 27 BCE while controlling the army and provinces. This concentrated power in one ruler. Under Trajan in 117 CE the empire reached its greatest extent, which made administration harder. The third-century crisis brought civil wars and repeated claimants, because commanders could compete for power. Although size increased pressure on government, political instability affected how that territory was governed. The eastern empire continued after the western emperor was removed in 476 CE.";
let runtime: Awaited<ReturnType<typeof createApp>>;

beforeEach(async () => {
  runtime = await createApp({ dbPath: ":memory:", migrate: true, tutor: { providerId: "mock" } });
});
afterEach(async () => {
  vi.restoreAllMocks();
  await runtime.app.close();
});

async function put(
  payload: Record<string, unknown>,
  status = 200,
): Promise<RomanReferenceProgress> {
  const response = await runtime.app.inject({ method: "PUT", url: PATH, payload });
  expect(response.statusCode, response.body).toBe(status);
  return response.json();
}
async function get(): Promise<RomanReferenceProgress> {
  return (await runtime.app.inject({ method: "GET", url: PATH })).json();
}
async function reachRecall() {
  await put({ action: "skip_opening", order: ["extent", "deposition", "augustus", "division"] });
  await put({ action: "complete_augustus" });
  await put({ action: "save_expansion_response", answer: "Rome expanded." });
  await put({ action: "complete_expansion" });
  for (const [questionId, response] of [
    [
      "turning-points",
      { kind: "ordering", order: ["augustus", "extent", "division", "deposition"] },
    ],
    ["476-continuity", { kind: "selection", choiceId: "western-change" }],
    ["map-117", { kind: "multi_select", choiceIds: ["britain", "mesopotamia"] }],
    [
      "two-sentence",
      {
        kind: "free_response",
        text: "Roman territory expanded to its greatest extent under Trajan in 117 CE. Augustus kept republican offices but controlled the army and provinces.",
      },
    ],
  ])
    await put({ action: "submit_question", questionId, response, mode: "coach" });
  await put({ action: "finish_assessment" });
  await put({ action: "submit_essay_revision", content: ESSAY, mode: "coach" });
  return put({ action: "finish_essay" });
}

describe("reference recall authority", () => {
  it.each([
    [RESPONSE, "correct"],
    ["The Eastern Roman Empire survived.", "partly_correct"],
    ["The western emperor was deposed.", "partly_correct"],
    ["The entire Roman empire ended in 476 CE.", "incorrect"],
    ["The western emperor was removed but the east did not continue.", "incorrect"],
    ["I wrote a sentence.", "unassessed"],
  ])("assesses %s as %s", (text, result) => {
    const assessment = assessRomanReferenceRecall(text);
    expect(assessment.result).toBe(result);
    expect(lintText(assessment.feedback, { context: "feedback" }).passed).toBe(true);
  });

  it("withholds the back before reveal, even after a correct response", async () => {
    expect((await get()).review.back).toBeNull();
    await put({ action: "reveal_recall", mode: "coach" }, 409);
    expect((await reachRecall()).activeBeat).toBe("recall");
    await put({ action: "update_recall_draft", draft: RESPONSE });
    const checked = await put({ action: "submit_recall", response: RESPONSE, mode: "coach" });
    expect(checked.review.progress.result).toBe("correct");
    expect(checked.review.back).toBeNull();
    expect((await get()).review.progress.response).toBe(RESPONSE);
    const revealed = await put({ action: "reveal_recall", mode: "coach" });
    expect(revealed.review.back).toBe(REFERENCE_RECALL_BACK);
    const rated = await put({ action: "rate_recall", rating: "easy" });
    expect(rated.activeBeat).toBe("complete");
    expect(rated.review.progress.evidence).toBe("independent");
    expect(rated.review.progress.schedule?.independentReviews).toBe(1);
    expect((await put({ action: "rate_recall", rating: "easy" })).review).toEqual(rated.review);
    await put({ action: "rate_recall", rating: "hard" }, 409);
    expect(runtime.store.getProfile().xp).toBe(0);
  });

  it.each(["incorrect", "blank", "direct"])(
    "Easy never upgrades %s recall to independent evidence",
    async (kind) => {
      await reachRecall();
      const mode = kind === "direct" ? "direct" : "coach";
      if (kind !== "blank")
        await put({
          action: "submit_recall",
          response: kind === "incorrect" ? "The entire Roman empire ended in 476 CE." : RESPONSE,
          mode,
        });
      await put({ action: "reveal_recall", mode });
      const rated = await put({ action: "rate_recall", rating: "easy" });
      expect(rated.review.progress.evidence).toBe("assisted");
      expect(rated.review.progress.schedule?.independentReviews).toBe(0);
      expect(rated.review.progress.schedule?.assistedReviews).toBe(1);
      expect(rated.review.progress.schedule?.intervalDays).toBeLessThan(1);
      await put({ action: "submit_recall", response: RESPONSE, mode }, 409);
    },
  );

  it("locks mode, freezes the first response, and requires an Exam response before reveal", async () => {
    await reachRecall();
    await put({ action: "rate_recall", rating: "easy" }, 409);
    await put({ action: "reveal_recall", mode: "exam" }, 403);
    await put({ action: "submit_recall", response: RESPONSE, mode: "exam" });
    await put({ action: "reveal_recall", mode: "coach" }, 409);
    await put({ action: "update_recall_draft", draft: "different" }, 409);
    await put({ action: "submit_recall", response: "different", mode: "exam" }, 409);
    expect((await put({ action: "reveal_recall", mode: "exam" })).review.back).toBe(
      REFERENCE_RECALL_BACK,
    );
  });

  it("preserves completed v3 essays through the upgrade without rewriting on read", async () => {
    await reachRecall();
    const row = runtime.store.database
      .prepare("SELECT interaction_state AS state FROM journey_progress WHERE journey_id = ?")
      .get(ROMAN_REFERENCE_JOURNEY_ID) as { state: string };
    const legacy = JSON.parse(row.state);
    delete legacy.review;
    legacy.version = 3;
    runtime.store.database
      .prepare("UPDATE journey_progress SET interaction_state = ? WHERE journey_id = ?")
      .run(JSON.stringify(legacy), ROMAN_REFERENCE_JOURNEY_ID);
    const upgraded = await get();
    expect(upgraded.version).toBe(4);
    expect(upgraded.essay.progress.finished).toBe(true);
    expect(upgraded.activeBeat).toBe("recall");
    expect(upgraded.review.back).toBeNull();
    const stored = runtime.store.database
      .prepare("SELECT interaction_state AS state FROM journey_progress WHERE journey_id = ?")
      .get(ROMAN_REFERENCE_JOURNEY_ID) as { state: string };
    expect(JSON.parse(stored.state).version).toBe(3);
    await put({ action: "update_recall_draft", draft: "A draft." });
    expect((await get()).review.progress.draft).toBe("A draft.");
  });

  it("allows a new due recall while retaining its scheduler and evidence counts", async () => {
    await reachRecall();
    await put({ action: "reveal_recall", mode: "coach" });
    const first = await put({ action: "rate_recall", rating: "easy" });
    await put({ action: "restart_recall" }, 409);
    const due = first.review.progress.schedule?.dueAt;
    if (!due) throw new Error("Missing schedule");
    vi.spyOn(runtime.store, "now").mockReturnValue(due);
    const restarted = await put({ action: "restart_recall" });
    expect(restarted.review.back).toBeNull();
    expect(restarted.review.progress.response).toBeNull();
    await put({ action: "submit_recall", response: RESPONSE, mode: "coach" });
    await put({ action: "reveal_recall", mode: "coach" });
    const next = await put({ action: "rate_recall", rating: "good" });
    expect(next.review.progress.schedule).toMatchObject({
      independentReviews: 1,
      assistedReviews: 1,
      repetition: 2,
    });
  });
});
