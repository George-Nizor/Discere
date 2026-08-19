import {
  earliestOrderingChoice,
  formatTimelineYear,
  getOhmsLawState,
  getParallelCircuitState,
  getSeriesCircuitState,
  getTimelineState,
  updateOhmsLawState,
  updateParallelCircuitState,
  updateSeriesCircuitState,
  updateTimelineState,
} from "@discere/activity-engine";
import type { Activity, TimelineActivity, TimelineEvent } from "@discere/contracts";
import { formatCurrent } from "../../lib/format.js";
import { circuitVisualUrl } from "../visual-source.js";

export type ExplorerState =
  | { type: "ohms_law_explorer"; voltage: number; resistance: number }
  | { type: "series_circuit_explorer"; voltage: number; resistances: number[] }
  | { type: "parallel_circuit_explorer"; voltage: number; resistances: number[] }
  | { type: "timeline_explorer"; year: number };

export interface ExplorerRow {
  label: string;
  value: string;
}

/** The measured quantity shown beside the stage title once the learner has predicted. */
export interface ExplorerReadout {
  label: string;
  value: string;
}

export type ExplorerReading =
  | {
      kind: "circuit";
      voltage: number;
      totalResistance: number;
      current: number;
      rows: ExplorerRow[];
      readout: ExplorerReadout;
      visualSrc: string;
      visualAlt: string;
    }
  | {
      kind: "timeline";
      year: number;
      revealed: TimelineEvent[];
      rows: ExplorerRow[];
      readout: ExplorerReadout;
    };

export type PredictionDirection = "increases" | "decreases" | "same";

export interface PredictionChoice {
  id: string;
  label: string;
}

export const PREDICTION_CHOICES: PredictionChoice[] = [
  { id: "increases", label: "Increases" },
  { id: "decreases", label: "Decreases" },
  { id: "same", label: "Stays the same" },
];

const SUPPORTED_TYPES = new Set<string>([
  "ohms_law_explorer",
  "series_circuit_explorer",
  "parallel_circuit_explorer",
  "timeline_explorer",
]);

export function isSupportedActivity(activity: { type: string }): boolean {
  return SUPPORTED_TYPES.has(activity.type);
}

export function initialExplorerState(activity: Activity): ExplorerState {
  if (activity.type === "ohms_law_explorer") {
    const state = getOhmsLawState(activity);
    return { type: activity.type, voltage: state.voltage, resistance: state.resistance };
  }
  if (activity.type === "series_circuit_explorer") {
    const state = getSeriesCircuitState(activity);
    return { type: activity.type, voltage: state.voltage, resistances: [...state.resistances] };
  }
  if (activity.type === "parallel_circuit_explorer") {
    const state = getParallelCircuitState(activity);
    return { type: activity.type, voltage: state.voltage, resistances: [...state.resistances] };
  }
  return { type: activity.type, year: getTimelineState(activity).year };
}

/**
 * Reads the activity through the shared engine so the browser never re-implements the
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
      kind: "circuit",
      current: reading.current,
      totalResistance: reading.resistance,
      voltage: reading.voltage,
      rows: [
        { label: "Voltage", value: `${reading.voltage} V` },
        { label: "Resistance", value: `${reading.resistance} Ω` },
        { label: "Current", value: showValues ? formatCurrent(reading.current) : "Predict first" },
      ],
      readout: {
        label: "Current",
        value: showValues ? formatCurrent(reading.current) : "Predict first",
      },
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
      kind: "circuit",
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
      readout: {
        label: "Total resistance",
        value: showValues ? `${reading.totalResistance} Ω` : "Predict first",
      },
      visualSrc: circuitVisualUrl(reading.voltage, reading.totalResistance, showValues),
      visualAlt:
        "A battery driving current through resistors placed one after another in a single loop. Component values stay hidden until the prediction is checked.",
    };
  }
  if (activity.type === "parallel_circuit_explorer" && state.type === "parallel_circuit_explorer") {
    const reading = updateParallelCircuitState(activity, {
      voltage: state.voltage,
      resistances: state.resistances,
    });
    return {
      kind: "circuit",
      current: reading.current,
      totalResistance: reading.totalResistance,
      voltage: reading.voltage,
      rows: [
        { label: "Voltage", value: `${reading.voltage} V` },
        ...reading.resistances.map((value, index) => ({
          label: activity.branches[index]?.label ?? `Branch ${index + 1}`,
          value: `${value} Ω`,
        })),
        ...reading.branchCurrents.map((value, index) => ({
          label: `${activity.branches[index]?.label ?? `Branch ${index + 1}`} current`,
          value: showValues ? formatCurrent(value) : "Predict first",
        })),
        { label: "Total resistance", value: formatResistance(reading.totalResistance) },
        {
          label: "Total current",
          value: showValues ? formatCurrent(reading.current) : "Predict first",
        },
      ],
      readout: {
        label: "Total resistance",
        value: showValues ? formatResistance(reading.totalResistance) : "Predict first",
      },
      // Two branches are drawn as the single resistor they are equivalent to, which is the
      // relationship the activity is teaching. The caption says so rather than implying a loop.
      visualSrc: circuitVisualUrl(reading.voltage, roundTo(reading.totalResistance, 2), showValues),
      visualAlt:
        "The equivalent single-resistor circuit for the two parallel branches. Values stay hidden until the prediction is checked.",
    };
  }
  if (activity.type === "timeline_explorer" && state.type === "timeline_explorer") {
    const reading = updateTimelineState(activity, state.year);
    return {
      kind: "timeline",
      year: reading.year,
      revealed: reading.revealed,
      rows: reading.revealed.map((event) => ({
        label: formatTimelineYear(event.year),
        value: event.label,
      })),
      readout: { label: "Year", value: formatTimelineYear(reading.year) },
    };
  }
  throw new Error(`The explorer state does not match activity '${activity.type}'.`);
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function formatResistance(value: number): string {
  return `${Number.isInteger(value) ? value : roundTo(value, 1)} Ω`;
}

/** Each activity predicts its own quantity, so the prompt and the check always agree. */
export function predictionTargetLabel(activity: Activity): string {
  if (activity.type === "series_circuit_explorer") return "total resistance";
  if (activity.type === "parallel_circuit_explorer") return "total resistance";
  return "current";
}

export function readPredictionTarget(activity: Activity, reading: ExplorerReading): number {
  if (reading.kind !== "circuit") throw new Error("A timeline reading has no measured target.");
  return activity.type === "ohms_law_explorer" ? reading.current : reading.totalResistance;
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

/**
 * The options the learner picks between. A circuit asks which way a measured quantity moved; a
 * timeline asks which of two dated events came first.
 */
export function predictionChoices(activity: Activity): PredictionChoice[] {
  if (activity.type !== "timeline_explorer") return PREDICTION_CHOICES;
  return activity.orderingChoiceIds.flatMap((id) => {
    const event = activity.events.find((item) => item.id === id);
    return event ? [{ id: event.id, label: event.label }] : [];
  });
}

export interface PredictionOutcome {
  correct: boolean;
  explanation: string;
}

export function evaluatePrediction(
  activity: Activity,
  baseline: ExplorerReading,
  current: ExplorerReading,
  choiceId: string,
): PredictionOutcome {
  if (activity.type === "timeline_explorer") return evaluateOrdering(activity, choiceId);
  const observed = compareValues(
    readPredictionTarget(activity, baseline),
    readPredictionTarget(activity, current),
  );
  const target = predictionTargetLabel(activity);
  const correct = choiceId === observed;
  const predicted = PREDICTION_CHOICES.find((choice) => choice.id === choiceId)?.label ?? choiceId;
  return {
    correct,
    explanation: correct
      ? `Moving from the starting circuit to this one, ${directionSentence(observed, target)}. Your prediction matches the measured change.`
      : `Moving from the starting circuit to this one, ${directionSentence(observed, target)}. You predicted "${predicted}".`,
  };
}

function evaluateOrdering(activity: TimelineActivity, choiceId: string): PredictionOutcome {
  const earliest = earliestOrderingChoice(activity);
  const chosen = activity.events.find((event) => event.id === choiceId);
  if (chosen?.id === earliest.id) {
    return {
      correct: true,
      explanation: `${earliest.label} came first, in ${formatTimelineYear(earliest.year)}.`,
    };
  }
  const chosenPart = chosen
    ? `You chose ${chosen.label}, dated ${formatTimelineYear(chosen.year)}. `
    : "";
  return {
    correct: false,
    explanation: `${chosenPart}${earliest.label} came first, in ${formatTimelineYear(earliest.year)}.`,
  };
}
