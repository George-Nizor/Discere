import type { ParallelCircuitActivity } from "@discere/contracts";
import { calculateCurrent } from "@discere/visual-engine";

export interface ParallelCircuitState {
  voltage: number;
  resistances: number[];
  /** Current in each branch, in the order the branches are declared. */
  branchCurrents: number[];
  totalResistance: number;
  current: number;
}

/**
 * Two or more resistors across the same pair of nodes conduct independently, so their
 * conductances add. The reciprocal of that sum is the equivalent resistance, which is always
 * smaller than the smallest branch.
 */
function equivalentResistance(resistances: number[]): number {
  if (
    resistances.length < 2 ||
    resistances.some((value) => !Number.isFinite(value) || value <= 0)
  ) {
    throw new RangeError("A parallel circuit needs at least two positive branch resistances.");
  }
  const conductance = resistances.reduce((total, value) => total + 1 / value, 0);
  return 1 / conductance;
}

function read(voltage: number, resistances: number[]): ParallelCircuitState {
  const total = equivalentResistance(resistances);
  return {
    voltage,
    resistances: [...resistances],
    branchCurrents: resistances.map((resistance) => calculateCurrent(voltage, resistance)),
    totalResistance: total,
    current: calculateCurrent(voltage, total),
  };
}

export function getParallelCircuitState(activity: ParallelCircuitActivity): ParallelCircuitState {
  return read(
    activity.voltage.value,
    activity.branches.map((branch) => branch.value),
  );
}

export function updateParallelCircuitState(
  activity: ParallelCircuitActivity,
  next: Partial<Pick<ParallelCircuitState, "voltage" | "resistances">>,
): ParallelCircuitState {
  const voltage = next.voltage ?? activity.voltage.value;
  if (voltage < activity.voltage.min || voltage > activity.voltage.max) {
    throw new RangeError("Voltage is outside the configured activity range.");
  }
  const resistances = next.resistances ?? activity.branches.map((branch) => branch.value);
  if (resistances.length !== activity.branches.length) {
    throw new RangeError("The parallel circuit must keep the configured branch count.");
  }
  resistances.forEach((value, index) => {
    const branch = activity.branches[index];
    if (!branch || value < branch.min || value > branch.max) {
      throw new RangeError(`Branch ${index + 1} is outside the configured activity range.`);
    }
  });
  return read(voltage, resistances);
}

export function compareParallelResistance(
  before: ParallelCircuitState,
  after: ParallelCircuitState,
): "increases" | "decreases" | "same" {
  const tolerance = 1e-12;
  if (after.totalResistance > before.totalResistance + tolerance) return "increases";
  if (after.totalResistance < before.totalResistance - tolerance) return "decreases";
  return "same";
}
