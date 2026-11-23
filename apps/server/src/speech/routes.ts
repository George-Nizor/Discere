import { SpeechRequestSchema, SpeechSentencesRequestSchema } from "@discere/contracts";
import type { FastifyInstance } from "fastify";
import { HttpError } from "../errors.js";
import { SpeechNotReady, type SpeechService } from "./service.js";
import { prepareLessonText, splitSentences } from "./text.js";

export async function registerSpeechRoutes(app: FastifyInstance, speech: SpeechService) {
  app.get("/api/speech/status", async () => speech.status());
  app.post("/api/speech/install", async () => speech.install());
  // The interface asks for a screen's sentences once, then requests each in turn, so the first
  // plays while the next is being made.
  app.post("/api/speech/sentences", async (request) => {
    const { text } = SpeechSentencesRequestSchema.parse(request.body);
    return { sentences: splitSentences(prepareLessonText(text)) };
  });
  app.post("/api/speech", async (request, reply) => {
    const { text } = SpeechRequestSchema.parse(request.body);
    try {
      const wav = await speech.speak(text);
      return reply
        .header("content-type", "audio/wav")
        .header("cache-control", "no-store")
        .send(wav);
    } catch (error) {
      if (error instanceof SpeechNotReady)
        throw new HttpError(409, error.message, { code: "SPEECH_NOT_READY" });
      throw new HttpError(500, "The voice could not read this.", {
        code: "SPEECH_FAILED",
        detail:
          (error instanceof Error ? error.message.split("\n")[0] : undefined) ?? String(error),
      });
    }
  });
}
