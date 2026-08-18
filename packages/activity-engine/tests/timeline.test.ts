import type { TimelineActivity } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import {
  earliestOrderingChoice,
  formatTimelineYear,
  getTimelineState,
  timelinePosition,
  updateTimelineState,
} from "../src/index.js";

const activity: TimelineActivity = {
  id: "roman-timeline",
  type: "timeline_explorer",
  title: "From kings to emperors",
  conceptIds: ["roman-republic"],
  instructions: "Drag the year to reveal the events that had happened by then.",
  startYear: -753,
  endYear: 117,
  step: 1,
  initialYear: -753,
  events: [
    {
      id: "founding",
      year: -753,
      label: "Traditional founding of Rome",
      detail: "The traditional date.",
    },
    {
      id: "republic",
      year: -509,
      label: "Republic established",
      detail: "The last king is expelled.",
    },
    {
      id: "augustus",
      year: -27,
      label: "Augustus takes power",
      detail: "The Senate grants him the name Augustus.",
    },
    {
      id: "trajan",
      year: 117,
      label: "Greatest territorial extent",
      detail: "The empire reaches its largest size.",
    },
  ],
  predictionPrompt: "Which of these happened first?",
  orderingChoiceIds: ["augustus", "republic"],
};

describe("the timeline engine", () => {
  it("reveals only the events dated on or before the selected year", () => {
    const state = getTimelineState(activity);
    expect(state.revealed.map((event) => event.id)).toEqual(["founding"]);
    expect(state.upcoming.map((event) => event.id)).toEqual(["republic", "augustus", "trajan"]);
  });

  it("reveals later events as the year advances", () => {
    const state = updateTimelineState(activity, -27);
    expect(state.revealed.map((event) => event.id)).toEqual(["founding", "republic", "augustus"]);
    expect(state.upcoming.map((event) => event.id)).toEqual(["trajan"]);
  });

  it("refuses a year outside the timeline", () => {
    expect(() => updateTimelineState(activity, -800)).toThrow(RangeError);
    expect(() => updateTimelineState(activity, 200)).toThrow(RangeError);
  });

  it("places years along the track in proportion to the span", () => {
    expect(timelinePosition(activity, -753)).toBeCloseTo(0, 10);
    expect(timelinePosition(activity, 117)).toBeCloseTo(1, 10);
    expect(timelinePosition(activity, -318)).toBeCloseTo(0.5, 10);
  });

  it("recomputes which offered event came first from the dates alone", () => {
    expect(earliestOrderingChoice(activity).id).toBe("republic");
  });

  it("writes an astronomical year the way the lesson writes it", () => {
    expect(formatTimelineYear(-509)).toBe("509 BCE");
    expect(formatTimelineYear(117)).toBe("117 CE");
  });
});
