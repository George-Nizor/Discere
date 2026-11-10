import type { Capability, CapabilityId, TutorProviderId } from "@discere/contracts";
import { detectDrivers } from "@discere/tutor-providers";
import { statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { claudeSignedIn, codexAuthPresent, probeCodexBinary } from "./tutor-status.js";

/**
 * Which generative features this installation can actually perform.
 *
 * Drawn illustrations and authoring run on the owner's own Codex CLI subscription. The tutor runs
 * on whichever provider is configured. With `auto` that is Claude Code when it is installed (ADR
 * 0007 runs the release on it), then an OpenAI-compatible endpoint, the Codex CLI, or the companion
 * packet. A key, where a provider uses one, comes from the environment. Features that need a CLI can
 * disappear for reasons outside the code: the CLI is not installed, nobody is signed in, or the
 * subscription has lapsed. When that happens the honest thing is to say so once, in the interface,
 * and stop offering the control. Letting the learner press a button that spends two minutes failing
 * is the worse outcome, and it is the one you get by default.
 *
 * The learning core does not depend on any of this. Lessons, questions, assessment, review
 * scheduling, and the notebook are local and deterministic; only generation is gated.
 */

export type ImageGenerationSetting = "auto" | "off";

/**
 * `off` disables image generation regardless of what the CLI reports, which is the setting to use
 * while a subscription is lapsed rather than leaving learners to discover it one failure at a time.
 */
export function imageGenerationSetting(
  value = process.env["DISCERE_IMAGE_GENERATION"],
): ImageGenerationSetting {
  return value?.trim().toLowerCase() === "off" ? "off" : "auto";
}

export interface CodexReadiness {
  binaryFound: boolean;
  authPresent: boolean;
}

export function codexReadiness(): CodexReadiness {
  return { binaryFound: probeCodexBinary().found, authPresent: codexAuthPresent() };
}

const NO_BINARY = "The Codex CLI is not installed, so nothing can be generated locally.";
const NO_AUTH = "The Codex CLI is installed but not signed in, so it cannot generate.";
const TURNED_OFF = "Image generation is turned off in this installation.";

function codexReason(readiness: CodexReadiness): string {
  if (!readiness.binaryFound) return NO_BINARY;
  if (!readiness.authPresent) return NO_AUTH;
  return "";
}

/**
 * Whether an illustration can be drawn on request.
 *
 * A provider that does not generate in place is not a reason to refuse: the companion flow hands
 * the learner a packet to paste elsewhere. Illustrations have no such path — the CLI writes the
 * PNG itself — so they need the CLI specifically, whatever the tutor is set to.
 */
export function illustrationsCapability(
  readiness: CodexReadiness = codexReadiness(),
  setting: ImageGenerationSetting = imageGenerationSetting(),
): Capability {
  const fallback =
    "Lesson diagrams, maps, and timelines are drawn from data and are unaffected; only the tutor's drawn illustrations are.";
  if (setting === "off") {
    return { id: "illustrations", state: "unavailable", reason: TURNED_OFF, fallback };
  }
  const reason = codexReason(readiness);
  return reason
    ? { id: "illustrations", state: "unavailable", reason, fallback }
    : { id: "illustrations", state: "available", reason: "", fallback: "" };
}

/**
 * A CLI can report that it is signed in while its session has expired: `claude auth status` and
 * the presence of Codex's `auth.json` both describe the stored login, and only a model call finds
 * out that the provider no longer honours it. Making that call for every capability request would
 * spend the subscription on a status check, so the last refusal is remembered here instead. The
 * tutor then reads as unavailable until a request succeeds, the stored login changes on disk, or
 * the memory lapses and the next request is allowed to try again.
 */
const SIGN_IN_FAILURE_MS = 5 * 60_000;
const SIGN_IN_PATTERN =
  /not (?:signed|logged) in|\bsign(?:ed)? ?in\b|\blog ?in\b|\b401\b|unauthori[sz]ed|authenticat|credential|api key|token (?:has )?expired|session (?:has )?expired/iu;

let signInFailure: { providerId: TutorProviderId; at: number } | undefined;

/**
 * True when a provider's error reads as a sign-in fault. Only a provider that ran and refused
 * counts: a missing binary or a timeout says nothing about the login.
 */
export function signInLikely(error: {
  code: string;
  message: string;
  diagnostics?: string | undefined;
}): boolean {
  if (error.code !== "PROVIDER_UNAVAILABLE" && error.code !== "PROVIDER_EXITED") return false;
  return SIGN_IN_PATTERN.test(error.message) || SIGN_IN_PATTERN.test(error.diagnostics ?? "");
}

export function recordTutorSignInFailure(providerId: TutorProviderId, now = Date.now()): void {
  signInFailure = { providerId, at: now };
}

export function clearTutorSignInFailure(): void {
  signInFailure = undefined;
}

function storedLoginFile(providerId: TutorProviderId): string | undefined {
  if (providerId === "claude") {
    const home = process.env["CLAUDE_CONFIG_DIR"]?.trim() || path.join(os.homedir(), ".claude");
    return path.join(home, ".credentials.json");
  }
  if (providerId === "codex") {
    const home = process.env["CODEX_HOME"]?.trim() || path.join(os.homedir(), ".codex");
    return path.join(home, "auth.json");
  }
  return undefined;
}

function signInRefusedRecently(providerId: TutorProviderId, now = Date.now()): boolean {
  if (!signInFailure || signInFailure.providerId !== providerId) return false;
  if (now - signInFailure.at > SIGN_IN_FAILURE_MS) {
    signInFailure = undefined;
    return false;
  }
  const file = storedLoginFile(providerId);
  try {
    // Signing in again rewrites the stored login, which is the cheapest sign that it is worth
    // asking the provider once more.
    if (file && statSync(file).mtimeMs > signInFailure.at) {
      signInFailure = undefined;
      return false;
    }
  } catch {
    // No readable file tells us nothing; the time limit still applies.
  }
  return true;
}

const SIGN_IN_REFUSED: Partial<Record<TutorProviderId, string>> = {
  claude:
    "Claude Code refused the tutor's last request because its sign-in has expired. Run `claude` and log in again.",
  codex:
    "The Codex CLI refused the tutor's last request because its sign-in has expired. Run `codex login` again.",
};

/**
 * Whether the tutor can answer in place.
 *
 * `companion` and `mock` do not touch the CLI, so they are always available — `companion` produces
 * a packet to paste into a ChatGPT session the learner already has, which is exactly the fallback
 * a lapsed subscription wants.
 */
export function tutorCapability(
  providerId: TutorProviderId,
  readiness: CodexReadiness = codexReadiness(),
  now = Date.now(),
): Capability {
  if (providerId === "claude") {
    const reason = !detectDrivers().claude
      ? "Claude Code is not installed, so the tutor cannot answer in place."
      : !claudeSignedIn()
        ? "Claude Code is installed but not signed in. Run `claude` once and log in."
        : signInRefusedRecently("claude", now)
          ? (SIGN_IN_REFUSED.claude ?? "")
          : "";
    return reason
      ? {
          id: "tutor_generation",
          state: "unavailable",
          reason,
          fallback: "Set DISCERE_TUTOR_PROVIDER=companion to tutor by pasting into a chat you already have.",
        }
      : { id: "tutor_generation", state: "available", reason: "", fallback: "" };
  }
  if (providerId !== "codex") {
    return { id: "tutor_generation", state: "available", reason: "", fallback: "" };
  }
  const reason =
    codexReason(readiness) ||
    (signInRefusedRecently("codex", now) ? (SIGN_IN_REFUSED.codex ?? "") : "");
  return reason
    ? {
        id: "tutor_generation",
        state: "unavailable",
        reason,
        fallback:
          "Set DISCERE_TUTOR_PROVIDER=companion to keep tutoring by pasting into a ChatGPT session you already have.",
      }
    : { id: "tutor_generation", state: "available", reason: "", fallback: "" };
}

/** Authoring spawns the same CLI with a longer budget, so it lives or dies with it. */
export function authoringCapability(readiness: CodexReadiness = codexReadiness()): Capability {
  const reason = codexReason(readiness);
  return reason
    ? {
        id: "authoring",
        state: "unavailable",
        reason,
        fallback: "Reviewed course bundles already in `content/` load and play normally.",
      }
    : { id: "authoring", state: "available", reason: "", fallback: "" };
}

export function capabilities(providerId: TutorProviderId): Capability[] {
  const readiness = codexReadiness();
  return [
    tutorCapability(providerId, readiness),
    illustrationsCapability(readiness),
    authoringCapability(readiness),
  ];
}

export function capabilityById(
  providerId: TutorProviderId,
  id: CapabilityId,
): Capability | undefined {
  return capabilities(providerId).find((capability) => capability.id === id);
}
