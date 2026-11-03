import type { CourseDetailResponse } from "@discere/contracts";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/harness.js";
import { CourseReset } from "./CourseReset.js";

afterEach(() => vi.unstubAllGlobals());

const detail = (lastActiveAt: string | null, completedLessonCount = 0) =>
  ({
    course: {
      id: "maths-foundations",
      title: "Maths Foundations",
      lastActiveAt,
      completedLessonCount,
    },
  }) as unknown as CourseDetailResponse;

describe("CourseReset", () => {
  it("is absent until the course has been started", () => {
    renderWithProviders(<CourseReset detail={detail(null)} />);
    expect(screen.queryByRole("button", { name: /Start again/ })).not.toBeInTheDocument();
  });

  it("asks once, then clears the course's progress", async () => {
    const fetch = stubFetch({
      "DELETE /api/courses/maths-foundations/progress": { body: { stages: 4, checks: 0 } },
    });
    renderWithProviders(<CourseReset detail={detail("2026-11-03T10:00:00.000Z", 2)} />);
    await userEvent.click(screen.getByRole("button", { name: "Start again…" }));
    expect(screen.getByText(/Your XP, review cards and past answers are kept/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(fetch.calls).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Start again…" }));
    await userEvent.click(screen.getByRole("button", { name: "Start again" }));
    expect(fetch.calls.map((call) => call.key)).toEqual([
      "DELETE /api/courses/maths-foundations/progress",
    ]);
  });
});
