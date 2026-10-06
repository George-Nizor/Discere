import { describe, expect, it } from "vitest";
import {
  GeometryShapeSchema,
  GeometryDiagramSchema,
  CourseCheckVisualSchema,
  type GeometryShape,
} from "@discere/contracts";
import { geometryVertices, geometryMeasures, geometryUnitScale } from "../src/geometry.js";
const shoelace = (s: GeometryShape) => {
  const p = geometryVertices(s);
  return (
    Math.abs(
      p.reduce((sum, a, i) => {
        const b = p[(i + 1) % p.length]!;
        return sum + a.x * b.y - b.x * a.y;
      }, 0),
    ) / 2
  );
};
describe("exact geometry drawings", () => {
  it.each([
    [{ kind: "rectangle", width: 7, height: 3 }, 21],
    [{ kind: "triangle", base: 8, height: 5, offset: 0.9 }, 20],
    [{ kind: "parallelogram", base: 8, height: 5, offset: 0.6 }, 40],
    [{ kind: "trapezoid", bottom: 10, top: 6, height: 4 }, 32],
    [{ kind: "composite", width: 9, height: 7, cutWidth: 3, cutHeight: 2 }, 57],
  ] as [GeometryShape, number][])("matches polygon coordinates to area for %j", (shape, area) => {
    expect(shoelace(shape)).toBeCloseTo(area, 10);
    expect(
      Number(
        geometryMeasures(shape).find((m) => m.label.includes("Area") || m.label.includes("area"))!
          .value,
      ),
    ).toBeCloseTo(area, 10);
  });
  it.each([
    [48, 67],
    [90, 32],
    [68, 68],
    [31, 93],
    [130, 25],
  ])("draws stated triangle angles %s and %s", (a, b) => {
    const p = geometryVertices({ kind: "triangle_angles", a, b });
    const angle = (i: number) => {
      const v = p[i]!,
        u = p[(i + 1) % 3]!,
        w = p[(i + 2) % 3]!;
      return (
        (Math.acos(
          ((u.x - v.x) * (w.x - v.x) + (u.y - v.y) * (w.y - v.y)) /
            (Math.hypot(u.x - v.x, u.y - v.y) * Math.hypot(w.x - v.x, w.y - v.y)),
        ) *
          180) /
        Math.PI
      );
    };
    expect(angle(0)).toBeCloseTo(a, 9);
    expect(angle(1)).toBeCloseTo(b, 9);
    expect(angle(2)).toBeCloseTo(180 - a - b, 9);
  });
  it("keeps comparison cases at one unit scale", () => {
    const s = geometryUnitScale([
      { kind: "rectangle", width: 6, height: 4 },
      { kind: "rectangle", width: 8, height: 2 },
    ])!;
    expect(s * 8).toBeLessThanOrEqual(365);
    expect(s * 4).toBeLessThanOrEqual(185);
    expect((s * 6 * s * 4) / (s * 8 * s * 2)).toBeCloseTo(24 / 16, 10);
    expect(
      geometryUnitScale([
        { kind: "circle", radius: 3 },
        { kind: "circle", radius: 6 },
      ]),
    ).toBeCloseTo(185 / 12);
  });
  it("rejects degenerate, misleading and answer-bearing drawings", () => {
    const invalid = [
      { kind: "triangle_angles", a: 90, b: 90 },
      { kind: "angle", degrees: 95, total: 90 },
      { kind: "rectangle", width: -3, height: 4 },
      { kind: "composite", width: 5, height: 4, cutWidth: 5, cutHeight: 2 },
      { kind: "circle", radius: 2, value: 12.56 },
      { kind: "distance", x1: 0, y1: 0, x2: 0, y2: 3 },
    ];
    for (const shape of invalid) {
      expect(GeometryShapeSchema.safeParse(shape).success).toBe(false);
      expect(CourseCheckVisualSchema.safeParse({ type: "geometry", shape }).success).toBe(false);
    }
    expect(
      GeometryDiagramSchema.safeParse({
        type: "geometry_explorer",
        cases: [
          { id: "a", label: "First", shape: { kind: "circle", radius: 2 } },
          { id: "a", label: "Second", shape: { kind: "circle", radius: 3 } },
        ],
        initialCaseId: "missing",
      }).success,
    ).toBe(false);
  });
});
