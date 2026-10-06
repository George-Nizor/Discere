import { z } from "zod";

/**
 * Engineering explorer models. Each carries only the given values of a structure or machine:
 * geometry, loads, material constants and inputs. Reactions, member forces, stresses, deflections,
 * ratios and outputs are computed by `@discere/activity-engine` and never stored here.
 */
const label = z.string().trim().min(1).max(14);
const magnitude = z.number().min(0).max(5000);
const angle = z.number().min(-360).max(360);
const metres = z.number().min(0).max(20);

const forceAtPoint = z
  .object({
    label,
    magnitude,
    /** Direction in degrees, anticlockwise from the positive x-axis. */
    angle,
    /** Optional slope triangle for drawings that give run and rise instead of an angle. */
    slope: z
      .object({ run: z.number().min(-20).max(20), rise: z.number().min(-20).max(20) })
      .strict()
      .optional(),
  })
  .strict();

const barForce = z
  .object({
    label,
    /** Distance along the bar from the pivot, metres; negative is left of the pivot. */
    position: z.number().min(-10).max(10),
    magnitude,
    angle,
  })
  .strict();

const pointLoad = z.object({ position: metres, magnitude: z.number().min(0).max(500) }).strict();
const spreadLoad = z
  .object({ start: metres, end: metres, intensity: z.number().min(0).max(200) })
  .strict()
  .refine((v) => v.end > v.start, "A spread load must run from start to a later end.");

const trussNode = z
  .object({
    id: z.string().regex(/^[A-H]$/u),
    x: z.number().min(0).max(20),
    y: z.number().min(0).max(12),
  })
  .strict();

export const EngineeringModelSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("concurrent"),
      unit: z.enum(["N", "kN"]),
      forces: z.array(forceAtPoint).min(1).max(4),
    })
    .strict(),
  z
    .object({
      kind: z.literal("moment"),
      unit: z.enum(["N", "kN"]),
      forces: z.array(barForce).min(1).max(3),
    })
    .strict()
    .refine((v) => v.forces.some((f) => f.position !== 0), "At least one force needs a lever arm."),
  z
    .object({
      kind: z.literal("beam"),
      support: z.enum(["simple", "cantilever"]),
      length: z.number().min(1).max(20),
      /** Pin and roller positions for a simple beam. A cantilever is fixed at x = 0. */
      supports: z.tuple([metres, metres]).optional(),
      pointLoads: z.array(pointLoad).max(3),
      spreadLoads: z.array(spreadLoad).max(2),
      display: z.enum(["reactions", "shear", "moment"]),
    })
    .strict()
    .refine(
      (v) => v.pointLoads.length + v.spreadLoads.length > 0,
      "A beam explorer needs at least one load.",
    )
    .refine(
      (v) =>
        v.support === "cantilever"
          ? v.supports === undefined
          : v.supports !== undefined && v.supports[0] < v.supports[1] && v.supports[1] <= v.length,
      "A simple beam names two ordered supports on the beam; a cantilever names none.",
    )
    .refine(
      (v) =>
        v.pointLoads.every((p) => p.position <= v.length) &&
        v.spreadLoads.every((w) => w.end <= v.length),
      "Loads must sit on the beam.",
    ),
  z
    .object({
      kind: z.literal("truss"),
      nodes: z.array(trussNode).min(3).max(8),
      members: z
        .array(z.tuple([z.string().regex(/^[A-H]$/u), z.string().regex(/^[A-H]$/u)]))
        .min(3)
        .max(13),
      pin: z.string().regex(/^[A-H]$/u),
      roller: z.string().regex(/^[A-H]$/u),
      loads: z
        .array(
          z
            .object({
              node: z.string().regex(/^[A-H]$/u),
              fx: z.number().min(-200).max(200),
              fy: z.number().min(-200).max(200),
            })
            .strict(),
        )
        .min(1)
        .max(3),
    })
    .strict()
    .refine((v) => {
      const ids = new Set(v.nodes.map((n) => n.id));
      return (
        ids.size === v.nodes.length &&
        v.members.every(([a, b]) => a !== b && ids.has(a) && ids.has(b)) &&
        ids.has(v.pin) &&
        ids.has(v.roller) &&
        v.pin !== v.roller &&
        v.loads.every((l) => ids.has(l.node))
      );
    }, "Truss members, supports and loads must name distinct existing joints.")
    .refine(
      (v) => v.members.length + 3 === 2 * v.nodes.length,
      "A plane truss on a pin and roller is statically determinate when m + 3 = 2j.",
    ),
  z
    .object({
      kind: z.literal("stress_strain"),
      material: z.string().trim().min(1).max(24),
      /** Young's modulus, GPa. */
      modulus: z.number().min(1).max(400),
      /** Yield and ultimate tensile strengths, MPa. */
      yieldStress: z.number().min(10).max(2000),
      ultimateStress: z.number().min(10).max(2500),
      /** Cross-sectional area, mm²; original length, mm; axial tensile load, kN. */
      area: z.number().min(1).max(100000),
      length: z.number().min(10).max(20000),
      load: z.number().min(0).max(5000),
    })
    .strict()
    .refine((v) => v.ultimateStress > v.yieldStress, "Ultimate strength exceeds yield strength."),
  z
    .object({
      kind: z.literal("section"),
      shape: z.enum(["rectangle", "i_beam"]),
      /** Overall width and depth, mm; I-beam flange and web thickness, mm; bending moment, kN·m. */
      width: z.number().min(5).max(1000),
      depth: z.number().min(5).max(1000),
      flange: z.number().min(1).max(200).optional(),
      web: z.number().min(1).max(200).optional(),
      moment: z.number().min(0).max(2000),
    })
    .strict()
    .refine(
      (v) =>
        v.shape === "rectangle"
          ? v.flange === undefined && v.web === undefined
          : v.flange !== undefined &&
            v.web !== undefined &&
            2 * v.flange < v.depth &&
            v.web < v.width,
      "An I-beam needs a flange thinner than half its depth and a web narrower than its flange.",
    ),
  z
    .object({
      kind: z.literal("cantilever"),
      /** Length, m; tip load, kN; Young's modulus, GPa; second moment of area, 10⁶ mm⁴. */
      length: z.number().min(0.2).max(12),
      load: z.number().min(0).max(500),
      modulus: z.number().min(1).max(400),
      secondMoment: z.number().min(0.01).max(5000),
    })
    .strict(),
  z
    .object({
      kind: z.literal("lever"),
      leverClass: z.enum(["first", "second", "third"]),
      effortArm: z.number().min(0.01).max(10),
      loadArm: z.number().min(0.01).max(10),
      load: z.number().min(0).max(100000),
    })
    .strict()
    .refine(
      (v) =>
        v.leverClass === "first" ||
        (v.leverClass === "second" ? v.loadArm < v.effortArm : v.effortArm < v.loadArm),
      "A second-class lever has the load inside the effort; a third-class lever the reverse.",
    ),
  z
    .object({
      kind: z.literal("pulley"),
      strands: z.number().int().min(1).max(6),
      /** Load weight, N; lift height, m; efficiency as a fraction; optional lifting speed, m/s. */
      load: z.number().min(0).max(100000),
      lift: z.number().min(0.1).max(10),
      efficiency: z.number().min(0.1).max(1),
      liftSpeed: z.number().min(0.01).max(5).optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("gears"),
      stages: z
        .array(
          z
            .object({
              driver: z.number().int().min(8).max(120),
              driven: z.number().int().min(8).max(120),
            })
            .strict(),
        )
        .min(1)
        .max(2),
      idler: z.number().int().min(8).max(120).optional(),
      /** Input speed, rpm; input torque, N·m; efficiency of each mesh as a fraction. */
      inputSpeed: z.number().min(1).max(10000),
      inputTorque: z.number().min(0).max(10000),
      efficiency: z.number().min(0.5).max(1),
    })
    .strict()
    .refine(
      (v) => v.idler === undefined || v.stages.length === 1,
      "An idler is shown only in a single-stage train.",
    ),
]);

export const EngineeringDiagramSchema = z
  .object({
    type: z.literal("engineering_explorer"),
    cases: z
      .array(
        z
          .object({
            id: z.string().min(1).max(32),
            label: z.string().min(1).max(70),
            model: EngineeringModelSchema,
          })
          .strict(),
      )
      .min(2)
      .max(3),
    initialCaseId: z.string().min(1),
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.cases.map((c) => c.id)).size === v.cases.length &&
      v.cases.some((c) => c.id === v.initialCaseId),
    "Use unique cases and an available initial case.",
  );
export type EngineeringModel = z.infer<typeof EngineeringModelSchema>;
export type EngineeringDiagram = z.infer<typeof EngineeringDiagramSchema>;
