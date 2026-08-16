import path from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { ContentRepository } from "./content.js";
import { DiscereStore } from "./db/store.js";
import { HttpError } from "./errors.js";
import { registerRoutes } from "./routes.js";

export interface AppOptions { dbPath?: string; contentPath?: string; revealDelayMs?: number; logger?: boolean; }
export interface DiscereApp { app: FastifyInstance; store: DiscereStore; content: ContentRepository; }

export async function createApp(options: AppOptions = {}): Promise<DiscereApp> {
  const app = Fastify({ logger: options.logger ?? false });
  await app.register(cors, { origin: ["http://localhost:4318", "http://127.0.0.1:4318"], methods: ["GET", "POST"] });
  const content = await ContentRepository.load(options.contentPath ?? ContentRepository.defaultPath());
  const dbPath = options.dbPath ?? process.env["DISCERE_DATABASE_PATH"] ?? path.resolve(import.meta.dirname, "../../../data/discere.sqlite");
  const store = new DiscereStore(dbPath);
  store.initialiseConcepts(content.bundle.concepts);
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) return reply.status(400).send({ code: "VALIDATION_ERROR", message: "The request did not match the expected shape.", issues: error.issues });
    if (error instanceof HttpError) return reply.status(error.statusCode).send({ code: error.code, message: error.message });
    app.log.error(error);
    return reply.status(500).send({ code: "INTERNAL_ERROR", message: "Discere could not complete the request." });
  });
  await registerRoutes(app, { content, store, revealDelayMs: options.revealDelayMs ?? 5000 });
  app.addHook("onClose", async () => store.close());
  return { app, store, content };
}
