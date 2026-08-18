import { resolveDatabasePath } from "@discere/paths";
import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { ContentRepository } from "./content.js";
import { DiscereStore } from "./db/store.js";
import { HttpError } from "./errors.js";
import { registerRoutes } from "./routes.js";
import { registerTransferRoutes } from "./transfer-routes.js";
import { createTutorRuntime, type TutorRuntimeOptions } from "./tutor-provider.js";
import { registerTutorRoutes } from "./tutor-routes.js";
import { registerWorkingsReviewRoutes } from "./workings-routes.js";

export interface AppOptions {
  dbPath?: string;
  /** Root directory holding one sub-directory per course bundle. */
  contentRoot?: string;
  revealDelayMs?: number;
  logger?: boolean;
  /** Applies pending migrations before serving. Tests and disposable databases use this;
   * the deployed server refuses to start against an unmigrated database instead. */
  migrate?: boolean;
  /** Overrides the provider chosen by `DISCERE_TUTOR_PROVIDER`. */
  tutor?: TutorRuntimeOptions;
  /** Supplies the current instant to the store, so a test can move through several days. */
  clock?: () => Date;
}

export interface DiscereApp {
  app: FastifyInstance;
  store: DiscereStore;
  content: ContentRepository;
}

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65_535 ? parsed : fallback;
}

export async function createApp(options: AppOptions = {}): Promise<DiscereApp> {
  const app = Fastify({ logger: options.logger ?? false });
  const webPort = parsePort(process.env["DISCERE_WEB_PORT"], 4318);
  await app.register(cors, {
    origin: [
      `http://localhost:${webPort}`,
      `http://127.0.0.1:${webPort}`,
      `http://[::1]:${webPort}`,
    ],
    methods: ["GET", "POST", "PUT"],
  });
  const content = await ContentRepository.load(
    options.contentRoot ?? ContentRepository.defaultContentRoot(),
  );
  const dbPath = options.dbPath ?? resolveDatabasePath(process.env["DISCERE_DATABASE_PATH"]);
  const store = new DiscereStore(dbPath, {
    migrate: options.migrate ?? false,
    ...(options.clock === undefined ? {} : { clock: options.clock }),
  });
  store.initialiseConcepts(content.concepts);
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "The request did not match the expected shape.",
        issues: error.issues,
      });
    }
    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({ code: error.code, message: error.message });
    }
    app.log.error(error);
    return reply
      .status(500)
      .send({ code: "INTERNAL_ERROR", message: "Discere could not complete the request." });
  });
  // One runtime for every tutor path, so the tutor drawer, the essay assessment, and the
  // workings review all speak to the same provider under the same limits.
  const runtime = createTutorRuntime(options.tutor);
  await registerRoutes(app, {
    content,
    store,
    revealDelayMs: options.revealDelayMs ?? 5000,
  });
  await registerTransferRoutes(app, { content, store });
  await registerWorkingsReviewRoutes(app, { content, store, runtime });
  await registerTutorRoutes(app, { content, store, runtime });
  app.addHook("onClose", async () => store.close());
  return { app, store, content };
}
