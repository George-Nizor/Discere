import { TutorProviderError } from "./errors.js";
import type { TutorProvider, TutorRequest, TutorResponse } from "./types.js";

/**
 * The copy/paste route has no in-process generation: the learner runs the model themselves.
 * The provider exists so a caller can ask any configured provider the same question and be told
 * plainly when a packet is required instead of receiving a fabricated reply.
 */
export class CompanionTutorProvider implements TutorProvider {
  readonly id = "companion";
  readonly label = "ChatGPT companion packet";
  readonly generatesInProcess = false;

  async generate<TRequest, TResponse>(
    _request: TutorRequest<TRequest>,
  ): Promise<TutorResponse<TResponse>> {
    throw new TutorProviderError(
      "PROVIDER_UNAVAILABLE",
      "The companion provider cannot generate a reply. Copy the packet into ChatGPT and import the response.",
      { provider: this.id },
    );
  }
}
