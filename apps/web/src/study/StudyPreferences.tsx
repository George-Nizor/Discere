import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { StudyPreferencesUpdate } from "@discere/contracts";
import { errorMessage } from "../api/client.js";
import { updateStudyPreferences } from "../api/endpoints.js";
import { queryKeys, useStudyPreferences } from "../api/queries.js";
import { cacheExperience } from "./experience.js";

/** Every zone this browser knows, for the searchable list. Falls back to a short list. */
function knownTimeZones(): string[] {
  try {
    const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
    const zones = intl.supportedValuesOf?.("timeZone");
    if (zones?.length) return zones.includes("UTC") ? zones : [...zones, "UTC"];
  } catch {
    /* Older engines: fall through. */
  }
  return ["UTC", "Europe/London", "Europe/Athens", "America/New_York", "Australia/Sydney"];
}

/**
 * The matching zone for what was typed, in its proper spelling, or a sentence saying what is
 * wrong. Exported for tests.
 */
export function resolveTimeZone(
  typed: string,
  zones: string[],
): { zone: string } | { problem: string } {
  const value = typed.trim();
  if (!value) return { problem: "Choose a time zone. Start typing a city, such as London." };
  const exact = zones.find((zone) => zone.toLowerCase() === value.toLowerCase());
  if (exact) return { zone: exact };
  const city = value.toLowerCase().replaceAll(" ", "_");
  const byCity = zones.filter((zone) => zone.toLowerCase().split("/").pop() === city);
  if (byCity.length === 1 && byCity[0]) return { zone: byCity[0] };
  return {
    problem: `“${value}” is not in the list of time zones. Pick one of the suggestions, written as Region/City, such as Europe/London.`,
  };
}

export function StudyPreferences() {
  const preferences = useStudyPreferences();
  const client = useQueryClient();
  const [zone, setZone] = useState<string | null>(null);
  const [zoneProblem, setZoneProblem] = useState<string | null>(null);
  const zones = useMemo(knownTimeZones, []);
  const mutation = useMutation({
    mutationFn: updateStudyPreferences,
    onSuccess: (saved) => {
      client.setQueryData(queryKeys.studyPreferences, saved);
      cacheExperience(saved);
      void client.invalidateQueries({ queryKey: queryKeys.study });
      void client.invalidateQueries({ queryKey: queryKeys.home });
    },
  });
  const data = preferences.data;
  const save = (input: StudyPreferencesUpdate) => {
    const previous = preferences.data;
    if (previous && input.timeZone === undefined)
      client.setQueryData(queryKeys.studyPreferences, { ...previous, ...input });
    mutation.mutate(input, {
      onError: () => {
        if (previous) client.setQueryData(queryKeys.studyPreferences, previous);
      },
    });
  };
  return (
    <section
      aria-labelledby="practice-settings-heading"
      className="settings-card practice-settings"
    >
      <h2 className="settings-card-title" id="practice-settings-heading">
        Your practice
      </h2>
      {!data ? (
        <p role="status">
          {preferences.error ? "Practice preferences did not load." : "Loading preferences…"}
        </p>
      ) : (
        <>
          <fieldset className="daily-goal-options" disabled={mutation.isPending}>
            <legend>Daily goal</legend>
            <p className="settings-note">
              Answers and due recall cards count. Finishing a lesson also meets your goal.
            </p>
            <div>
              {([3, 5, 10] as const).map((goal) => (
                <label key={goal} className={data.dailyGoal === goal ? "is-selected" : ""}>
                  <input
                    type="radio"
                    aria-label={`${goal} responses a day, ${goal === 3 ? "Light" : goal === 5 ? "Steady" : "Focused"}`}
                    name="dailyGoal"
                    checked={data.dailyGoal === goal}
                    onChange={() => save({ dailyGoal: goal })}
                  />
                  <strong>{goal}</strong>
                  <span>{goal === 3 ? "Light" : goal === 5 ? "Steady" : "Focused"}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="practice-setting-row">
            <span>
              <strong>Motion</strong>
              <small>Your device’s reduced motion preference is always respected.</small>
            </span>
            <select
              aria-label="Motion"
              value={data.motion}
              disabled={mutation.isPending}
              onChange={(event) =>
                save({ motion: event.currentTarget.value as "system" | "reduced" })
              }
            >
              <option value="system">Follow device</option>
              <option value="reduced">Reduce motion</option>
            </select>
          </label>
          <label className="practice-setting-row">
            <span>
              <strong>Celebrations</strong>
              <small>
                Confetti and effects for finishing a lesson, opening the daily chest and reaching a
                new level.
              </small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={data.celebrations}
              aria-checked={data.celebrations}
              disabled={mutation.isPending}
              onChange={(event) => save({ celebrations: event.currentTarget.checked })}
            />
          </label>
          <label className="practice-setting-row">
            <span>
              <strong>Companion</strong>
              <small>Bonehead in the corner of the screen, reacting to your answers.</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={data.companion ?? true}
              aria-checked={data.companion ?? true}
              disabled={mutation.isPending}
              onChange={(event) => save({ companion: event.currentTarget.checked })}
            />
          </label>
          <label className="practice-setting-row">
            <span>
              <strong>Sound</strong>
              <small>Quiet cues for earned rewards.</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={data.sound}
              aria-checked={data.sound}
              disabled={mutation.isPending}
              onChange={(event) => save({ sound: event.currentTarget.checked })}
            />
          </label>
          <form
            className="time-zone-setting"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              const resolved = resolveTimeZone(zone ?? data.timeZone, zones);
              if ("problem" in resolved) {
                setZoneProblem(resolved.problem);
                return;
              }
              setZoneProblem(null);
              setZone(resolved.zone);
              save({ timeZone: resolved.zone });
            }}
          >
            <label htmlFor="study-time-zone">Study time zone</label>
            <div>
              <input
                aria-describedby="study-time-zone-help"
                aria-invalid={zoneProblem ? true : undefined}
                autoComplete="off"
                id="study-time-zone"
                list="study-time-zone-list"
                maxLength={100}
                onChange={(event) => {
                  setZone(event.currentTarget.value);
                  setZoneProblem(null);
                }}
                placeholder="Search a city or region"
                spellCheck={false}
                type="search"
                value={zone ?? data.timeZone}
              />
              <datalist id="study-time-zone-list">
                {zones.map((name) => (
                  <option key={name} value={name}>
                    {name.replaceAll("_", " ")}
                  </option>
                ))}
              </datalist>
              <button
                className="button button-secondary"
                disabled={mutation.isPending}
                type="submit"
              >
                Save time zone
              </button>
            </div>
            {zoneProblem ? (
              <p className="settings-remedy" id="study-time-zone-help" role="alert">
                {zoneProblem}
              </p>
            ) : (
              <p className="settings-note" id="study-time-zone-help">
                Daily goals and streaks follow this calendar. Type a city to search the list.
              </p>
            )}
          </form>
        </>
      )}
      {mutation.error ? (
        <p role="alert" className="settings-remedy">
          {errorMessage(mutation.error, "Your preferences could not be saved.")}
        </p>
      ) : mutation.isSuccess ? (
        <p role="status" className="preferences-saved">
          Saved
        </p>
      ) : null}
    </section>
  );
}
