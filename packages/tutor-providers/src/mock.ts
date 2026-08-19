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
