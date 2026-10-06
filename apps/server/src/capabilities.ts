import type { Capability, CapabilityId, TutorProviderId } from "@discere/contracts";
import { detectDrivers } from "@discere/tutor-providers";
import { claudeSignedIn, codexAuthPresent, probeCodexBinary } from "./tutor-status.js";

/**
 * Which generative features this installation can actually perform.
 *
 * Every one of them runs on the owner's own Codex CLI subscription. That is a deliberate boundary
 * — ADR: no vendor API keys live in this repository — but it means the features can disappear for
 * reasons outside the code: the CLI is not installed, nobody is signed in, or the subscription has
 * lapsed. When that happens the honest thing is to say so once, in the interface, and stop
 * offering the control. Letting the learner press a button that spends two minutes failing is the
 * worse outcome, and it is the one you get by default.
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
 * Whether the tutor can answer in place.
 *
 * `companion` and `mock` do not touch the CLI, so they are always available — `companion` produces
 * a packet to paste into a ChatGPT session the learner already has, which is exactly the fallback
 * a lapsed subscription wants.
 */
export function tutorCapability(
  providerId: TutorProviderId,
  readiness: CodexReadiness = codexReadiness(),
): Capability {
  if (providerId === "claude") {
    const reason = !detectDrivers().claude
      ? "Claude Code is not installed, so the tutor cannot answer in place."
      : !claudeSignedIn()
        ? "Claude Code is installed but not signed in. Run `claude` once and log in."
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
  const reason = codexReason(readiness);
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
