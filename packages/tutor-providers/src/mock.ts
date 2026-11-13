import type { TutorOperation } from "@discere/contracts";
import type { TutorGenerateOptions, TutorProvider, TutorRequest, TutorResponse } from "./types.js";

/**
 * Fixed replies for offline development and tests. They are written to pass the writing engine
 * so a client can exercise the accountability path without spending a subscription.
 */
const FIXTURES: Partial<Record<TutorOperation, unknown>> = {
  tutor_reply: {
    answer:
      "Use I = V / R. Put the supplied voltage above the resistance and carry the current unit through the calculation.",
    followUpQuestion: "Which two supplied values belong in the division?",
    sourceIds: [],
    uncertainty: [],
  },
  assess_response: {
    assessment: "partly_correct",
    summary:
      "Your explanation names the relationship between voltage and current, and it stops before showing how resistance limits the flow.",
    firstMeaningfulError:
      "The teach-back treats resistance as a source of current rather than a limit on it.",
    nextStep: "Add one sentence describing what happens to current when the resistance doubles.",
    sourceIds: [],
    uncertainty: [],
  },
};

/**
 * The offline workings review. `imageReviewed` follows whether an image was actually attached,
 * so the accountability gate that rejects a review of nothing is exercised rather than bypassed.
 */
function workingsReviewFixture(imageAttached: boolean): unknown {
  if (!imageAttached) {
    return {
      imageReviewed: false,
      transcription: "",
      transcriptionConfidence: 0,
      assessment: "unclear",
      feedback: "No workings image reached this provider, so there is nothing to read.",
      firstMeaningfulError: null,
      nextStep: "Export the notebook page and send the review again.",
      sourceIds: [],
      uncertainty: ["No image was attached to the request."],
    };
  }
  return {
    imageReviewed: true,
    transcription: "I = V / R, then 5 / 100.",
    transcriptionConfidence: 0.8,
    assessment: "partly_correct",
    feedback:
      "The relationship at the top of the page is the right one, and the substitution below it stops before the division is carried out.",
    firstMeaningfulError: "The division is set up but never completed, so no current is stated.",
    nextStep: "Carry out the division and write the result with its unit.",
    sourceIds: [],
    uncertainty: [],
  };
}

/**
 * The offline assessment, with one result for each of the task's own criteria so the
 * per-criterion list can be exercised. The first is met, the second partly met and the rest are
 * not met, which matches the fixed "partly correct" verdict. A revision is acknowledged.
 */
function assessmentFixture(payload: unknown): unknown {
  const request = (payload ?? {}) as {
    successCriteria?: unknown;
    previousVersion?: unknown;
  };
  const list = Array.isArray(request.successCriteria)
    ? request.successCriteria.filter((item): item is string => typeof item === "string")
    : [];
  const results = ["met", "partly_met", "not_met"] as const;
  const evidence = [
    "“voltage divided by resistance” states it in the opening sentence.",
    "The writing starts on this and stops after one clause.",
    "Nothing in the writing addresses this yet.",
  ] as const;
  const base = FIXTURES.assess_response as Record<string, unknown>;
  return {
    ...base,
    ...(request.previousVersion === undefined
      ? {}
      : {
          summary:
            "This version still names the relationship between voltage and current. The problem named last time is still there: resistance is described as a source of current.",
        }),
    criteria: list.map((criterion, index) => ({
      criterion,
      result: results[Math.min(index, 2)],
      evidence: evidence[Math.min(index, 2)],
    })),
  };
}

/**
 * The offline reply. A "show me" request gets a short text walkthrough, so the stepped view can
 * be exercised without a model. It carries no figures: the mock cannot draw on a figure it has
 * not read.
 */
function tutorReplyFixture(payload: unknown): unknown {
  const base = FIXTURES.tutor_reply as Record<string, unknown>;
  const request = (payload ?? {}) as { task?: unknown };
  if (typeof request.task !== "string") return base;
  return {
    ...base,
    answer: "Here is the same relationship worked with different values.",
    followUpQuestion: "Which value in your problem plays the part of the 6 V?",
    walkthrough: [
      { text: "We write the relationship first: I = V / R." },
      { text: "We put the example's values in: 6 V across 200 Ω." },
      { text: "We divide and keep the unit: 6 / 200 = 0.03 A." },
    ],
  };
}

const DEFAULT_FIXTURE = {
  title: "Current in a simple circuit",
  orientation:
    "Look at the single loop. Every charge passing the resistor continues around the same path.",
  explanation:
    "Current measures the rate of charge flow. With 5 V across a 100 Ω resistor, Ohm's law gives 0.05 A. Increase resistance while voltage stays fixed and current falls.",
  responsePrompt: "The resistance changes from 100 Ω to 200 Ω. What happens to current?",
};

export class MockTutorProvider implements TutorProvider {
  readonly id = "mock";
  readonly label = "Offline mock tutor";
  readonly generatesInProcess = true;

  async generate<TRequest, TResponse>(
    request: TutorRequest<TRequest>,
    options: TutorGenerateOptions = {},
  ): Promise<TutorResponse<TResponse>> {
    const fixture =
      request.operation === "workings_review"
        ? workingsReviewFixture((options.images?.length ?? 0) > 0)
        : request.operation === "assess_response"
          ? assessmentFixture(request.payload)
          : request.operation === "tutor_reply"
            ? tutorReplyFixture(request.payload)
            : (FIXTURES[request.operation] ?? DEFAULT_FIXTURE);
    const payload = (options.parsePayload ? options.parsePayload(fixture) : fixture) as TResponse;
    return {
      protocolVersion: "0.2",
      operation: request.operation,
      requestId: request.requestId,
      generatedAt: new Date().toISOString(),
      payload,
      modelNotes: ["Static offline fixture"],
      ...(options.sessionId === undefined ? {} : { sessionId: options.sessionId }),
    };
  }
}
