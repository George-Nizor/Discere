import type { Capability, CapabilityId } from "@discere/contracts";
import { createContext, type ReactNode, useContext } from "react";
import { useCapabilities } from "../api/queries.js";

/**
 * What this installation can generate, read once for the session.
 *
 * A provider rather than a query inside each component that cares. The answer is a property of the
 * installation, not of the thing on screen, and it changes when the owner installs or signs into
 * the Codex CLI rather than while a learner is working. Asking per illustration would put a
 * request behind every tutor reply for a fact that cannot have changed since the page loaded.
 *
 * Outside a provider the hook returns `undefined`, which every caller reads as "carry on". A unit
 * test of one screen should not have to declare the whole installation's capabilities to render it.
 */
const CapabilityContext = createContext<readonly Capability[] | undefined>(undefined);

export function CapabilityProvider({ children }: { children: ReactNode }) {
  const capabilities = useCapabilities();
  return (
    <CapabilityContext.Provider value={capabilities.data?.capabilities}>
      {children}
    </CapabilityContext.Provider>
  );
}

export function useCapability(id: CapabilityId): Capability | undefined {
  return useContext(CapabilityContext)?.find((capability) => capability.id === id);
}

/** True only when the server has said so. An unknown capability is not treated as absent. */
export function useCapabilityUnavailable(id: CapabilityId): boolean {
  return useCapability(id)?.state === "unavailable";
}
