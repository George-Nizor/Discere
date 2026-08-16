import type { TutorProvider, TutorRequest, TutorResponse } from "./types.js";
export class MockTutorProvider implements TutorProvider {
  readonly id = "mock";
  readonly label = "Offline mock tutor";
  async generate<TRequest, TResponse>(request: TutorRequest<TRequest>): Promise<TutorResponse<TResponse>> {
    const payload = { title: "Current in a simple circuit", orientation: "Look at the single loop. Every charge passing the resistor continues around the same path.", explanation: "Current measures the rate of charge flow. With 5 V across a 100 Ω resistor, Ohm's law gives 0.05 A. Increase resistance while voltage stays fixed and current falls.", responsePrompt: "The resistance changes from 100 Ω to 200 Ω. What happens to current?" } as TResponse;
    return { protocolVersion: "0.2", operation: request.operation, requestId: request.requestId, generatedAt: new Date().toISOString(), payload, modelNotes: ["Static offline fixture"] };
  }
}
