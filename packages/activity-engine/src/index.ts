export {
  compareCurrent,
  getOhmsLawState,
  type OhmsLawState,
  updateOhmsLawState,
} from "./ohms-law.js";
export {
  compareParallelResistance,
  getParallelCircuitState,
  type ParallelCircuitState,
  updateParallelCircuitState,
} from "./parallel-circuit.js";
export {
  compareSeriesResistance,
  getSeriesCircuitState,
  type SeriesCircuitState,
  updateSeriesCircuitState,
} from "./series-circuit.js";
export {
  earliestOrderingChoice,
  formatTimelineYear,
  getTimelineState,
  type TimelineState,
  timelinePosition,
  updateTimelineState,
} from "./timeline.js";
export {
  diagramChoiceIssues,
  type DiagramChoiceOutcome,
  evaluateDiagramChoice,
} from "./diagram-choice.js";
export {
  evaluateOrderSequence,
  moveInOrder,
  type OrderSequenceOutcome,
  orderSequenceIssues,
} from "./order-sequence.js";
export {
  evaluateGraphPlot,
  type GraphPlotOutcome,
  type GraphPoint,
  graphPlotIssues,
  pointFromFraction,
  snapToGrid,
} from "./graph-plot.js";
export { runTeachingProgram, type ProgramResult, type ProgramStep } from "./teaching-program.js";
export { truthValue, traceSearch, type TruthFormula, type SearchStep } from "./reasoning.js";
export {
  enumerateOutcomes,
  summariseData,
  type OutcomeGridSpec,
  type OutcomeCell,
} from "./statistics.js";

export {
  geometryVertices,
  geometryMeasures,
  geometryDescription,
  geometryUnitScale,
  type GeometryPoint,
} from "./geometry.js";

export {
  mechanicsBounds,
  mechanicsDuration,
  mechanicsFrame,
  mechanicsGivens,
  mechanicsMeasures,
  mechanicsNumber,
  mechanicsTimed,
  type MechanicsFrame,
  type MechanicsBody,
} from "./mechanics.js";

export {
  polynomialValue,
  derivativeCoefficients,
  primitiveCoefficients,
  polynomialIntegral,
  rectangleSum,
  polynomialLabel,
  calculusGivens,
  calculusWindow,
  calculusResults,
  calcNumber,
} from "./calculus.js";

export * from "./chemistry.js";

export * from "./biology.js";

export * from "./linear-algebra.js";

export * from "./inference.js";
export * from "./inference-probability.js";
export * from "./engineering.js";
export * from "./economics.js";
export * from "./philosophy.js";
export * from "./language.js";
export * from "./astronomy.js";
export * from "./psychology.js";
