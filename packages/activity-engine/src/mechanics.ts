import type { MechanicsModel } from "@discere/contracts";
export interface MechanicsBody {
  id: string;
  x: number;
  velocity: number;
  mass?: number;
}
export interface MechanicsFrame {
  time: number;
  bodies: MechanicsBody[];
  acceleration: number;
  distance: number;
  friction: number;
  kinetic: number;
  potential: number;
  thermal: number;
  work: number;
  impulse: number;
}
export const mechanicsNumber = (value: number) => Number(value.toFixed(4)).toString();
export function mechanicsDuration(m: MechanicsModel): number {
  if (m.kind === "journey") return m.points[m.points.length - 1]!.t;
  if (m.kind === "collision") return 2;
  return "duration" in m ? m.duration : 1;
}
export function mechanicsTimed(m: MechanicsModel) {
  return [
    "journey",
    "motion",
    "velocity_change",
    "forces",
    "interaction",
    "friction",
    "impulse",
    "collision",
  ].includes(m.kind);
}
export function mechanicsFrame(m: MechanicsModel, fraction: number): MechanicsFrame {
  const p = Math.max(0, Math.min(1, fraction)),
    t = p * mechanicsDuration(m);
  const frame: MechanicsFrame = {
    time: t,
    bodies: [],
    acceleration: 0,
    distance: 0,
    friction: 0,
    kinetic: 0,
    potential: 0,
    thermal: 0,
    work: 0,
    impulse: 0,
  };
  const body = (x: number, velocity: number, bodyMass = 1) => {
    frame.bodies = [{ id: "A", x, velocity, mass: bodyMass }];
    frame.kinetic = (bodyMass * velocity * velocity) / 2;
  };
  switch (m.kind) {
    case "journey": {
      const last = m.points[m.points.length - 1]!;
      let segment = m.points.findIndex((point, i) => i > 0 && point.t >= t);
      if (segment < 1) segment = m.points.length - 1;
      const a = m.points[segment - 1]!,
        b = m.points[segment]!;
      const v = (b.x - a.x) / (b.t - a.t);
      body(a.x + v * (t - a.t), v);
      for (let i = 1; i < segment; i++)
        frame.distance += Math.abs(m.points[i]!.x - m.points[i - 1]!.x);
      frame.distance += Math.abs(v * (t - a.t));
      if (p === 1) frame.bodies[0]!.x = last.x;
      break;
    }
    case "motion":
    case "velocity_change":
    case "forces":
    case "impulse": {
      const a =
        m.kind === "motion"
          ? m.acceleration
          : m.kind === "velocity_change"
            ? (m.v1 - m.v0) / m.duration
            : m.kind === "forces"
              ? (m.right - m.left) / m.mass
              : m.force / m.mass;
      const x0 = m.kind === "motion" ? m.x0 : 0;
      const bodyMass = ("mass" in m ? m.mass : 1) ?? 1;
      frame.acceleration = a;
      body(x0 + m.v0 * t + (a * t * t) / 2, m.v0 + a * t, bodyMass);
      const turn = a !== 0 ? -m.v0 / a : -1;
      const end = frame.bodies[0]!.x;
      if (turn > 0 && turn < t) {
        const peak = x0 + m.v0 * turn + (a * turn * turn) / 2;
        frame.distance = Math.abs(peak - x0) + Math.abs(end - peak);
      } else frame.distance = Math.abs(end - x0);
      frame.impulse = bodyMass * a * t;
      break;
    }
    case "support":
      frame.acceleration = m.acceleration;
      body(0, 0, m.mass);
      break;
    case "interaction": {
      const a = m.force / m.massA,
        b = m.force / m.massB;
      frame.bodies = [
        { id: "A", x: -1 - (a * t * t) / 2, velocity: -a * t, mass: m.massA },
        { id: "B", x: 1 + (b * t * t) / 2, velocity: b * t, mass: m.massB },
      ];
      frame.kinetic = frame.bodies.reduce(
        (sum, v) => sum + ((v.mass ?? 1) * v.velocity ** 2) / 2,
        0,
      );
      break;
    }
    case "friction": {
      const normal = m.mass * m.gravity,
        limit = m.muStatic * normal;
      const atRest = m.v0 === 0 && m.applied <= limit;
      const a = atRest ? 0 : (m.applied - m.muKinetic * normal) / m.mass;
      const stop = a < 0 ? m.v0 / -a : Infinity;
      const movingTime = Math.min(t, stop);
      const v = Math.max(0, m.v0 + a * movingTime);
      body(m.v0 * movingTime + (a * movingTime * movingTime) / 2, v, m.mass);
      frame.acceleration = t >= stop ? 0 : a;
      frame.friction = atRest || t >= stop ? m.applied : m.muKinetic * normal;
      frame.distance = frame.bodies[0]!.x;
      frame.thermal = m.muKinetic * normal * frame.distance;
      frame.work = m.applied * frame.distance;
      break;
    }
    case "work": {
      body(m.distance * p, 0);
      frame.distance = m.distance * p;
      frame.work =
        m.force *
        frame.distance *
        (m.alignment === "with" ? 1 : m.alignment === "against" ? -1 : 0);
      break;
    }
    case "kinetic":
      body(0, m.speed, m.mass);
      break;
    case "lift": {
      const h = m.fromHeight + (m.toHeight - m.fromHeight) * p;
      body(h, 0, m.mass);
      frame.potential = m.mass * m.gravity * h;
      frame.work = m.mass * m.gravity * (h - m.fromHeight);
      break;
    }
    case "energy_drop": {
      const total = m.mass * m.gravity * m.height + (m.mass * m.initialSpeed ** 2) / 2;
      const h = m.height * (1 - p);
      frame.potential = m.mass * m.gravity * h;
      frame.thermal = m.thermalLoss * p;
      const kinetic = Math.max(0, total - frame.potential - frame.thermal);
      body(h, Math.sqrt((2 * kinetic) / m.mass), m.mass);
      break;
    }
    case "power":
      frame.work = m.usefulEnergy * p;
      frame.thermal = (m.inputEnergy - m.usefulEnergy) * p;
      break;
    case "collision": {
      const combined = (m.massA * m.velocityA + m.massB * m.velocityB) / (m.massA + m.massB);
      const x = m.velocityA + combined * (t - 1);
      frame.bodies =
        t < 1
          ? [
              { id: "A", x: m.velocityA * t, velocity: m.velocityA, mass: m.massA },
              {
                id: "B",
                x: m.velocityA - m.velocityB + m.velocityB * t,
                velocity: m.velocityB,
                mass: m.massB,
              },
            ]
          : [
              { id: "A", x, velocity: combined, mass: m.massA },
              { id: "B", x, velocity: combined, mass: m.massB },
            ];
      frame.kinetic = frame.bodies.reduce((sum, b) => sum + (b.mass! * b.velocity ** 2) / 2, 0);
      frame.thermal = (m.massA * m.velocityA ** 2 + m.massB * m.velocityB ** 2) / 2 - frame.kinetic;
      break;
    }
  }
  return frame;
}
export function mechanicsBounds(models: MechanicsModel[]): [number, number] {
  const xs = models.flatMap((m) =>
    Array.from({ length: 81 }, (_, i) => mechanicsFrame(m, i / 80).bodies.map((b) => b.x)).flat(),
  );
  const low = Math.min(0, ...xs),
    high = Math.max(1, ...xs);
  const padding = Math.max(1, (high - low) * 0.08);
  return [low - padding, high + padding];
}
export function mechanicsGivens(m: MechanicsModel): string[] {
  const base = "mass" in m && m.mass !== undefined ? ["Mass " + m.mass + " kg"] : [];
  switch (m.kind) {
    case "journey":
      return [
        ...m.points.map((p) => p.t + " s: " + p.x + " m"),
        "Straight segments between the shown observations; right is positive.",
      ];
    case "motion":
      return [
        ...base,
        "Start " + m.x0 + " m",
        "Initial velocity " + m.v0 + " m/s",
        "Constant acceleration " + m.acceleration + " m/s²",
        "Duration " + m.duration + " s",
        m.axis === "vertical" ? "Up is positive; ignore air resistance." : "Right is positive.",
      ];
    case "velocity_change":
      return [
        "Initial velocity " + m.v0 + " m/s",
        "Final velocity " + m.v1 + " m/s",
        "Duration " + m.duration + " s",
        "Constant acceleration; right is positive.",
      ];
    case "forces":
      return [
        ...base,
        "Left " + m.left + " N",
        "Right " + m.right + " N",
        "Initial velocity " + m.v0 + " m/s",
        "Duration " + m.duration + " s",
        "Horizontal forces only; right is positive.",
      ];
    case "support":
      return [
        ...base,
        "g = " + m.gravity + " m/s²",
        "Upward acceleration " + m.acceleration + " m/s²",
        "Only weight and an upward support force act.",
      ];
    case "interaction":
      return [
        "A: " + m.massA + " kg",
        "B: " + m.massB + " kg",
        "Force on A: " + m.force + " N left",
        "Duration " + m.duration + " s",
        "Both start at rest; the interaction is their only horizontal force.",
      ];
    case "friction":
      return [
        ...base,
        "g = " + m.gravity + " m/s²",
        "Push " + m.applied + " N right",
        "Static coefficient " + m.muStatic,
        "Kinetic coefficient " + m.muKinetic,
        "Initial velocity " + m.v0 + " m/s right",
        "Duration " + m.duration + " s",
        "Horizontal surface; no vertical acceleration.",
      ];
    case "work":
      return [
        "Force " + m.force + " N",
        "Displacement " + m.distance + " m right",
        "Force " +
          (m.alignment === "with"
            ? "along"
            : m.alignment === "against"
              ? "opposite to"
              : "perpendicular to") +
          " the displacement",
      ];
    case "kinetic":
      return [...base, "Speed " + m.speed + " m/s"];
    case "lift":
      return [
        ...base,
        "g = " + m.gravity + " m/s²",
        "Initial height " + m.fromHeight + " m",
        "Final height " + m.toHeight + " m",
      ];
    case "energy_drop":
      return [
        ...base,
        "g = " + m.gravity + " m/s²",
        "Initial height " + m.height + " m",
        "Initial speed " + m.initialSpeed + " m/s",
        "Heating during the descent " + m.thermalLoss + " J",
        "The object reaches zero height; no other energy transfers.",
      ];
    case "power":
      return [
        "Input energy " + m.inputEnergy + " J",
        "Useful output " + m.usefulEnergy + " J",
        "Duration " + m.duration + " s",
      ];
    case "impulse":
      return [
        ...base,
        "Initial velocity " + m.v0 + " m/s",
        "Constant net force " + m.force + " N",
        "Duration " + m.duration + " s",
        "Right is positive.",
      ];
    case "collision":
      return [
        "A: " + m.massA + " kg at " + m.velocityA + " m/s",
        "B: " + m.massB + " kg at " + m.velocityB + " m/s",
        "They meet at 1 s and stick. Right is positive; external impulse is negligible.",
      ];
  }
}
export function mechanicsMeasures(m: MechanicsModel): Array<{ label: string; value: string }> {
  const f = mechanicsFrame(m, 1),
    b = f.bodies[0];
  const value = (label: string, n: number, unit: string) => ({
    label,
    value: mechanicsNumber(n) + " " + unit,
  });
  switch (m.kind) {
    case "journey":
      return [
        value("Displacement", b!.x - m.points[0]!.x, "m"),
        value("Distance travelled", f.distance, "m"),
        value("Average velocity", (b!.x - m.points[0]!.x) / f.time, "m/s"),
        value("Average speed", f.distance / f.time, "m/s"),
      ];
    case "motion":
    case "velocity_change":
    case "forces":
    case "impulse":
      return [
        value("Final position", b!.x, "m"),
        value("Final velocity", b!.velocity, "m/s"),
        value("Acceleration", f.acceleration, "m/s²"),
        ...("mass" in m ? [value("Impulse", f.impulse, "N·s")] : []),
      ];
    case "support":
      return [
        value("Weight", m.mass * m.gravity, "N"),
        value("Support force", m.mass * (m.gravity + m.acceleration), "N"),
      ];
    case "interaction":
      return [
        value("Acceleration of A", -m.force / m.massA, "m/s²"),
        value("Acceleration of B", m.force / m.massB, "m/s²"),
      ];
    case "friction":
      return [
        value("Static limit", m.muStatic * m.mass * m.gravity, "N"),
        value("Friction at the end", f.friction, "N"),
        value("Final velocity", b!.velocity, "m/s"),
      ];
    case "work":
      return [value("Work by this force", f.work, "J")];
    case "kinetic":
      return [value("Kinetic energy", f.kinetic, "J")];
    case "lift":
      return [value("Change in gravitational energy", f.work, "J")];
    case "energy_drop":
      return [
        value("Final kinetic energy", f.kinetic, "J"),
        value("Final speed", b!.velocity, "m/s"),
        value("Heating", f.thermal, "J"),
      ];
    case "power":
      return [
        value("Useful power", m.usefulEnergy / m.duration, "W"),
        value("Efficiency", (100 * m.usefulEnergy) / m.inputEnergy, "%"),
      ];
    case "collision":
      return [
        value("Combined velocity", b!.velocity, "m/s"),
        value("Total momentum", m.massA * m.velocityA + m.massB * m.velocityB, "kg·m/s"),
        value("Kinetic energy converted", f.thermal, "J"),
      ];
  }
}
