import { RustRunRequestSchema, RustRunResultSchema } from "@discere/contracts";
import type { FastifyInstance } from "fastify";
import { HttpError } from "../errors.js";
import type { RustRuntime } from "./runtime.js";

/**
 * The Rust playground: compile and run any program, nothing graded and nothing saved. Lesson
 * programs use it when a learner edits and reruns an example.
 */
export async function registerRustPlaygroundRoutes(app: FastifyInstance, runtime: RustRuntime) {
  app.get("/api/rust/status", () => runtime.status());
  app.post("/api/rust/run", async (request) => {
    const { code, stdin } = RustRunRequestSchema.parse(request.body);
    const [result] = await runtime.run({ code }, [stdin ?? ""]);
    if (!result || result.status === "unavailable")
      throw new HttpError(503, result?.message ?? "Rust is unavailable.", "RUST_UNAVAILABLE");
    return RustRunResultSchema.parse(result);
  });
}
