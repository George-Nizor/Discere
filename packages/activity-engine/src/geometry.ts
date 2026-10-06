import type { GeometryShape } from "@discere/contracts";
export type GeometryPoint = { x: number; y: number };
/** Exact vertices in mathematical coordinates, before viewport fitting. */
export function geometryVertices(shape: GeometryShape): GeometryPoint[] {
  const p = (x: number, y: number) => ({ x, y });
  switch (shape.kind) {
    case "rectangle":
      return [p(0, 0), p(shape.width, 0), p(shape.width, shape.height), p(0, shape.height)];
    case "triangle":
      return [p(0, 0), p(shape.base, 0), p(shape.offset * shape.base, shape.height)];
    case "parallelogram": {
      const shift = shape.offset * shape.base;
      return [
        p(0, 0),
        p(shape.base, 0),
        p(shape.base + shift, shape.height),
        p(shift, shape.height),
      ];
    }
    case "trapezoid": {
      const shift = (shape.bottom - shape.top) / 2;
      return [
        p(0, 0),
        p(shape.bottom, 0),
        p(shift + shape.top, shape.height),
        p(shift, shape.height),
      ];
    }
    case "composite":
      return [
        p(0, 0),
        p(shape.width, 0),
        p(shape.width, shape.height - shape.cutHeight),
        p(shape.width - shape.cutWidth, shape.height - shape.cutHeight),
        p(shape.width - shape.cutWidth, shape.height),
        p(0, shape.height),
      ];
    case "right_triangle":
      return [p(0, 0), p(shape.a, 0), p(0, shape.b)];
    case "distance":
      return [p(shape.x1, shape.y1), p(shape.x2, shape.y1), p(shape.x2, shape.y2)];
    case "triangle_angles": {
      const a = (shape.a * Math.PI) / 180,
        b = (shape.b * Math.PI) / 180;
      const side = Math.sin(b) / Math.sin(a + b);
      return [p(0, 0), p(1, 0), p(side * Math.cos(a), side * Math.sin(a))];
    }
    default:
      return [];
  }
}
const display = (v: number) => Number(v.toFixed(3)).toString();
/** Explanatory measurements, displayed only after an assessed teaching response. */
export function geometryMeasures(s: GeometryShape): Array<{ label: string; value: string }> {
  const m = (label: string, value: number | string) => ({
    label,
    value: typeof value === "number" ? display(value) : value,
  });
  switch (s.kind) {
    case "angle":
      return [m("Remaining turn", s.total - s.degrees + "°")];
    case "triangle_angles":
      return [m("Third angle", 180 - s.a - s.b + "°")];
    case "rectangle":
      return [m("Perimeter", 2 * (s.width + s.height)), m("Area", s.width * s.height)];
    case "triangle":
      return [m("Area", (s.base * s.height) / 2)];
    case "parallelogram":
      return [m("Area", s.base * s.height)];
    case "trapezoid":
      return [m("Area", ((s.top + s.bottom) * s.height) / 2)];
    case "composite":
      return [m("Remaining area", s.width * s.height - s.cutWidth * s.cutHeight)];
    case "circle":
      return [
        m("Circumference", display(2 * s.radius) + "π"),
        m("Area", display(s.radius * s.radius) + "π"),
      ];
    case "similarity":
      return [m("Length factor", s.factor), m("Area factor", s.factor * s.factor)];
    case "right_triangle":
      return [m("Hypotenuse", Math.hypot(s.a, s.b))];
    case "distance":
      return [m("Distance", Math.hypot(s.x2 - s.x1, s.y2 - s.y1))];
    case "prism":
      return [
        m("Volume", s.length * s.width * s.height),
        m("Surface area", 2 * (s.length * s.width + s.length * s.height + s.width * s.height)),
      ];
  }
}
export function geometryDescription(s: GeometryShape): string {
  switch (s.kind) {
    case "angle":
      return "A " + s.total + "° turn split into " + s.degrees + "° and an unknown angle.";
    case "triangle_angles":
      return "A triangle with angles " + s.a + "° and " + s.b + "°; the third angle is unknown.";
    case "rectangle":
      return "Rectangle: width " + s.width + ", height " + s.height + ".";
    case "triangle":
      return "Triangle: base " + s.base + ", perpendicular height " + s.height + ".";
    case "parallelogram":
      return "Parallelogram: base " + s.base + ", perpendicular height " + s.height + ".";
    case "trapezoid":
      return (
        "Trapezoid: parallel bases " +
        s.bottom +
        " and " +
        s.top +
        ", perpendicular height " +
        s.height +
        "."
      );
    case "composite":
      return (
        "A " +
        s.width +
        " by " +
        s.height +
        " rectangle with a " +
        s.cutWidth +
        " by " +
        s.cutHeight +
        " corner removed."
      );
    case "circle":
      return "Circle of radius " + s.radius + ".";
    case "similarity":
      return (
        "A " +
        s.width +
        " by " +
        s.height +
        " rectangle and a similar copy with length scale factor " +
        s.factor +
        "."
      );
    case "right_triangle":
      return (
        "Right triangle with perpendicular legs " +
        s.a +
        " and " +
        s.b +
        "; the hypotenuse is unknown."
      );
    case "distance":
      return (
        "Points A(" +
        s.x1 +
        ", " +
        s.y1 +
        ") and B(" +
        s.x2 +
        ", " +
        s.y2 +
        "); the dotted path follows the horizontal and vertical separations."
      );
    case "prism":
      return (
        "Closed rectangular prism: length " +
        s.length +
        ", width " +
        s.width +
        ", height " +
        s.height +
        "."
      );
  }
}

/** Comparison cases share a pixels-per-unit scale; enlarging a shape must enlarge the drawing. */
export function geometryUnitScale(shapes: GeometryShape[]): number | undefined {
  const boxes = shapes.flatMap((s) => {
    if (s.kind === "triangle_angles" || s.kind === "angle" || s.kind === "similarity") return [];
    if (s.kind === "circle") return [{ width: 2 * s.radius, height: 2 * s.radius }];
    if (s.kind === "prism")
      return [{ width: s.length + s.width * 0.65, height: s.height + s.width * 0.42 }];
    const p = geometryVertices(s);
    return [
      {
        width: Math.max(...p.map((v) => v.x)) - Math.min(...p.map((v) => v.x)),
        height: Math.max(...p.map((v) => v.y)) - Math.min(...p.map((v) => v.y)),
      },
    ];
  });
  return boxes.length
    ? Math.min(
        365 / Math.max(...boxes.map((b) => b.width)),
        185 / Math.max(...boxes.map((b) => b.height)),
      )
    : undefined;
}
