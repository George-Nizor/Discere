import { formatTimelineYear, timelinePosition } from "@discere/activity-engine";
import type { TimelineActivity } from "@discere/contracts";

/**
 * A horizontal track with one marker per event. Events dated on or before the selected year are
 * lit; the rest stay dim, so dragging the scrubber walks the period in order. Positions come
 * from the shared engine, so a marker and the scrubber always agree.
 *
 * Labels are staggered across four rows because real timelines cluster: four events inside
 * twenty-five years of an eight-century span sit almost on top of each other, and moving them
 * apart horizontally would misplace them.
 */
export function TimelineTrack({ activity, year }: { activity: TimelineActivity; year: number }) {
  const events = [...activity.events].sort((left, right) => left.year - right.year);
  const reached = events.filter((event) => event.year <= year);
  const latest = reached.at(-1) ?? null;

  return (
    <div className="timeline">
      <div className="timeline-track">
        <div
          className="timeline-track-filled"
          style={{ width: `${timelinePosition(activity, year) * 100}%` }}
        />
        {events.map((event, index) => {
          const lit = event.year <= year;
          return (
            <div
              className={[
                "timeline-marker",
                `timeline-marker-row-${index % 4}`,
                lit ? "timeline-marker-reached" : "",
                latest?.id === event.id ? "timeline-marker-latest" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={event.id}
              style={{ left: `${timelinePosition(activity, event.year) * 100}%` }}
            >
              <span className="timeline-dot" />
              <span className="timeline-caption">
                <span className="timeline-year">{formatTimelineYear(event.year)}</span>
                <span className="timeline-label">{event.label}</span>
              </span>
            </div>
          );
        })}
      </div>
      <p className="timeline-bounds muted">
        <span>{formatTimelineYear(activity.startYear)}</span>
        <span>
          {reached.length} of {events.length} events reached
        </span>
        <span>{formatTimelineYear(activity.endYear)}</span>
      </p>
      <div aria-live="polite" className="timeline-latest">
        {latest ? (
          <>
            <p className="eyebrow">
              {formatTimelineYear(latest.year)} · {latest.label}
            </p>
            <p>{latest.detail}</p>
          </>
        ) : (
          <p className="muted">
            Nothing on this timeline had happened by {formatTimelineYear(year)}.
          </p>
        )}
      </div>
    </div>
  );
}
