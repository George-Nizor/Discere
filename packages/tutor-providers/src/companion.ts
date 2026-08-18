import type { TutorOperation } from "@discere/contracts";
import { loadPrompt } from "@discere/prompts";
import type { TutorRequest } from "./types.js";

export interface CompanionPacket { filename: string; text: string; }

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
};

export function buildCompanionPacket<T>(request: TutorRequest<T>): CompanionPacket {
  const envelope = {
    protocolVersion: "0.2",
    operation: request.operation,
    requestId: request.requestId,
    generatedAt: new Date().toISOString(),
    payload: request.payload,
  };
  const payloadContract = PAYLOAD_CONTRACTS[request.operation];
  const instructions = [
    "Complete the Discere tutor operation below.",
    "Return one JSON object only. Do not wrap it in Markdown or add text before or after it.",
    "Copy protocolVersion, operation, and requestId exactly from the request envelope.",
    "Set generatedAt to a current ISO 8601 timestamp.",
    "Give concise visible reasoning or criteria when useful. Do not include private chain-of-thought.",
    "Write to the Discere tutor system prompt reproduced below.",
    "Preserve supplied values, units, equations, source identifiers, and answer boundaries.",
    "Follow the tutoring mode and responsePolicy. In Coach or Assisted mode, do not reveal a hidden final answer.",
  ];
  if (request.operation === "workings_review") {
    instructions.push(
      "Review the image attached by the learner. Set imageReviewed to false when no usable image is attached.",
      "Transcribe only what is visible. Mark unreadable symbols in uncertainty instead of guessing.",
      "When transcription confidence is below 0.55, use assessment 'unclear'.",
      "Identify the earliest meaningful error rather than listing every downstream consequence.",
    );
  }
  if (payloadContract) {
    instructions.push("Return payload with this exact shape:", payloadContract);
  }
  instructions.push("", "---", "", loadPrompt("tutor-system").text);
  instructions.push("", "---", "", JSON.stringify(envelope, null, 2));
  return {
    filename: `discere-${request.operation}-${request.requestId}.md`,
    text: instructions.join("\n"),
  };
}
