import { z } from "zod";

const mass = z.number().min(0.2).max(100);
const velocity = z.number().min(-40).max(40);
const force = z.number().min(0).max(500);
const duration = z.number().min(0.2).max(12);
const gravity = z.number().min(0.1).max(20);
const position = z.number().min(-100).max(100);
/** Only given quantities belong in these bounded models. Derived results stay out of payloads. */
export const MechanicsModelSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("journey"),
      points: z
        .array(z.object({ t: z.number().min(0).max(20), x: position }).strict())
        .min(2)
        .max(5),
      display: z.enum(["track", "position_graph"]),
    })
    .strict()
    .refine(
      (v) => v.points[0]?.t === 0 && v.points.every((p, i) => i === 0 || p.t > v.points[i - 1]!.t),
      "Journey times start at zero and increase.",
    ),
  z
    .object({
      kind: z.literal("motion"),
      mass: mass.optional(),
      x0: position,
      v0: velocity,
      acceleration: z.number().min(-20).max(20),
      duration,
      axis: z.enum(["horizontal", "vertical"]),
      display: z.enum(["track", "velocity_graph"]),
    })
    .strict(),
  z.object({ kind: z.literal("velocity_change"), v0: velocity, v1: velocity, duration }).strict(),
  z
    .object({ kind: z.literal("forces"), mass, left: force, right: force, v0: velocity, duration })
    .strict(),
  z
    .object({
      kind: z.literal("support"),
      mass,
      gravity,
      acceleration: z.number().min(-10).max(10),
    })
    .strict()
    .refine(
      (v) => v.gravity + v.acceleration >= 0,
      "The support can push upward, not pull downward.",
    ),
  z
    .object({ kind: z.literal("interaction"), massA: mass, massB: mass, force: force, duration })
    .strict(),
  z
    .object({
      kind: z.literal("friction"),
      mass,
      gravity,
      applied: force,
      muStatic: z.number().min(0).max(1),
      muKinetic: z.number().min(0).max(1),
      v0: z.number().min(0).max(30),
      duration,
    })
    .strict()
    .refine(
      (v) => v.muKinetic <= v.muStatic,
      "Kinetic friction cannot exceed the stated static limit.",
    ),
  z
    .object({
      kind: z.literal("work"),
      force,
      distance: z.number().min(0).max(30),
      alignment: z.enum(["with", "against", "perpendicular"]),
    })
    .strict(),
  z.object({ kind: z.literal("kinetic"), mass, speed: z.number().min(0).max(40) }).strict(),
  z
    .object({
      kind: z.literal("lift"),
      mass,
      gravity,
      fromHeight: z.number().min(0).max(60),
      toHeight: z.number().min(0).max(60),
    })
    .strict(),
  z
    .object({
      kind: z.literal("energy_drop"),
      mass,
      gravity,
      height: z.number().min(0.5).max(60),
      initialSpeed: z.number().min(0).max(30),
      thermalLoss: z.number().min(0).max(10000),
    })
    .strict()
    .refine(
      (v) => v.thermalLoss <= v.mass * v.gravity * v.height,
      "Descent heating cannot exceed the potential-energy decrease.",
    ),
  z
    .object({
      kind: z.literal("power"),
      inputEnergy: z.number().min(1).max(100000),
      usefulEnergy: z.number().min(0).max(100000),
      duration: z.number().min(0.1).max(300),
    })
    .strict()
    .refine((v) => v.usefulEnergy <= v.inputEnergy, "Useful output cannot exceed input energy."),
  z
    .object({
      kind: z.literal("impulse"),
      mass,
      v0: velocity,
      force: z.number().min(-500).max(500),
      duration,
    })
    .strict(),
  z
    .object({
      kind: z.literal("collision"),
      massA: mass,
      massB: mass,
      velocityA: velocity,
      velocityB: velocity,
    })
    .strict()
    .refine((v) => v.velocityA > v.velocityB, "The rear cart must approach the front cart."),
]);
export const MechanicsDiagramSchema = z
  .object({
    type: z.literal("mechanics_explorer"),
    cases: z
      .array(
        z
          .object({
            id: z.string().min(1).max(32),
            label: z.string().min(1).max(45),
            model: MechanicsModelSchema,
          })
          .strict(),
      )
      .min(2)
      .max(3),
    initialCaseId: z.string().min(1).max(32),
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.cases.map((c) => c.id)).size === v.cases.length &&
      v.cases.some((c) => c.id === v.initialCaseId),
    "Select an existing case with a unique ID.",
  );
export type MechanicsModel = z.infer<typeof MechanicsModelSchema>;
export type MechanicsDiagram = z.infer<typeof MechanicsDiagramSchema>;
