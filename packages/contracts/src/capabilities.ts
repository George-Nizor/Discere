import { z } from "zod";

/**
 * What the running installation can actually do right now.
 *
 * Discere's generative features run on the owner's own Codex CLI subscription rather than an API
 * key, which means they can be absent for reasons that have nothing to do with this code: no CLI
 * installed, no signed-in account, an expired subscription. The interface needs to know that
 * before it offers a control, because an affordance that always fails is worse than an absent one
 * — the learner spends a click and two minutes finding out.
 */
export const CapabilityIdSchema = z.enum(["tutor_generation", "illustrations", "authoring"]);
export type CapabilityId = z.infer<typeof CapabilityIdSchema>;

export const CapabilityStateSchema = z.enum(["available", "unavailable"]);
export type CapabilityState = z.infer<typeof CapabilityStateSchema>;

export const CapabilitySchema = z
  .object({
    id: CapabilityIdSchema,
    state: CapabilityStateSchema,
    /** Why it is unavailable, in a sentence a learner can act on. Empty when it is available. */
    reason: z.string().max(300),
    /** What still works instead. Empty when there is no alternative or none is needed. */
    fallback: z.string().max(300),
  })
  .strict();
export type Capability = z.infer<typeof CapabilitySchema>;

export const CapabilitiesResponseSchema = z
  .object({ capabilities: z.array(CapabilitySchema) })
  .strict();
export type CapabilitiesResponse = z.infer<typeof CapabilitiesResponseSchema>;
