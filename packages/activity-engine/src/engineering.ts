import type { EngineeringModel } from "@discere/contracts";

/**
 * Deterministic statics, strength-of-materials and machine calculations for the Engineering
 * explorer. Every function is pure. Sign conventions:
 * - angles are anticlockwise from the positive x-axis, and anticlockwise moments are positive;
 * - beam loads are given as downward magnitudes, reactions are positive upward, shear at a cut is
 *   the sum of upward forces to its left and sagging bending moment is positive;
 * - truss member forces are positive in tension and negative in compression.
 */
type Model<K extends EngineeringModel["kind"]> = Extract<EngineeringModel, { kind: K }>;
export type ConcurrentModel = Model<"concurrent">;
export type MomentModel = Model<"moment">;
export type BeamModel = Model<"beam">;
export type TrussModel = Model<"truss">;
export type StressStrainModel = Model<"stress_strain">;
export type SectionModel = Model<"section">;
export type CantileverModel = Model<"cantilever">;
export type LeverModel = Model<"lever">;
export type PulleyModel = Model<"pulley">;
export type GearsModel = Model<"gears">;

/** Rounds away floating-point dust for display: at most four decimals, no trailing zeros. */
export const engineeringNumber = (value: number, places = 4) => {
  const rounded = Number(value.toFixed(places));
  return (Object.is(rounded, -0) ? 0 : rounded).toString();
};
const deg = (a: number) => (a * Math.PI) / 180;
const fmt = engineeringNumber;

// ---------------------------------------------------------------------------
// Forces at a point
// ---------------------------------------------------------------------------

export interface ForceComponents {
  label: string;
  x: number;
  y: number;
}
/** Components of each force. A slope triangle, when given, fixes the direction exactly. */
export function forceComponents(m: ConcurrentModel): ForceComponents[] {
  return m.forces.map((f) => {
    if (f.slope) {
      const h = Math.hypot(f.slope.run, f.slope.rise);
      return {
        label: f.label,
        x: (f.magnitude * f.slope.run) / h,
        y: (f.magnitude * f.slope.rise) / h,
      };
    }
    return {
      label: f.label,
      x: f.magnitude * Math.cos(deg(f.angle)),
      y: f.magnitude * Math.sin(deg(f.angle)),
    };
  });
}
export function resultant(m: ConcurrentModel) {
  const parts = forceComponents(m);
  const x = parts.reduce((s, p) => s + p.x, 0),
    y = parts.reduce((s, p) => s + p.y, 0);
  const clean = (v: number) => (Math.abs(v) < 1e-9 ? 0 : v);
  const magnitude = clean(Math.hypot(x, y));
  return {
    x: clean(x),
    y: clean(y),
    magnitude,
    angle: magnitude === 0 ? 0 : ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360,
  };
}

// ---------------------------------------------------------------------------
// Moments about a pivot
// ---------------------------------------------------------------------------

/** Moment of each force about the pivot at x = 0 of a bar lying along the x-axis. */
export function barMoments(m: MomentModel) {
  return m.forces.map((f) => ({
    label: f.label,
    /** Perpendicular distance from the pivot to the line of action. */
    arm: Math.abs(f.position * Math.sin(deg(f.angle))),
    moment: clean(f.position * f.magnitude * Math.sin(deg(f.angle))),
  }));
}
export function netMoment(m: MomentModel): number {
  return clean(barMoments(m).reduce((s, f) => s + f.moment, 0));
}
function clean(v: number) {
  return Math.abs(v) < 1e-9 ? 0 : v;
}

// ---------------------------------------------------------------------------
// Beams
// ---------------------------------------------------------------------------

export interface BeamReactions {
  /** Upward support forces, kN, in support order (a cantilever has one, at the wall). */
  forces: Array<{ position: number; value: number }>;
  /** Wall moment of a cantilever, kN·m, anticlockwise positive. Zero for a simple beam. */
  wallMoment: number;
  totalLoad: number;
}
export function beamTotalLoad(m: BeamModel): number {
  return (
    m.pointLoads.reduce((s, p) => s + p.magnitude, 0) +
    m.spreadLoads.reduce((s, w) => s + w.intensity * (w.end - w.start), 0)
  );
}
/** Sum of load moments about x = a, clockwise positive (downward loads to the right of a). */
function loadMomentAbout(m: BeamModel, a: number): number {
  return (
    m.pointLoads.reduce((s, p) => s + p.magnitude * (p.position - a), 0) +
    m.spreadLoads.reduce(
      (s, w) => s + w.intensity * (w.end - w.start) * ((w.start + w.end) / 2 - a),
      0,
    )
  );
}
export function beamReactions(m: BeamModel): BeamReactions {
  const total = beamTotalLoad(m);
  if (m.support === "cantilever")
    return {
      forces: [{ position: 0, value: clean(total) }],
      wallMoment: clean(loadMomentAbout(m, 0)),
      totalLoad: total,
    };
  const [a, b] = m.supports!;
  const rb = loadMomentAbout(m, a) / (b - a);
  return {
    forces: [
      { position: a, value: clean(total - rb) },
      { position: b, value: clean(rb) },
    ],
    wallMoment: 0,
    totalLoad: total,
  };
}
/**
 * Shear force at x: upward forces to the left minus downward loads to the left. `side` decides
 * whether a concentrated force at exactly x counts (`right` means just to the right of x).
 */
export function beamShear(m: BeamModel, x: number, side: "left" | "right" = "right"): number {
  const r = beamReactions(m);
  const counts = (p: number) => (side === "right" ? p <= x + 1e-12 : p < x - 1e-12);
  let v = 0;
  for (const f of r.forces) if (counts(f.position)) v += f.value;
  for (const p of m.pointLoads) if (counts(p.position)) v -= p.magnitude;
  for (const w of m.spreadLoads) v -= w.intensity * Math.max(0, Math.min(x, w.end) - w.start);
  return clean(v);
}
/** Sagging-positive bending moment at x, from the forces to the left of the cut. */
export function beamMoment(m: BeamModel, x: number): number {
  const r = beamReactions(m);
  // A cantilever wall pushes up with R and resists with a hogging couple of size wallMoment.
  let moment = m.support === "cantilever" ? -r.wallMoment : 0;
  for (const f of r.forces) if (f.position < x) moment += f.value * (x - f.position);
  for (const p of m.pointLoads) if (p.position < x) moment -= p.magnitude * (x - p.position);
  for (const w of m.spreadLoads) {
    const covered = Math.max(0, Math.min(x, w.end) - w.start);
    if (covered > 0) moment -= w.intensity * covered * (x - (w.start + covered / 2));
  }
  return clean(moment);
}
/** Positions where shear or loading changes, sorted and unique. */
export function beamBreakpoints(m: BeamModel): number[] {
  const points = [
    0,
    m.length,
    ...(m.supports ?? []),
    ...m.pointLoads.map((p) => p.position),
    ...m.spreadLoads.flatMap((w) => [w.start, w.end]),
  ];
  return [...new Set(points.map((p) => Number(p.toFixed(9))))].sort((a, b) => a - b);
}
/** Largest bending moment by magnitude and where it occurs, including zero-shear points. */
export function beamMaxMoment(m: BeamModel): { position: number; value: number } {
  const marks = beamBreakpoints(m);
  const candidates = [...marks];
  for (let i = 1; i < marks.length; i++) {
    const a = marks[i - 1]!,
      b = marks[i]!;
    const va = beamShear(m, a, "right"),
      vb = beamShear(m, b, "left");
    if (va * vb < 0) candidates.push(a + (va / (va - vb)) * (b - a));
  }
  let best = { position: 0, value: 0 };
  for (const x of candidates) {
    const value = beamMoment(m, x);
    if (Math.abs(value) > Math.abs(best.value) + 1e-9) best = { position: x, value };
  }
  return best;
}

// ---------------------------------------------------------------------------
// Trusses: the method of joints, solved as one linear system
// ---------------------------------------------------------------------------

export interface TrussSolution {
  /** Member forces, kN, tension positive, in member order. */
  members: Array<{ name: string; force: number; length: number }>;
  pin: { x: number; y: number };
  roller: number;
}
function solveLinear(a: number[][], b: number[]): number[] {
  const n = b.length,
    m = a.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++)
      if (Math.abs(m[r]![col]!) > Math.abs(m[pivot]![col]!)) pivot = r;
    if (Math.abs(m[pivot]![col]!) < 1e-10) throw new Error("The truss is a mechanism.");
    [m[col], m[pivot]] = [m[pivot]!, m[col]!];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = m[r]![col]! / m[col]![col]!;
      for (let c = col; c <= n; c++) m[r]![c]! -= factor * m[col]![c]!;
    }
  }
  return m.map((row, i) => row[n]! / row[i]!);
}
export function solveTruss(m: TrussModel): TrussSolution {
  const index = new Map(m.nodes.map((n, i) => [n.id, i]));
  const unknowns = m.members.length + 3,
    rows = 2 * m.nodes.length;
  const a = Array.from({ length: rows }, () => Array<number>(unknowns).fill(0));
  const b = Array<number>(rows).fill(0);
  m.members.forEach(([p, q], j) => {
    const i = index.get(p)!,
      k = index.get(q)!;
    const P = m.nodes[i]!,
      Q = m.nodes[k]!;
    const L = Math.hypot(Q.x - P.x, Q.y - P.y),
      ux = (Q.x - P.x) / L,
      uy = (Q.y - P.y) / L;
    // A tension member pulls each joint toward the other end.
    a[2 * i]![j] = ux;
    a[2 * i + 1]![j] = uy;
    a[2 * k]![j] = -ux;
    a[2 * k + 1]![j] = -uy;
  });
  const pin = index.get(m.pin)!,
    roller = index.get(m.roller)!;
  a[2 * pin]![m.members.length] = 1;
  a[2 * pin + 1]![m.members.length + 1] = 1;
  a[2 * roller + 1]![m.members.length + 2] = 1;
  for (const load of m.loads) {
    const i = index.get(load.node)!;
    b[2 * i]! -= load.fx;
    b[2 * i + 1]! -= load.fy;
  }
  const x = solveLinear(a, b);
  return {
    members: m.members.map(([p, q], j) => {
      const P = m.nodes[index.get(p)!]!,
        Q = m.nodes[index.get(q)!]!;
      return { name: p + q, force: clean(x[j]!), length: Math.hypot(Q.x - P.x, Q.y - P.y) };
    }),
    pin: { x: clean(x[m.members.length]!), y: clean(x[m.members.length + 1]!) },
    roller: clean(x[m.members.length + 2]!),
  };
}

// ---------------------------------------------------------------------------
// Axial stress and strain
// ---------------------------------------------------------------------------

/** Stress in MPa (N/mm²), strain, elongation in mm and the factor of safety against yield. */
export function axial(m: StressStrainModel) {
  const stress = (m.load * 1000) / m.area;
  const elastic = stress <= m.yieldStress;
  const strain = stress / (m.modulus * 1000);
  return {
    stress,
    strain,
    elongation: strain * m.length,
    factorOfSafety: stress === 0 ? Number.POSITIVE_INFINITY : m.yieldStress / stress,
    state: stress > m.ultimateStress ? "fracture" : elastic ? "elastic" : "plastic",
  } as const;
}
/**
 * An idealised engineering stress–strain curve: linear to yield, a short yield plateau, then
 * smooth strain hardening to the ultimate strength and a little necking before fracture.
 * Illustrative beyond yield; only the elastic slope and the two strengths are given values.
 */
export function stressStrainCurve(m: StressStrainModel): Array<{ strain: number; stress: number }> {
  const E = m.modulus * 1000,
    ey = m.yieldStress / E;
  const plateau = ey + 0.01,
    peak = Math.max(0.12, plateau + 0.08),
    end = peak + 0.05;
  const points = [
    { strain: 0, stress: 0 },
    { strain: ey, stress: m.yieldStress },
    { strain: plateau, stress: m.yieldStress },
  ];
  for (let i = 1; i <= 16; i++) {
    const t = i / 16;
    points.push({
      strain: plateau + (peak - plateau) * t,
      stress: m.yieldStress + (m.ultimateStress - m.yieldStress) * Math.sin((t * Math.PI) / 2),
    });
  }
  for (let i = 1; i <= 6; i++) {
    const t = i / 6;
    points.push({
      strain: peak + (end - peak) * t,
      stress: m.ultimateStress - (m.ultimateStress - m.yieldStress) * 0.35 * t * t,
    });
  }
  return points;
}

// ---------------------------------------------------------------------------
// Bending of a section
// ---------------------------------------------------------------------------

/** Area (mm²), second moment about the horizontal centroidal axis (mm⁴) and bending stress. */
export function sectionProperties(m: SectionModel) {
  const { width: b, depth: h } = m;
  let area = b * h,
    I = (b * h ** 3) / 12;
  if (m.shape === "i_beam") {
    const tf = m.flange!,
      tw = m.web!,
      inner = h - 2 * tf;
    area = 2 * b * tf + tw * inner;
    I = (b * h ** 3 - (b - tw) * inner ** 3) / 12;
  }
  const y = h / 2;
  const stress = (m.moment * 1e6 * y) / I;
  return { area, secondMoment: I, extremeFibre: y, stress, sectionModulus: I / y };
}
/** Bending stress, MPa, at height y (mm) above the neutral axis; tension below for sagging. */
export function bendingStressAt(m: SectionModel, y: number): number {
  return clean((-m.moment * 1e6 * y) / sectionProperties(m).secondMoment);
}

// ---------------------------------------------------------------------------
// Cantilever deflection
// ---------------------------------------------------------------------------

/**
 * Tip deflection of an end-loaded cantilever, δ = PL³/3EI. With P in kN, L in m, E in GPa and
 * I in 10⁶ mm⁴ (10⁻⁶ m⁴) the factors of a thousand cancel, so δ comes out in metres.
 */
export function cantileverDeflection(m: CantileverModel) {
  const tip = (m.load * m.length ** 3) / (3 * m.modulus * m.secondMoment);
  return {
    tipMetres: tip,
    tipMillimetres: tip * 1000,
    /** Tip stiffness k = P/δ = 3EI/L³, kN/m. */
    stiffness: (3 * m.modulus * m.secondMoment) / m.length ** 3,
    wallMoment: m.load * m.length,
  };
}
/** Deflected shape y(x) = Px²(3L − x)/6EI, in metres, downward positive. */
export function cantileverShape(m: CantileverModel, x: number): number {
  const s = Math.max(0, Math.min(m.length, x));
  return (m.load * s * s * (3 * m.length - s)) / (6 * m.modulus * m.secondMoment);
}

// ---------------------------------------------------------------------------
// Machines
// ---------------------------------------------------------------------------

export function leverResult(m: LeverModel) {
  return {
    mechanicalAdvantage: m.effortArm / m.loadArm,
    effort: (m.load * m.loadArm) / m.effortArm,
    /** Distance the effort moves per metre the load moves. */
    velocityRatio: m.effortArm / m.loadArm,
  };
}
export function pulleyResult(m: PulleyModel) {
  const effort = m.load / (m.strands * m.efficiency);
  return {
    idealAdvantage: m.strands,
    actualAdvantage: m.strands * m.efficiency,
    effort,
    ropePulled: m.strands * m.lift,
    usefulWork: m.load * m.lift,
    inputWork: effort * m.strands * m.lift,
    usefulPower: m.liftSpeed === undefined ? undefined : m.load * m.liftSpeed,
    inputPower: m.liftSpeed === undefined ? undefined : (m.load * m.liftSpeed) / m.efficiency,
  };
}
/**
 * A gear train. Speed falls by driven/driver at each mesh; torque rises by the same ratio times
 * the mesh efficiency. An idler adds a mesh (and its loss) but cancels out of the ratio. Each
 * external mesh reverses direction.
 */
export function gearResult(m: GearsModel) {
  const ratio = m.stages.reduce((r, s) => (r * s.driven) / s.driver, 1);
  const meshes = m.stages.length + (m.idler === undefined ? 0 : 1);
  const efficiency = m.efficiency ** meshes;
  const outputSpeed = m.inputSpeed / ratio;
  const outputTorque = m.inputTorque * ratio * efficiency;
  const omega = (rpm: number) => (rpm * 2 * Math.PI) / 60;
  return {
    ratio,
    meshes,
    efficiency,
    outputSpeed,
    outputTorque,
    /** +1 when output turns the same way as input. */
    direction: meshes % 2 === 0 ? 1 : -1,
    inputPower: m.inputTorque * omega(m.inputSpeed),
    outputPower: outputTorque * omega(outputSpeed),
  };
}
/** Speed of each wheel in drawing order, rpm, signed by direction relative to the input. */
export function gearWheelSpeeds(
  m: GearsModel,
): Array<{ teeth: number; rpm: number; shaft: number }> {
  const wheels: Array<{ teeth: number; rpm: number; shaft: number }> = [];
  const first = m.stages[0]!;
  wheels.push({ teeth: first.driver, rpm: m.inputSpeed, shaft: 0 });
  if (m.idler !== undefined) {
    wheels.push({ teeth: m.idler, rpm: (-m.inputSpeed * first.driver) / m.idler, shaft: 1 });
    wheels.push({
      teeth: first.driven,
      rpm: (m.inputSpeed * first.driver) / first.driven,
      shaft: 2,
    });
    return wheels;
  }
  let speed = m.inputSpeed;
  m.stages.forEach((stage, i) => {
    speed = (-speed * stage.driver) / stage.driven;
    if (i > 0) wheels.push({ teeth: stage.driver, rpm: wheels[wheels.length - 1]!.rpm, shaft: i });
    wheels.push({ teeth: stage.driven, rpm: speed, shaft: i + 1 });
  });
  return wheels;
}

// ---------------------------------------------------------------------------
// Plain-language givens and worked measures
// ---------------------------------------------------------------------------

function direction(f: ConcurrentModel["forces"][number]) {
  if (f.slope)
    return "along a slope of " + fmt(f.slope.rise) + " up for " + fmt(f.slope.run) + " across";
  return "at " + fmt(f.angle) + "° anticlockwise from the positive x-axis";
}
/** The given values, one statement each, for screen readers, tutors and check drawings. */
export function engineeringGivenList(m: EngineeringModel): string[] {
  switch (m.kind) {
    case "concurrent":
      return m.forces.map(
        (f) => f.label + ": " + fmt(f.magnitude) + " " + m.unit + " " + direction(f),
      );
    case "moment":
      return [
        "Pivot at x = 0 m on a horizontal bar",
        ...m.forces.map(
          (f) =>
            f.label +
            ": " +
            fmt(f.magnitude) +
            " " +
            m.unit +
            " at x = " +
            fmt(f.position) +
            " m, " +
            fmt(f.angle) +
            "° anticlockwise from the bar",
        ),
      ];
    case "beam": {
      const out = [
        m.support === "cantilever"
          ? "Cantilever " + fmt(m.length) + " m long, fixed at x = 0 m"
          : "Beam " +
            fmt(m.length) +
            " m long, pin at x = " +
            fmt(m.supports![0]) +
            " m, roller at x = " +
            fmt(m.supports![1]) +
            " m",
      ];
      for (const p of m.pointLoads)
        out.push("Point load " + fmt(p.magnitude) + " kN down at x = " + fmt(p.position) + " m");
      for (const w of m.spreadLoads)
        out.push(
          "Uniform load " +
            fmt(w.intensity) +
            " kN/m from x = " +
            fmt(w.start) +
            " m to x = " +
            fmt(w.end) +
            " m",
        );
      return out;
    }
    case "truss":
      return [
        "Joints: " +
          m.nodes.map((n) => n.id + " (" + fmt(n.x) + ", " + fmt(n.y) + ") m").join(", "),
        "Members: " + m.members.map(([a, b]) => a + b).join(", "),
        "Pin at " + m.pin + ", roller at " + m.roller,
        ...m.loads.map((l) => {
          const parts = [];
          if (l.fy) parts.push(fmt(Math.abs(l.fy)) + " kN " + (l.fy < 0 ? "down" : "up"));
          if (l.fx) parts.push(fmt(Math.abs(l.fx)) + " kN " + (l.fx < 0 ? "left" : "right"));
          return "Load at " + l.node + ": " + parts.join(" and ");
        }),
      ];
    case "stress_strain":
      return [
        m.material +
          ": E = " +
          fmt(m.modulus) +
          " GPa, yield " +
          fmt(m.yieldStress) +
          " MPa, ultimate " +
          fmt(m.ultimateStress) +
          " MPa",
        "Bar " + fmt(m.length) + " mm long, area " + fmt(m.area) + " mm²",
        "Axial tension " + fmt(m.load) + " kN",
      ];
    case "section":
      return [
        m.shape === "rectangle"
          ? "Solid rectangle " + fmt(m.width) + " mm wide and " + fmt(m.depth) + " mm deep"
          : "I-section " +
            fmt(m.width) +
            " mm wide and " +
            fmt(m.depth) +
            " mm deep, flanges " +
            fmt(m.flange!) +
            " mm thick, web " +
            fmt(m.web!) +
            " mm thick",
        "Bending moment " + fmt(m.moment) + " kN·m about the horizontal axis",
      ];
    case "cantilever":
      return [
        "Cantilever " + fmt(m.length) + " m long with a " + fmt(m.load) + " kN load at its tip",
        "E = " + fmt(m.modulus) + " GPa, I = " + fmt(m.secondMoment) + " × 10⁶ mm⁴",
      ];
    case "lever":
      return [
        {
          first: "First-class lever: fulcrum between effort and load",
          second: "Second-class lever: load between fulcrum and effort",
          third: "Third-class lever: effort between fulcrum and load",
        }[m.leverClass],
        "Effort arm " + fmt(m.effortArm) + " m, load arm " + fmt(m.loadArm) + " m",
        "Load " + fmt(m.load) + " N",
      ];
    case "pulley":
      return [
        fmt(m.strands) +
          " rope strand" +
          (m.strands === 1 ? "" : "s") +
          " support the moving block",
        "Load " + fmt(m.load) + " N raised " + fmt(m.lift) + " m",
        "Efficiency " +
          fmt(m.efficiency * 100) +
          "%" +
          (m.liftSpeed === undefined ? "" : ", lifting at " + fmt(m.liftSpeed) + " m/s"),
      ];
    case "gears":
      return [
        m.stages
          .map(
            (s, i) =>
              (i ? "then on the same shaft " : "") +
              fmt(s.driver) +
              " teeth driving " +
              fmt(s.driven) +
              " teeth",
          )
          .join(", ") +
          (m.idler === undefined ? "" : " through a " + fmt(m.idler) + "-tooth idler"),
        "Input " + fmt(m.inputSpeed) + " rpm at " + fmt(m.inputTorque) + " N·m",
        "Each mesh " + fmt(m.efficiency * 100) + "% efficient",
      ];
  }
}
export function engineeringGivens(m: EngineeringModel): string {
  return engineeringGivenList(m).join(". ") + ".";
}

/** Worked results for the whole case, shown only after the learner has answered. */
export function engineeringMeasures(m: EngineeringModel): Array<{ label: string; value: string }> {
  switch (m.kind) {
    case "concurrent": {
      const r = resultant(m);
      return [
        { label: "Sum of x-components", value: fmt(r.x, 2) + " " + m.unit },
        { label: "Sum of y-components", value: fmt(r.y, 2) + " " + m.unit },
        {
          label: "Resultant",
          value:
            fmt(r.magnitude, 2) +
            " " +
            m.unit +
            (r.magnitude ? " at " + fmt(r.angle, 1) + "°" : ""),
        },
      ];
    }
    case "moment": {
      const unit = m.unit + "·m";
      return [
        ...barMoments(m).map((f) => ({
          label: "Moment of " + f.label,
          value: fmt(f.moment, 2) + " " + unit,
        })),
        { label: "Net moment (anticlockwise +)", value: fmt(netMoment(m), 2) + " " + unit },
      ];
    }
    case "beam": {
      const r = beamReactions(m),
        max = beamMaxMoment(m);
      return [
        ...r.forces.map((f, i) => ({
          label:
            m.support === "cantilever" ? "Wall reaction" : i ? "Roller reaction" : "Pin reaction",
          value: fmt(f.value, 2) + " kN up",
        })),
        ...(m.support === "cantilever"
          ? [{ label: "Wall moment", value: fmt(r.wallMoment, 2) + " kN·m" }]
          : []),
        {
          label: "Largest bending moment",
          value: fmt(max.value, 2) + " kN·m at x = " + fmt(max.position, 2) + " m",
        },
      ];
    }
    case "truss": {
      const s = solveTruss(m);
      return s.members.map((f) => ({
        label: "Member " + f.name,
        value:
          f.force === 0
            ? "0 kN (zero-force)"
            : fmt(Math.abs(f.force), 2) + " kN " + (f.force > 0 ? "tension" : "compression"),
      }));
    }
    case "stress_strain": {
      const a = axial(m);
      return [
        { label: "Stress", value: fmt(a.stress, 2) + " MPa" },
        { label: "Strain", value: fmt(a.strain, 6) },
        {
          label: a.state === "elastic" ? "Elongation" : "Elastic estimate of elongation",
          value: fmt(a.elongation, 3) + " mm",
        },
        { label: "Factor of safety against yield", value: fmt(a.factorOfSafety, 2) },
      ];
    }
    case "section": {
      const s = sectionProperties(m);
      return [
        { label: "Area", value: fmt(s.area, 0) + " mm²" },
        { label: "Second moment of area", value: fmt(s.secondMoment / 1e6, 3) + " × 10⁶ mm⁴" },
        { label: "Largest bending stress", value: fmt(s.stress, 2) + " MPa" },
      ];
    }
    case "cantilever": {
      const c = cantileverDeflection(m);
      return [
        { label: "Tip deflection", value: fmt(c.tipMillimetres, 2) + " mm" },
        { label: "Tip stiffness", value: fmt(c.stiffness, 2) + " kN/m" },
        { label: "Moment at the wall", value: fmt(c.wallMoment, 2) + " kN·m" },
      ];
    }
    case "lever": {
      const l = leverResult(m);
      return [
        { label: "Mechanical advantage", value: fmt(l.mechanicalAdvantage, 3) },
        { label: "Effort", value: fmt(l.effort, 2) + " N" },
      ];
    }
    case "pulley": {
      const p = pulleyResult(m);
      return [
        { label: "Effort", value: fmt(p.effort, 2) + " N" },
        { label: "Rope pulled", value: fmt(p.ropePulled, 2) + " m" },
        ...(p.inputPower === undefined
          ? []
          : [{ label: "Input power", value: fmt(p.inputPower, 1) + " W" }]),
      ];
    }
    case "gears": {
      const g = gearResult(m);
      return [
        { label: "Overall ratio", value: fmt(g.ratio, 3) + " : 1" },
        {
          label: "Output speed",
          value:
            fmt(g.outputSpeed, 2) +
            " rpm, " +
            (g.direction > 0 ? "same direction" : "opposite direction"),
        },
        { label: "Output torque", value: fmt(g.outputTorque, 2) + " N·m" },
        {
          label: "Power in → out",
          value: fmt(g.inputPower, 0) + " W → " + fmt(g.outputPower, 0) + " W",
        },
      ];
    }
  }
}
