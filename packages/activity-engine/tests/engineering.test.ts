import { describe, expect, it } from "vitest";
import { EngineeringModelSchema, type EngineeringModel } from "@discere/contracts";
import {
  axial,
  barMoments,
  beamMaxMoment,
  beamMoment,
  beamReactions,
  beamShear,
  bendingStressAt,
  cantileverDeflection,
  cantileverShape,
  engineeringGivenList,
  engineeringGivens,
  engineeringMeasures,
  forceComponents,
  gearResult,
  gearWheelSpeeds,
  leverResult,
  netMoment,
  pulleyResult,
  resultant,
  sectionProperties,
  solveTruss,
  stressStrainCurve,
  type BeamModel,
  type TrussModel,
} from "../src/index.js";

const parse = (m: unknown) => EngineeringModelSchema.parse(m);
const simple = (
  length: number,
  supports: [number, number],
  pointLoads: Array<[number, number]>,
  spreadLoads: Array<[number, number, number]> = [],
): BeamModel =>
  parse({
    kind: "beam",
    support: "simple",
    length,
    supports,
    pointLoads: pointLoads.map(([position, magnitude]) => ({ position, magnitude })),
    spreadLoads: spreadLoads.map(([start, end, intensity]) => ({ start, end, intensity })),
    display: "moment",
  }) as BeamModel;
const truss = (
  nodes: Array<[string, number, number]>,
  members: Array<[string, string]>,
  loads: Array<[string, number, number]>,
): TrussModel =>
  parse({
    kind: "truss",
    nodes: nodes.map(([id, x, y]) => ({ id, x, y })),
    members,
    pin: "A",
    roller: "B",
    loads: loads.map(([node, fx, fy]) => ({ node, fx, fy })),
  }) as TrussModel;

describe("forces and moments", () => {
  it("resolves angles and slope triangles into exact components", () => {
    const m = parse({
      kind: "concurrent",
      unit: "kN",
      forces: [
        { label: "F", magnitude: 10, angle: 30 },
        { label: "T", magnitude: 13, angle: 22.6, slope: { run: 12, rise: 5 } },
      ],
    });
    if (m.kind !== "concurrent") throw Error();
    const [a, b] = forceComponents(m);
    expect(a!.x).toBeCloseTo((10 * Math.sqrt(3)) / 2, 12);
    expect(a!.y).toBeCloseTo(5, 12);
    expect(b!.x).toBeCloseTo(12, 12);
    expect(b!.y).toBeCloseTo(5, 12);
  });
  it("closes the polygon for three forces in equilibrium", () => {
    const m = parse({
      kind: "concurrent",
      unit: "kN",
      forces: [
        { label: "A", magnitude: 6, angle: 0 },
        { label: "B", magnitude: 8, angle: 90 },
        { label: "C", magnitude: 10, angle: 180 + (Math.atan2(4, 3) * 180) / Math.PI },
      ],
    });
    if (m.kind !== "concurrent") throw Error();
    expect(resultant(m).magnitude).toBe(0);
    const two = { ...m, forces: m.forces.slice(0, 2) };
    expect(resultant(two).magnitude).toBeCloseTo(10, 12);
  });
  it("computes signed moments from the perpendicular distance", () => {
    const m = parse({
      kind: "moment",
      unit: "N",
      forces: [
        { label: "Left", position: -2, magnitude: 300, angle: 270 },
        { label: "Right", position: 1.5, magnitude: 400, angle: 270 },
      ],
    });
    if (m.kind !== "moment") throw Error();
    expect(barMoments(m).map((f) => f.moment)).toEqual([600, -600]);
    expect(netMoment(m)).toBe(0);
    const angled = parse({
      kind: "moment",
      unit: "N",
      forces: [{ label: "F", position: 0.3, magnitude: 150, angle: 30 }],
    });
    if (angled.kind !== "moment") throw Error();
    expect(barMoments(angled)[0]!.arm).toBeCloseTo(0.15, 12);
    expect(netMoment(angled)).toBeCloseTo(22.5, 12);
    const along = { ...angled, forces: [{ ...angled.forces[0]!, angle: 0 }] };
    expect(netMoment(along)).toBe(0);
  });
});

describe("beams", () => {
  it("satisfies vertical and moment equilibrium for every supported case", () => {
    const cases = [
      simple(6, [0, 6], [[2, 12]]),
      simple(6, [0, 4], [[6, 10]]),
      simple(6, [0, 6], [], [[0, 3, 4]]),
      simple(12, [0, 12], [[4, 30]], [[0, 12, 5]]),
    ];
    for (const m of cases) {
      const r = beamReactions(m);
      const up = r.forces.reduce((s, f) => s + f.value, 0);
      expect(up).toBeCloseTo(r.totalLoad, 9);
      const about0 =
        r.forces.reduce((s, f) => s + f.value * f.position, 0) -
        m.pointLoads.reduce((s, p) => s + p.magnitude * p.position, 0) -
        m.spreadLoads.reduce(
          (s, w) => s + w.intensity * (w.end - w.start) * ((w.start + w.end) / 2),
          0,
        );
      expect(about0).toBeCloseTo(0, 9);
      expect(beamMoment(m, m.length)).toBeCloseTo(0, 9);
      expect(beamMoment(m, 0)).toBeCloseTo(0, 9);
    }
    expect(beamReactions(cases[0]!).forces.map((f) => f.value)).toEqual([8, 4]);
    expect(beamReactions(cases[1]!).forces.map((f) => f.value)).toEqual([-5, 15]);
    expect(beamReactions(cases[3]!).forces[0]!.value).toBeCloseTo(50, 12);
  });
  it("jumps shear by a point load and peaks the moment where shear crosses zero", () => {
    const m = simple(6, [0, 6], [[2, 12]]);
    expect(beamShear(m, 2, "left")).toBe(8);
    expect(beamShear(m, 2, "right")).toBe(-4);
    expect(beamMoment(m, 2)).toBe(16);
    expect(beamMaxMoment(m)).toEqual({ position: 2, value: 16 });
    const udl = simple(8, [0, 8], [], [[0, 8, 3]]);
    expect(beamMaxMoment(udl).value).toBeCloseTo((3 * 64) / 8, 9);
    expect(beamMaxMoment(udl).position).toBeCloseTo(4, 9);
    const mixed = simple(8, [0, 8], [[2, 10]], [[0, 8, 2]]);
    const peak = beamMaxMoment(mixed);
    for (let x = 0; x <= 8; x += 0.01)
      expect(beamMoment(mixed, x)).toBeLessThanOrEqual(peak.value + 1e-9);
    // dM/dx = V between loads.
    for (const x of [1, 3.3, 5.5, 7.2]) {
      const h = 1e-5;
      expect((beamMoment(mixed, x + h) - beamMoment(mixed, x - h)) / (2 * h)).toBeCloseTo(
        beamShear(mixed, x),
        4,
      );
    }
  });
  it("gives a cantilever its wall reaction and hogging moment", () => {
    const m = parse({
      kind: "beam",
      support: "cantilever",
      length: 4,
      pointLoads: [],
      spreadLoads: [{ start: 0, end: 4, intensity: 2 }],
      display: "moment",
    }) as BeamModel;
    const r = beamReactions(m);
    expect(r.forces[0]!.value).toBe(8);
    expect(r.wallMoment).toBe(16);
    expect(beamMoment(m, 1e-9)).toBeCloseTo(-16, 6);
    expect(beamMoment(m, 4)).toBeCloseTo(0, 9);
    expect(beamMaxMoment(m).value).toBeCloseTo(-16, 9);
  });
});

describe("trusses", () => {
  it("solves the triangle by joints with compression struts and a tension tie", () => {
    const s = solveTruss(
      truss(
        [
          ["A", 0, 0],
          ["B", 4, 0],
          ["C", 2, 1.5],
        ],
        [
          ["A", "C"],
          ["B", "C"],
          ["A", "B"],
        ],
        [["C", 0, -12]],
      ),
    );
    expect(s.members.map((m) => m.force)).toEqual([-10, -10, 8].map((v) => expect.closeTo(v, 9)));
    expect(s.pin.y).toBeCloseTo(6, 9);
    expect(s.roller).toBeCloseTo(6, 9);
    expect(s.pin.x).toBeCloseTo(0, 9);
  });
  it("finds zero-force members and the Warren top chord", () => {
    const king = truss(
      [
        ["A", 0, 0],
        ["B", 4, 0],
        ["C", 2, 1.5],
        ["D", 2, 0],
      ],
      [
        ["A", "C"],
        ["B", "C"],
        ["A", "D"],
        ["D", "B"],
        ["D", "C"],
      ],
      [["C", 0, -12]],
    );
    expect(solveTruss(king).members.find((m) => m.name === "DC")!.force).toBe(0);
    const atD = { ...king, loads: [{ node: "D", fx: 0, fy: -9 }] };
    expect(solveTruss(atD).members.find((m) => m.name === "DC")!.force).toBeCloseTo(9, 9);
    const w = truss(
      [
        ["A", 0, 0],
        ["D", 3, 0],
        ["B", 6, 0],
        ["C", 1.5, 2],
        ["E", 4.5, 2],
      ],
      [
        ["A", "D"],
        ["D", "B"],
        ["A", "C"],
        ["C", "D"],
        ["D", "E"],
        ["E", "B"],
        ["C", "E"],
      ],
      [["D", 0, -16]],
    );
    const forces = Object.fromEntries(solveTruss(w).members.map((m) => [m.name, m.force]));
    expect(forces["CE"]).toBeCloseTo(-12, 9);
    expect(forces["AC"]).toBeCloseTo(-10, 9);
    expect(forces["CD"]).toBeCloseTo(10, 9);
  });
  it("leaves every joint in equilibrium", () => {
    const w = truss(
      [
        ["A", 0, 0],
        ["D", 3, 0],
        ["B", 6, 0],
        ["C", 1.5, 2],
        ["E", 4.5, 2],
      ],
      [
        ["A", "D"],
        ["D", "B"],
        ["A", "C"],
        ["C", "D"],
        ["D", "E"],
        ["E", "B"],
        ["C", "E"],
      ],
      [
        ["D", 5, -16],
        ["E", 0, -4],
      ],
    );
    const s = solveTruss(w);
    for (const node of w.nodes) {
      let fx = 0,
        fy = 0;
      w.members.forEach(([a, b], j) => {
        if (a !== node.id && b !== node.id) return;
        const other = w.nodes.find((n) => n.id === (a === node.id ? b : a))!;
        const L = Math.hypot(other.x - node.x, other.y - node.y);
        fx += (s.members[j]!.force * (other.x - node.x)) / L;
        fy += (s.members[j]!.force * (other.y - node.y)) / L;
      });
      for (const l of w.loads.filter((l) => l.node === node.id)) {
        fx += l.fx;
        fy += l.fy;
      }
      if (node.id === "A") {
        fx += s.pin.x;
        fy += s.pin.y;
      }
      if (node.id === "B") fy += s.roller;
      expect(fx).toBeCloseTo(0, 9);
      expect(fy).toBeCloseTo(0, 9);
    }
  });
  it("rejects a truss that is not statically determinate", () => {
    expect(
      EngineeringModelSchema.safeParse({
        kind: "truss",
        nodes: [
          { id: "A", x: 0, y: 0 },
          { id: "B", x: 4, y: 0 },
          { id: "C", x: 2, y: 2 },
        ],
        members: [
          ["A", "C"],
          ["B", "C"],
        ],
        pin: "A",
        roller: "B",
        loads: [{ node: "C", fx: 0, fy: -1 }],
      }).success,
    ).toBe(false);
  });
});

describe("materials and sections", () => {
  const bar = (load: number, area = 400, length = 2000): EngineeringModel =>
    parse({
      kind: "stress_strain",
      material: "Steel",
      modulus: 200,
      yieldStress: 250,
      ultimateStress: 400,
      area,
      length,
      load,
    });
  it("turns load into stress, strain, stretch and a factor of safety", () => {
    const m = bar(20);
    if (m.kind !== "stress_strain") throw Error();
    const a = axial(m);
    expect(a.stress).toBe(50);
    expect(a.strain).toBeCloseTo(0.00025, 15);
    expect(a.elongation).toBeCloseTo(0.5, 12);
    expect(a.factorOfSafety).toBe(5);
    expect(a.state).toBe("elastic");
    const over = bar(120);
    if (over.kind !== "stress_strain") throw Error();
    expect(axial(over).state).toBe("plastic");
  });
  it("draws a curve with the elastic slope and both strengths", () => {
    const m = bar(20);
    if (m.kind !== "stress_strain") throw Error();
    const c = stressStrainCurve(m);
    expect(c[1]!.stress / c[1]!.strain).toBeCloseTo(200000, 6);
    expect(Math.max(...c.map((p) => p.stress))).toBeCloseTo(400, 9);
    c.slice(1).forEach((p, i) => expect(p.strain).toBeGreaterThan(c[i]!.strain));
  });
  it("computes I for rectangles and I-sections and stress linear in depth", () => {
    const r = parse({ kind: "section", shape: "rectangle", width: 100, depth: 200, moment: 20 });
    const i = parse({
      kind: "section",
      shape: "i_beam",
      width: 100,
      depth: 200,
      flange: 10,
      web: 6,
      moment: 20,
    });
    if (r.kind !== "section" || i.kind !== "section") throw Error();
    expect(sectionProperties(r).secondMoment).toBeCloseTo((100 * 200 ** 3) / 12, 6);
    expect(sectionProperties(r).stress).toBeCloseTo(30, 9);
    // Parallel-axis check on the I-section: flanges plus web.
    const flange = (100 * 10 ** 3) / 12 + 100 * 10 * 95 ** 2;
    const web = (6 * 180 ** 3) / 12;
    expect(sectionProperties(i).secondMoment).toBeCloseTo(2 * flange + web, 6);
    expect(sectionProperties(i).area).toBe(3080);
    expect(bendingStressAt(r, 0)).toBe(0);
    expect(bendingStressAt(r, 50)).toBeCloseTo(-15, 9);
    expect(bendingStressAt(r, -100)).toBeCloseTo(30, 9);
  });
  it("deflects a cantilever by PL³/3EI along a consistent curve", () => {
    const m = parse({ kind: "cantilever", length: 2, load: 3, modulus: 200, secondMoment: 2 });
    if (m.kind !== "cantilever") throw Error();
    const c = cantileverDeflection(m);
    expect(c.tipMillimetres).toBeCloseTo(20, 9);
    expect(c.stiffness).toBeCloseTo(150, 9);
    expect(cantileverShape(m, 2)).toBeCloseTo(c.tipMetres, 12);
    expect(cantileverShape(m, 0)).toBe(0);
    const longer = { ...m, length: 4 };
    expect(cantileverDeflection(longer).tipMetres / c.tipMetres).toBeCloseTo(8, 9);
  });
});

describe("machines", () => {
  it("balances lever moments and conserves work in an ideal pulley", () => {
    const l = parse({
      kind: "lever",
      leverClass: "first",
      effortArm: 1.2,
      loadArm: 0.2,
      load: 900,
    });
    if (l.kind !== "lever") throw Error();
    expect(leverResult(l).effort * 1.2).toBeCloseTo(900 * 0.2, 9);
    expect(leverResult(l).mechanicalAdvantage).toBeCloseTo(6, 12);
    const p = parse({ kind: "pulley", strands: 4, load: 800, lift: 0.5, efficiency: 1 });
    if (p.kind !== "pulley") throw Error();
    const r = pulleyResult(p);
    expect(r.effort).toBe(200);
    expect(r.ropePulled).toBe(2);
    expect(r.inputWork).toBeCloseTo(r.usefulWork, 9);
    const lossy = parse({
      kind: "pulley",
      strands: 4,
      load: 2000,
      lift: 2,
      efficiency: 0.8,
      liftSpeed: 0.5,
    });
    if (lossy.kind !== "pulley") throw Error();
    expect(pulleyResult(lossy).inputPower).toBeCloseTo(1250, 9);
  });
  it("rejects a third-class lever with the effort outside the load", () => {
    expect(
      EngineeringModelSchema.safeParse({
        kind: "lever",
        leverClass: "third",
        effortArm: 1,
        loadArm: 0.2,
        load: 5,
      }).success,
    ).toBe(false);
  });
  it("multiplies ratios, cancels idlers and conserves ideal power", () => {
    const simpleTrain = parse({
      kind: "gears",
      stages: [{ driver: 20, driven: 60 }],
      inputSpeed: 1200,
      inputTorque: 10,
      efficiency: 1,
    });
    const idler = parse({
      kind: "gears",
      stages: [{ driver: 20, driven: 60 }],
      idler: 35,
      inputSpeed: 1200,
      inputTorque: 10,
      efficiency: 1,
    });
    const compound = parse({
      kind: "gears",
      stages: [
        { driver: 15, driven: 45 },
        { driver: 20, driven: 60 },
      ],
      inputSpeed: 1800,
      inputTorque: 5,
      efficiency: 0.95,
    });
    if (simpleTrain.kind !== "gears" || idler.kind !== "gears" || compound.kind !== "gears")
      throw Error();
    const a = gearResult(simpleTrain);
    expect(a.outputSpeed).toBe(400);
    expect(a.outputTorque).toBe(30);
    expect(a.direction).toBe(-1);
    expect(a.outputPower).toBeCloseTo(a.inputPower, 9);
    expect(gearResult(idler).outputSpeed).toBeCloseTo(400, 9);
    expect(gearResult(idler).direction).toBe(1);
    const c = gearResult(compound);
    expect(c.ratio).toBe(9);
    expect(c.outputSpeed).toBe(200);
    expect(c.efficiency).toBeCloseTo(0.9025, 12);
    expect(c.outputPower / c.inputPower).toBeCloseTo(0.9025, 12);
    // Meshing wheels share pitch-line speed: |rpm| × teeth is equal across each mesh.
    const wheels = gearWheelSpeeds(compound);
    expect(Math.abs(wheels[0]!.rpm * wheels[0]!.teeth)).toBeCloseTo(
      Math.abs(wheels[1]!.rpm * wheels[1]!.teeth),
      9,
    );
    expect(wheels[2]!.rpm).toBe(wheels[1]!.rpm);
    expect(Math.abs(wheels[3]!.rpm)).toBeCloseTo(200, 9);
  });
});

describe("plain-language givens", () => {
  it("states givens without results and keeps results to the measures", () => {
    const m = simple(6, [0, 6], [[2, 12]]);
    expect(engineeringGivens(m)).toBe(
      "Beam 6 m long, pin at x = 0 m, roller at x = 6 m. Point load 12 kN down at x = 2 m.",
    );
    expect(engineeringGivenList(m).join(" ")).not.toMatch(/8 kN|4 kN|16/u);
    expect(engineeringMeasures(m).map((x) => x.value)).toContain("8 kN up");
  });
});
