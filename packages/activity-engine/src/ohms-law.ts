import type { OhmsLawActivity } from "@discere/contracts";
import { calculateCurrent } from "@discere/visual-engine";

export interface OhmsLawState { voltage: number; resistance: number; current: number; }

export function getOhmsLawState(activity: OhmsLawActivity): OhmsLawState {
  return { voltage: activity.voltage.value, resistance: activity.resistance.value, current: calculateCurrent(activity.voltage.value, activity.resistance.value) };
}

export function updateOhmsLawState(activity: OhmsLawActivity, next: Partial<Pick<OhmsLawState, "voltage" | "resistance">>): OhmsLawState {
  const voltage = next.voltage ?? activity.voltage.value;
  const resistance = next.resistance ?? activity.resistance.value;
  if (voltage < activity.voltage.min || voltage > activity.voltage.max) throw new RangeError("Voltage is outside the configured activity range.");
  if (resistance < activity.resistance.min || resistance > activity.resistance.max) throw new RangeError("Resistance is outside the configured activity range.");
  return { voltage, resistance, current: calculateCurrent(voltage, resistance) };
}

export function compareCurrent(before: OhmsLawState, after: OhmsLawState): "increases" | "decreases" | "same" {
  const tolerance = 1e-12;
  if (after.current > before.current + tolerance) return "increases";
  if (after.current < before.current - tolerance) return "decreases";
  return "same";
}
