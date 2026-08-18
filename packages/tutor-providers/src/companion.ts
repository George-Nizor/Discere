import { buildTutorPrompt } from "./prompt.js";
import type { TutorRequest } from "./types.js";

export interface CompanionPacket {
  filename: string;
  text: string;
}

/**
 * The learner-driven handoff: Discere writes the packet, the learner pastes it into their own
 * ChatGPT subscription, and the pasted reply is validated on the way back in.
 */
export function buildCompanionPacket<T>(request: TutorRequest<T>): CompanionPacket {
  return {
    filename: `discere-${request.operation}-${request.requestId}.md`,
    text: buildTutorPrompt(request),
  };
}
