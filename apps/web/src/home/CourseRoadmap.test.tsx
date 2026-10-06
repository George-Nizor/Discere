import type { CourseDetailResponse } from "@discere/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as renderBare, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stubFetch } from "../test/harness.js";
import { CourseRoadmap } from "./CourseRoadmap.js";

const render = (ui: ReactElement) =>
  renderBare(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>,
  );
const placement = vi.hoisted(() => ({
  current: { placedOut: new Set<string>(), startLessonId: null as string | null },
}));
vi.mock("../checks/check-model.js", async (original) => ({
  ...(await original<typeof import("../checks/check-model.js")>()),
  usePlacement: () => placement.current,
}));
afterEach(() => {
  vi.unstubAllGlobals();
  placement.current = { placedOut: new Set<string>(), startLessonId: null };
});
const noChecks = () => stubFetch({ "GET /api/courses/maths/checks": { body: { checks: [] } } });
const detail: CourseDetailResponse = {
  course: {
    id: "maths",
    title: "Maths",
    description: "Explore algebra.",
    lessonCount: 3,
    availableLessonIds: ["one", "two", "three"],
    lastActiveAt: null,
    accent: "#be185d",
    coverUrl: "",
    status: "available",
    subjects: ["Mathematics"],
    completedLessonCount: 1,
  },
  lessons: ["one", "two", "three"].map((id, index) => ({
    id,
    title: "Lesson " + id,
    orientation: "Try a new example.",
    conceptIds: [id],
    available: true,
    stageCount: 5,
    completed: index === 0,
  })),
  concepts: [{ id: "one", title: "Numbers", summary: "Use numbers." }],
  modules: [
    {
      id: "first",
      title: "Rearranging",
      description: "Keep an equation balanced.",
      lessonIds: ["one", "two", "three"],
    },
  ],
};
describe("course roadmap", () => {
  it("shows earned pedestals and opens the first unfinished lesson", () => {
    noChecks();
    render(
      <MemoryRouter>
        <CourseRoadmap detail={detail} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "Lesson one, completed" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Lesson two, next lesson" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("link", { name: "Start lesson" })).toHaveAttribute(
      "href",
      "/courses/maths/lessons/two",
    );
    expect(screen.getByRole("heading", { name: "Rearranging" })).toBeInTheDocument();
  });
  it("selects an available lesson and offers a working revisit action for completed lessons", async () => {
    noChecks();
    render(
      <MemoryRouter>
        <CourseRoadmap detail={detail} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Lesson one, completed" }));
    expect(screen.getByRole("link", { name: "Revisit lesson" })).toHaveAttribute(
      "href",
      "/courses/maths/lessons/one",
    );
    await userEvent.click(screen.getByRole("button", { name: "Lesson three" }));
    expect(screen.getByRole("link", { name: "Start lesson" })).toHaveAttribute(
      "href",
      "/courses/maths/lessons/three",
    );
  });
  it("marks lessons a placement showed as known and moves the start past them", async () => {
    placement.current = { placedOut: new Set(["two"]), startLessonId: "three" };
    render(
      <MemoryRouter>
        <CourseRoadmap detail={detail} />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("button", {
        name: "Lesson two, known from your placement, optional",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lesson three, next lesson" })).toBeInTheDocument();
  });
});
