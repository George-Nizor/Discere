import type { FastifyInstance } from "fastify";

/**
 * Discere has no sign-in, so the network boundary is the only thing between a stranger and the
 * API, which can run code, spend tutor budget and draw illustrations. Two checks hold that
 * boundary. The bind check keeps the service on the loopback interface unless remote access is
 * asked for by name. The request check refuses a request addressed to a name Discere does not
 * recognise, which is what a DNS-rebinding page sends: the browser connects to 127.0.0.1 but
 * the `Host` header still carries the attacker's domain.
 */
const LOOPBACK_NAMES = new Set(["localhost", "127.0.0.1", "::1"]);
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const ALLOW_REMOTE_VARIABLE = "DISCERE_ALLOW_REMOTE";
export const ALLOWED_HOSTS_VARIABLE = "DISCERE_ALLOWED_HOSTS";

/** True for an address that only this computer can reach. */
export function isLoopbackHost(host: string): boolean {
  return LOOPBACK_NAMES.has(
    host
      .trim()
      .toLowerCase()
      .replace(/^\[|\]$/g, ""),
  );
}

/**
 * Throws unless `host` is a loopback address or remote access was switched on explicitly.
 * `variable` names the setting the value came from, so the message says what to change.
 */
export function assertBindHost(
  host: string,
  variable: string,
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (isLoopbackHost(host) || env[ALLOW_REMOTE_VARIABLE] === "1") return;
  throw new Error(
    `${variable} is '${host}', which other computers can reach, and Discere has no sign-in. ` +
      `Use 127.0.0.1, localhost or ::1. To listen on '${host}' anyway, set ${ALLOW_REMOTE_VARIABLE}=1 ` +
      `and list the names clients will use in ${ALLOWED_HOSTS_VARIABLE}.`,
  );
}

/** The host name from a `Host` header or an allow-list entry, without port or brackets. */
export function hostnameOf(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(`http://${raw}`);
  } catch {
    return null;
  }
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
  const name = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  return name || null;
}

/** Reads the comma-separated extra host names. A port on an entry is ignored. */
export function parseAllowedHosts(value: string | undefined): string[] {
  const names: string[] = [];
  for (const entry of (value ?? "").split(",")) {
    if (!entry.trim()) continue;
    const name = hostnameOf(entry);
    if (name === null) {
      throw new Error(
        `${ALLOWED_HOSTS_VARIABLE} holds '${entry.trim()}', which is not a host name. ` +
          "Write names separated by commas, for example 'my-pc.example.ts.net'.",
      );
    }
    names.push(name);
  }
  return names;
}

export interface HostGuardOptions {
  /** Extra host names to accept. Defaults to `DISCERE_ALLOWED_HOSTS`. */
  allowedHosts?: string[];
}

/**
 * Refuses a request whose `Host` is neither a loopback name nor a configured one. A request
 * that changes state is also refused when its `Origin` names any other host, so a page on
 * another site cannot post to the API even when it reaches the right address.
 */
export function registerHostGuard(app: FastifyInstance, options: HostGuardOptions = {}): void {
  const extra = new Set(
    options.allowedHosts?.map((entry) => hostnameOf(entry) ?? entry.toLowerCase()) ??
      parseAllowedHosts(process.env[ALLOWED_HOSTS_VARIABLE]),
  );
  const allowed = (name: string | null) =>
    name !== null && (LOOPBACK_NAMES.has(name) || extra.has(name));

  app.addHook("onRequest", async (request, reply) => {
    if (!allowed(hostnameOf(request.headers.host))) {
      return reply.status(403).send({
        code: "HOST_NOT_ALLOWED",
        message: `Discere does not answer to this address. Open it on this computer, or add the name to ${ALLOWED_HOSTS_VARIABLE}.`,
      });
    }
    const origin = request.headers.origin;
    if (origin === undefined || SAFE_METHODS.has(request.method)) return;
    let originHost: string | null = null;
    try {
      const url = new URL(origin);
      if (url.protocol === "http:" || url.protocol === "https:") originHost = hostnameOf(url.host);
    } catch {
      // "null" and anything else that is not a URL stays refused.
    }
    if (!allowed(originHost)) {
      return reply.status(403).send({
        code: "ORIGIN_NOT_ALLOWED",
        message: "Discere only accepts changes from its own pages.",
      });
    }
  });
}
