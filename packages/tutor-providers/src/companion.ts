import type { TutorRequest } from "./types.js";
export interface CompanionPacket { filename: string; text: string; }
export function buildCompanionPacket<T>(request: TutorRequest<T>): CompanionPacket {
  const envelope = { protocolVersion: "0.2", operation: request.operation, requestId: request.requestId, generatedAt: new Date().toISOString(), payload: request.payload };
  const text = [
    "Complete the Discere tutor operation below.",
    "Return one JSON object matching protocol version 0.2. Do not wrap it in Markdown.",
    "Give visible working or concise criteria where the operation requires reasoning. Do not include private chain-of-thought.",
    "Write plain, direct prose. Avoid negative parallelism, forced groups of three, canned praise, stock openings, and ceremonial conclusions.",
    "Preserve all supplied values, units, equations, source identifiers, and hidden-answer boundaries.",
    "", JSON.stringify(envelope, null, 2),
  ].join("\n");
  return { filename: `discere-${request.operation}-${request.requestId}.md`, text };
}
