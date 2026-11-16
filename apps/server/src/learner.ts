import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Whose progress a request reads and writes.
 *
 * On the PC there is one learner, `local-user`, and every table has always been keyed by that.
 * A hosted copy (the homelab, `DISCERE_DEVICE_SAVES=1`) gives each browser its own save instead,
 * the way Iron Odyssey does: no sign-in, a random id in a cookie, and that id in place of
 * `local-user`. The id travels with the request through AsyncLocalStorage, so the store and the
 * services ask for it rather than having it passed through every call.
 */
export const LOCAL_LEARNER = "local-user";

const current = new AsyncLocalStorage<string>();

/** The learner of the request in progress, or `local-user` outside one. */
export function learnerId(): string {
  return current.getStore() ?? LOCAL_LEARNER;
}

/** Runs `work` as `id`. Everything it awaits sees the same learner. */
export function asLearner<T>(id: string, work: () => T): T {
  return current.run(id, work);
}
