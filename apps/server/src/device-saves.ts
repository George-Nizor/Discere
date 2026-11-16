import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { asLearner, LOCAL_LEARNER } from "./learner.js";

/**
 * One save per browser, for a hosted copy that several people open (`DISCERE_DEVICE_SAVES=1`).
 *
 * The first request from a browser gets a random id in a cookie, and from then on its progress
 * is kept under that id. Nobody signs in and nobody sees anyone else's progress, which is how
 * Iron Odyssey's hosted copy behaves. Clearing the browser's data loses the link to the save, as
 * it does there; export and import carry a save to another browser.
 *
 * Without the setting every request is `local-user`, which is the PC: one learner, no cookie.
 */
export const DEVICE_COOKIE = "discere_device";
/** Browsers cap a cookie's lifetime at 400 days. */
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function deviceSavesEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env["DISCERE_DEVICE_SAVES"]?.trim() === "1";
}

export function readDeviceCookie(header: string | undefined): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const [name, ...rest] = part.trim().split("=");
    const value = rest.join("=");
    if (name === DEVICE_COOKIE && ID_PATTERN.test(value)) return value;
  }
  return undefined;
}

function secure(request: FastifyRequest): boolean {
  // The Cloudflare tunnel speaks plain HTTP to the server and names the scheme it received.
  const forwarded = request.headers["x-forwarded-proto"];
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded) === "https";
}

export function registerLearnerHook(
  app: FastifyInstance,
  options: { deviceSaves: boolean; prepareLearner: () => void },
): void {
  const prepared = new Set<string>([LOCAL_LEARNER]);
  app.addHook("onRequest", (request, reply, done) => {
    if (!options.deviceSaves) {
      asLearner(LOCAL_LEARNER, done);
      return;
    }
    let device = readDeviceCookie(request.headers.cookie);
    if (!device) {
      device = randomUUID();
      reply.header(
        "set-cookie",
        `${DEVICE_COOKIE}=${device}; Path=/; Max-Age=${MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax${secure(request) ? "; Secure" : ""}`,
      );
    }
    const learner = `device-${device}`;
    asLearner(learner, () => {
      // A learner seen for the first time since the server started gets a profile and the
      // concepts open to a beginner. Both inserts ignore rows that already exist.
      if (!prepared.has(learner)) {
        options.prepareLearner();
        prepared.add(learner);
      }
      done();
    });
  });
}
