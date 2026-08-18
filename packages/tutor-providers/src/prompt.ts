import type { TutorOperation } from "@discere/contracts";
import { loadPrompt, type PromptName } from "@discere/prompts";
import type { TutorRequest } from "./types.js";

/**
 * One prompt body serves every provider. The copy/paste companion and the spawned local model
 * receive the same instructions, the same payload contract, and the same prompt asset, so a
 * reply that satisfies one path satisfies the other.
 */
const PAYLOAD_CONTRACTS: Partial<Record<TutorOperation, string>> = {
  tutor_reply: `{
  "answer": "A direct, learner-facing response that follows the supplied tutoring mode.",
  "followUpQuestion": "One short question that checks or advances understanding.",
  "sourceIds": ["Only identifiers supplied in allowedSourceIds; use an empty array when none are needed."],
  "uncertainty": ["Any material uncertainty; otherwise return an empty array."]
}`,
  workings_review: `{
  "imageReviewed": true,
  "transcription": "A faithful reading of the learner's visible steps. Do not silently repair them.",
  "transcriptionConfidence": 0.0,
  "assessment": "correct | partly_correct | incorrect | unclear",
  "feedback": "A direct evaluation of the learner's approach under the supplied tutoring mode.",
  "firstMeaningfulError": "The earliest important error, or null when none is visible.",
  "nextStep": "The smallest useful action the learner should take next.",
  "sourceIds": ["Only identifiers supplied in allowedSourceIds; use an empty array when none are needed."],
  "uncertainty": ["Unreadable marks or material uncertainty; otherwise return an empty array."]
}`,
  assess_response: `{
  "assessment": "correct | partly_correct | incorrect | unclear",
  "summary": "A direct judgement anchored in the learner's own words.",
  "firstMeaningfulError": "The earliest important error or gap, or null when none is present.",
  "nextStep": "The smallest useful action the learner should take next.",
  "sourceIds": ["Only identifiers supplied in allowedSourceIds; use an empty array when none are needed."],
  "uncertainty": ["Any material uncertainty; otherwise return an empty array."]
}`,
  edit_style: `{
  "revisedText": "The repaired passage, with the smallest coherent edits applied.",
  "edits": ["One line per repaired violation, naming the rule and what changed."],
  "unrepaired": ["Any violation that could not be repaired safely; otherwise an empty array."],
  "protectedItemsChecked": ["Each preserved number, unit, equation, citation, or answer boundary."]
}`,
};

export interface TutorPromptOptions {
  systemPrompt?: PromptName;
  /**
   * Asks the model to reproduce the protocol envelope around its payload. The copy/paste
   * companion needs it to correlate a pasted reply; a spawned provider correlates by process
   * and asks for the payload alone, which keeps schema-constrained output simpler.
   */
  envelope?: boolean;
  extraInstructions?: readonly string[];
  generatedAt?: string;
}

export function buildTutorPrompt<T>(
  request: TutorRequest<T>,
  options: TutorPromptOptions = {},
): string {
  const wantsEnvelope = options.envelope ?? true;
  const envelope = {
    protocolVersion: "0.2",
    operation: request.operation,
    requestId: request.requestId,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    payload: request.payload,
  };
  const payloadContract = PAYLOAD_CONTRACTS[request.operation];
  const instructions = [
    "Complete the Discere tutor operation below.",
    "Return one JSON object only. Do not wrap it in Markdown or add text before or after it.",
  ];
  if (wantsEnvelope) {
    instructions.push(
      "Copy protocolVersion, operation, and requestId exactly from the request envelope.",
      "Set generatedAt to a current ISO 8601 timestamp.",
    );
  } else {
    instructions.push(
      "Return the payload object alone. Do not wrap it in a protocol envelope.",
      "Do not read, write, or run anything on this machine. Answer from the supplied request only.",
    );
  }
  instructions.push(
    "Give concise visible reasoning or criteria when useful. Do not include private chain-of-thought.",
    "Write to the Discere tutor system prompt reproduced below.",
    "Preserve supplied values, units, equations, source identifiers, and answer boundaries.",
    "Follow the tutoring mode and responsePolicy. In Coach or Assisted mode, do not reveal a hidden final answer.",
  );
  if (request.operation === "workings_review") {
    instructions.push(
      "Review the image attached by the learner. Set imageReviewed to false when no usable image is attached.",
      "Transcribe only what is visible. Mark unreadable symbols in uncertainty instead of guessing.",
      "When transcription confidence is below 0.55, use assessment 'unclear'.",
      "Identify the earliest meaningful error rather than listing every downstream consequence.",
    );
  }
  if (payloadContract) {
    instructions.push(
      wantsEnvelope ? "Return payload with this exact shape:" : "Return this exact shape:",
      payloadContract,
    );
  }
  instructions.push(...(options.extraInstructions ?? []));
  instructions.push("", "---", "", loadPrompt(options.systemPrompt ?? "tutor-system").text);
  instructions.push(
    "",
    "---",
    "",
    JSON.stringify(wantsEnvelope ? envelope : request.payload, null, 2),
  );
  return instructions.join("\n");
}
