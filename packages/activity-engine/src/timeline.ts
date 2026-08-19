import type { TimelineActivity, TimelineEvent } from "@discere/contracts";

export interface TimelineState {
  year: number;
  /** Events dated on or before `year`, earliest first. */
  revealed: TimelineEvent[];
  /** Events still ahead of the scrubber, earliest first. */
  upcoming: TimelineEvent[];
}

function byYear(left: TimelineEvent, right: TimelineEvent): number {
  return left.year - right.year || left.id.localeCompare(right.id);
}

function read(activity: TimelineActivity, year: number): TimelineState {
  const ordered = [...activity.events].sort(byYear);
  return {
    year,
    revealed: ordered.filter((event) => event.year <= year),
    upcoming: ordered.filter((event) => event.year > year),
  };
}

export function getTimelineState(activity: TimelineActivity): TimelineState {
  return read(activity, activity.initialYear);
}

export function updateTimelineState(activity: TimelineActivity, year: number): TimelineState {
  if (!Number.isFinite(year) || year < activity.startYear || year > activity.endYear) {
    throw new RangeError("The selected year is outside the timeline.");
  }
  return read(activity, year);
}

/**
 * Fraction of the track an event sits at, so the same arithmetic positions a marker and the
 * scrubber. Years are astronomical, so a BCE date is simply a smaller number.
 */
export function timelinePosition(activity: TimelineActivity, year: number): number {
  const span = activity.endYear - activity.startYear;
  if (span <= 0) throw new RangeError("A timeline must start before it ends.");
  return Math.min(1, Math.max(0, (year - activity.startYear) / span));
}

/**
 * The event the learner should choose when asked which of the offered events came first.
 * It is recomputed from the dates rather than stored, so no marked answer travels to the
 * browser inside the activity.
 */
export function earliestOrderingChoice(activity: TimelineActivity): TimelineEvent {
  const choices = activity.orderingChoiceIds
    .map((id) => activity.events.find((event) => event.id === id))
    .filter((event): event is TimelineEvent => event !== undefined)
    .sort(byYear);
  const earliest = choices[0];
  if (!earliest) throw new RangeError("The timeline offers no ordering choices.");
  return earliest;
}

/** Formats an astronomical year the way the lesson prose writes it: 27 BCE, 117 CE. */
export function formatTimelineYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
}
