import {
  getOhmsLawState,
  getSeriesCircuitState,
  updateOhmsLawState,
  updateSeriesCircuitState,
} from "@discere/activity-engine";
import type { Activity } from "@discere/contracts";
import { formatCurrent } from "../../lib/format.js";
import { circuitVisualUrl } from "../visual-source.js";

export type ExplorerState =
  | { type: "ohms_law_explorer"; voltage: number; resistance: number }
  | { type: "series_circuit_explorer"; voltage: number; resistances: number[] };

export interface ExplorerRow {
  label: string;
  value: string;
}

export interface ExplorerReading {
  current: number;
  totalResistance: number;
  voltage: number;
  rows: ExplorerRow[];
  visualSrc: string;
  visualAlt: string;
}

export type PredictionDirection = "increases" | "decreases" | "same";

export const PREDICTION_CHOICES: Array<{ id: PredictionDirection; label: string }> = [
  { id: "increases", label: "Increases" },
  { id: "decreases", label: "Decreases" },
  { id: "same", label: "Stays the same" },
];

export function isSupportedActivity(activity: { type: string }): boolean {
  return activity.type === "ohms_law_explorer" || activity.type === "series_circuit_explorer";
}

export function initialExplorerState(activity: Activity): ExplorerState {
  if (activity.type === "ohms_law_explorer") {
    const state = getOhmsLawState(activity);
    return { type: activity.type, voltage: state.voltage, resistance: state.resistance };
  }
  const state = getSeriesCircuitState(activity);
  return { type: activity.type, voltage: state.voltage, resistances: [...state.resistances] };
}

/**
 * Reads the circuit through the shared activity engine so the browser never re-implements the
 * relationship it is teaching. `showValues` stays false until the learner has predicted.
 */
export function readExplorer(
  activity: Activity,
  state: ExplorerState,
  showValues: boolean,
): ExplorerReading {
  if (activity.type === "ohms_law_explorer" && state.type === "ohms_law_explorer") {
    const reading = updateOhmsLawState(activity, {
      voltage: state.voltage,
      resistance: state.resistance,
    });
    return {
      current: reading.current,
      totalResistance: reading.resistance,
      voltage: reading.voltage,
      rows: [
        { label: "Voltage", value: `${reading.voltage} V` },
        { label: "Resistance", value: `${reading.resistance} Ω` },
        { label: "Current", value: showValues ? formatCurrent(reading.current) : "Predict first" },
      ],
      visualSrc: circuitVisualUrl(reading.voltage, reading.resistance, showValues),
      visualAlt:
        "A battery and one resistor connected in a single closed loop. Component values stay hidden until the prediction is checked.",
    };
  }
  if (activity.type === "series_circuit_explorer" && state.type === "series_circuit_explorer") {
    const reading = updateSeriesCircuitState(activity, {
      voltage: state.voltage,
      resistances: state.resistances,
    });
    return {
      current: reading.current,
      totalResistance: reading.totalResistance,
      voltage: reading.voltage,
      rows: [
        { label: "Voltage", value: `${reading.voltage} V` },
        ...reading.resistances.map((value, index) => ({
          label: activity.resistors[index]?.label ?? `Resistor ${index + 1}`,
          value: `${value} Ω`,
        })),
        { label: "Total resistance", value: `${reading.totalResistance} Ω` },
        { label: "Current", value: showValues ? formatCurrent(reading.current) : "Predict first" },
      ],
      visualSrc: circuitVisualUrl(reading.voltage, reading.totalResistance, showValues),
      visualAlt:
        "A battery driving current through resistors placed one after another in a single loop. Component values stay hidden until the prediction is checked.",
    };
  }
  throw new Error(`The explorer state does not match activity '${activity.type}'.`);
}

/** Each activity predicts its own quantity, so the prompt and the check always agree. */
export function predictionTargetLabel(activity: Activity): string {
  return activity.type === "series_circuit_explorer" ? "total resistance" : "current";
}

export function readPredictionTarget(activity: Activity, reading: ExplorerReading): number {
  return activity.type === "series_circuit_explorer" ? reading.totalResistance : reading.current;
}

const TOLERANCE = 1e-12;

export function compareValues(before: number, after: number): PredictionDirection {
  if (after > before + TOLERANCE) return "increases";
  if (after < before - TOLERANCE) return "decreases";
  return "same";
}

export function directionSentence(direction: PredictionDirection, target: string): string {
  if (direction === "increases") return `the ${target} increases`;
  if (direction === "decreases") return `the ${target} decreases`;
  return `the ${target} is unchanged`;
}
