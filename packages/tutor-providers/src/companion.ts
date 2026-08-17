import type { TutorOperation } from "@discere/contracts";
import type { TutorRequest } from "./types.js";

export interface CompanionPacket { filename: string; text: string; }

const PAYLOAD_CONTRACTS: Partial<Record<TutorOperation, string>> = {
  tutor_reply: `{
  "answer": "A direct, learner-facing response that follows the supplied tutoring mode.",
  "followUpQuestion": "One short question that checks or advances understanding.",
  "sourceIds": ["Only identifiers supplied in allowedSourceIds; use an empty array when none are needed."],
  "uncertainty": ["Any material uncertainty; otherwise return an empty array."]
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
    "Write plain, direct prose. Avoid negative parallelism, forced groups of three, canned praise, stock openings, and ceremonial conclusions.",
    "Preserve supplied values, units, equations, source identifiers, and answer boundaries.",
    "Follow the tutoring mode and responsePolicy. In Coach or Assisted mode, do not reveal a hidden final answer.",
  ];
  if (payloadContract) {
    instructions.push("Return payload with this exact shape:", payloadContract);
  }
  instructions.push("", JSON.stringify(envelope, null, 2));
  return {
    filename: `discere-${request.operation}-${request.requestId}.md`,
    text: instructions.join("\n"),
  };
}
