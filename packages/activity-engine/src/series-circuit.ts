import type { SeriesCircuitActivity } from "@discere/contracts";
import { calculateCurrent } from "@discere/visual-engine";

export interface SeriesCircuitState {
  voltage: number;
  resistances: number[];
  totalResistance: number;
  current: number;
}

function totalResistance(resistances: number[]): number {
  if (resistances.length < 2 || resistances.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new RangeError("A series circuit needs at least two positive resistances.");
  }
  return resistances.reduce((total, value) => total + value, 0);
}

export function getSeriesCircuitState(activity: SeriesCircuitActivity): SeriesCircuitState {
  const resistances = activity.resistors.map((resistor) => resistor.value);
  const total = totalResistance(resistances);
  return {
    voltage: activity.voltage.value,
    resistances,
    totalResistance: total,
    current: calculateCurrent(activity.voltage.value, total),
  };
}

export function updateSeriesCircuitState(
  activity: SeriesCircuitActivity,
  next: Partial<Pick<SeriesCircuitState, "voltage" | "resistances">>,
): SeriesCircuitState {
  const voltage = next.voltage ?? activity.voltage.value;
  if (voltage < activity.voltage.min || voltage > activity.voltage.max) {
    throw new RangeError("Voltage is outside the configured activity range.");
  }
  const resistances = next.resistances ?? activity.resistors.map((resistor) => resistor.value);
  if (resistances.length !== activity.resistors.length) {
    throw new RangeError("The series circuit must keep the configured resistor count.");
  }
  resistances.forEach((value, index) => {
    const resistor = activity.resistors[index];
    if (!resistor || value < resistor.min || value > resistor.max) {
      throw new RangeError(`Resistor ${index + 1} is outside the configured activity range.`);
    }
  });
  const total = totalResistance(resistances);
  return { voltage, resistances: [...resistances], totalResistance: total, current: calculateCurrent(voltage, total) };
}

export function compareSeriesResistance(before: SeriesCircuitState, after: SeriesCircuitState): "increases" | "decreases" | "same" {
  if (after.totalResistance > before.totalResistance) return "increases";
  if (after.totalResistance < before.totalResistance) return "decreases";
  return "same";
}
