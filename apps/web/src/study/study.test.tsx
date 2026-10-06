import { StrictMode } from "react";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/harness.js";
import { studyFixture } from "../test/study-fixture.js";
import { StudyRhythm } from "./StudyRhythm.js";
import { StudyPreferences } from "./StudyPreferences.js";
import { Celebration } from "./Celebration.js";
import { ExperienceProvider, cacheExperience, EXPERIENCE_KEY } from "./experience.js";
afterEach(() => vi.unstubAllGlobals());

describe("study experience", () => {
  it("shows that the streak is active before the larger daily goal is reached", () => {
    renderWithProviders(<StudyRhythm study={studyFixture} />);
    expect(screen.getByText("4 more responses, or finish a lesson.")).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "2026-08-19: studied" })).toHaveAttribute(
      "aria-current",
      "date",
    );
    expect(screen.getByText("1 freeze")).toBeInTheDocument();
    expect(screen.getByText(/Today counts\./)).toBeInTheDocument();
  });
  it("saves the selected goal on the server and preserves the preference across reloads", async () => {
    let saved = studyFixture.preferences;
    const { calls } = stubFetch({
      "GET /api/study/preferences": () => ({ body: saved }),
      "PUT /api/study/preferences": ({ body }) => {
        saved = { ...saved, ...(body as object) };
        return { body: saved };
      },
    });
    const rendered = renderWithProviders(<StudyPreferences />);
    await userEvent.click(await screen.findByRole("radio", { name: /^3 responses/ }));
    expect(await screen.findByRole("status")).toHaveTextContent("Saved");
    expect(calls.find((call) => call.key.startsWith("PUT"))?.body).toEqual({ dailyGoal: 3 });
    expect(JSON.parse(localStorage.getItem(EXPERIENCE_KEY)!)).toMatchObject({ dailyGoal: 3 });
    rendered.unmount();
    renderWithProviders(<StudyPreferences />);
    expect(await screen.findByRole("radio", { name: /^3 responses/ })).toBeChecked();
  });
  it("takes reduced motion from the cached preference before the server answers", async () => {
    cacheExperience({ ...studyFixture.preferences, motion: "reduced" });
    stubFetch({
      "GET /api/study/preferences": { body: { ...studyFixture.preferences, motion: "reduced" } },
    });
    const onCelebrate = vi.fn();
    const { container } = renderWithProviders(
      <ExperienceProvider>
        <Celebration fresh eventKey="reduced-test" onCelebrate={onCelebrate} />
      </ExperienceProvider>,
    );
    expect(document.documentElement.dataset["motion"]).toBe("reduced");
    await waitFor(() => expect(onCelebrate).toHaveBeenCalledOnce());
    expect(container.querySelector(".is-celebrating")).toBeNull();
    expect(container.querySelector(".award-medallion")).not.toBeNull();
  });
  it("responds when the device preference changes during a lesson", async () => {
    const queries = new Map<string, { matches: boolean; listener?: () => void }>();
    vi.stubGlobal("matchMedia", (query: string) => {
      const entry = queries.get(query) ?? { matches: false };
      queries.set(query, entry);
      return {
        get matches() {
          return entry.matches;
        },
        addEventListener: (_type: string, listener: () => void) => {
          entry.listener = listener;
        },
        removeEventListener: vi.fn(),
      };
    });
    stubFetch({
      "GET /api/study/preferences": { body: { ...studyFixture.preferences, theme: "system" } },
    });
    renderWithProviders(
      <ExperienceProvider>
        <span>Lesson</span>
      </ExperienceProvider>,
    );
    expect(document.documentElement.dataset["motion"]).toBe("system");
    const flip = (query: string) =>
      act(() => {
        const entry = queries.get(query)!;
        entry.matches = true;
        entry.listener?.();
      });
    flip("(prefers-reduced-motion: reduce)");
    expect(document.documentElement.dataset["motion"]).toBe("reduced");
    await waitFor(() => expect(document.documentElement.dataset["theme"]).toBe("dark"));
    flip("(prefers-color-scheme: light)");
    expect(document.documentElement.dataset["theme"]).toBe("light");
  });
  it("applies the chosen theme and background to the page", async () => {
    stubFetch({
      "GET /api/study/preferences": {
        body: { ...studyFixture.preferences, theme: "light", backdrop: "calm" },
      },
    });
    renderWithProviders(
      <ExperienceProvider>
        <span>Lesson</span>
      </ExperienceProvider>,
    );
    await waitFor(() => expect(document.documentElement.dataset["theme"]).toBe("light"));
    expect(document.documentElement.dataset["backdrop"]).toBe("calm");
  });
  it("plays a newly earned celebration once even under StrictMode and on a revisit", async () => {
    const onCelebrate = vi.fn();
    const rendered = renderWithProviders(
      <StrictMode>
        <Celebration fresh eventKey="strict-mode-test" onCelebrate={onCelebrate} />
      </StrictMode>,
    );
    await waitFor(() => expect(onCelebrate).toHaveBeenCalledOnce());
    expect(rendered.container.querySelectorAll(".award-particles i")).toHaveLength(14);
    rendered.unmount();
    const revisit = renderWithProviders(
      <Celebration fresh eventKey="strict-mode-test" onCelebrate={onCelebrate} />,
    );
    expect(revisit.container.querySelector(".is-celebrating")).toBeNull();
    expect(onCelebrate).toHaveBeenCalledOnce();
  });
  it("never celebrates an already completed lesson opened from a bookmark", () => {
    const onCelebrate = vi.fn();
    const rendered = renderWithProviders(
      <Celebration fresh={false} eventKey="bookmark-test" onCelebrate={onCelebrate} />,
    );
    expect(rendered.container.querySelector(".is-celebrating")).toBeNull();
    expect(onCelebrate).not.toHaveBeenCalled();
  });
});
