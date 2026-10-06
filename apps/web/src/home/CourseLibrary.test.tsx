import type { CourseSummary } from "@discere/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render as renderBare, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stubFetch } from "../test/harness.js";
import { CourseLibrary } from "./CourseLibrary.js";
import { courseProgress, filterCourses, progressFilter } from "./library.js";

// The library asks the engine for lesson matches; these tests answer with none unless stubbed.
const render = (ui: ReactElement) =>
  renderBare(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>,
  );
const course = (
  id: string,
  title: string,
  subjects: string[],
  extra: Partial<CourseSummary> = {},
): CourseSummary => ({
  id,
  title,
  subjects,
  description: "Explore ideas through examples.",
  accent: "#2563a8",
  coverUrl: "",
  status: "available",
  lessonCount: 6,
  availableLessonIds: [id + "-one"],
  completedLessonCount: 0,
  lastActiveAt: null,
  ...extra,
});
const courses = [
  course("maths", "Maths Foundations", ["Mathematics"]),
  course("stats", "Probability and Statistics", ["Mathematics", "Data literacy"], {
    lastActiveAt: "2026-10-01T00:00:00.000Z",
  }),
  course("logic", "Logic and Reasoning", ["Philosophy"], { completedLessonCount: 6 }),
  course("draft", "Future Ideas", ["Mathematics"], { status: "coming_soon" }),
];
function Address() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output aria-label="Address">{location.search}</output>
      <button type="button" onClick={() => navigate(-1)}>
        Back
      </button>
    </>
  );
}
const show = (path = "/courses") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <CourseLibrary courses={courses} />
      <Address />
    </MemoryRouter>,
  );
describe("course discovery", () => {
  it("places the linear algebra course in the mathematics learning path", () => {
    render(
      <MemoryRouter>
        <CourseLibrary
          courses={[
            course("geometry-shape-and-space", "Geometry", ["Mathematics"]),
            course("linear-algebra-vectors-and-maps", "Linear Algebra: Vectors and Maps", [
              "Mathematics",
              "Linear Algebra",
            ]),
            course("calculus-change-and-accumulation", "Calculus", ["Mathematics"]),
          ]}
        />
      </MemoryRouter>,
    );
    const path = screen.getByRole("region", { name: "Foundations for thinking" });
    expect(
      within(path)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual([
      "/courses/geometry-shape-and-space",
      "/courses/linear-algebra-vectors-and-maps",
      "/courses/calculus-change-and-accumulation",
    ]);
    expect(screen.queryByRole("region", { name: "Explore more" })).not.toBeInTheDocument();
  });
  it("retains a newly selected subject when search follows before navigation settles", () => {
    show("/courses?source=home");
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Mathematics" }));
      fireEvent.change(screen.getByRole("searchbox"), { target: { value: "probability" } });
    });
    expect(screen.getByRole("button", { name: "Mathematics" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("searchbox")).toHaveValue("probability");
    expect(screen.getByLabelText("Address")).toHaveTextContent("source=home");
    expect(screen.getByLabelText("Address")).toHaveTextContent("subject=Mathematics");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
  it("searches title and subject together and excludes unavailable lessons", () => {
    expect(filterCourses(courses, "statistics data", "", "all").map((item) => item.id)).toEqual([
      "stats",
    ]);
    expect(filterCourses(courses, "", "Mathematics", "all")).toHaveLength(2);
    expect(filterCourses(courses, "", "", "not-started").map((item) => item.id)).toEqual(["maths"]);
    expect(filterCourses(courses, "", "", "in-progress").map((item) => item.id)).toEqual(["stats"]);
    expect(filterCourses(courses, "", "", "completed").map((item) => item.id)).toEqual(["logic"]);
    expect(courseProgress(course("started", "Started", [], { completedLessonCount: 1 }))).toBe(
      "in-progress",
    );
    expect(progressFilter("unknown")).toBe("all");
  });
  it("restores address filters on entry and retains unrelated parameters when clearing", async () => {
    show("/courses?q=probability&subject=Mathematics&progress=in-progress&source=home");
    expect(screen.getByRole("searchbox")).toHaveValue("probability");
    expect(screen.getByRole("combobox", { name: "Progress" })).toHaveValue("in-progress");
    expect(screen.getByRole("link", { name: /Probability and Statistics/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Maths Foundations/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByLabelText("Address")).toHaveTextContent("?source=home");
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });
  it("lets browser back return to the previous subject and offers a working empty state", async () => {
    show();
    await userEvent.click(screen.getByRole("button", { name: "Mathematics" }));
    expect(screen.getAllByRole("link")).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Philosophy" }));
    expect(screen.getAllByRole("link")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("button", { name: "Mathematics" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.type(screen.getByRole("searchbox"), "unmatched");
    expect(
      await screen.findByRole("heading", { name: "Nothing matches that search" }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show all courses" }));
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });
  it("finds lessons by the ideas they teach and links straight to the lesson", async () => {
    stubFetch({
      "GET /api/search": {
        body: {
          query: "bayes",
          lessons: [
            {
              courseId: "psychology-how-minds-work",
              courseTitle: "Psychology: How Minds Work",
              lessonId: "base-rates-and-bayes",
              lessonTitle: "Base rates and Bayes",
              match: "lesson",
              snippet: "Turn a test result into a probability.",
            },
          ],
        },
      },
    });
    show("/courses?q=bayes");
    const match = await screen.findByRole("link", { name: /Base rates and Bayes/ });
    expect(match).toHaveAttribute(
      "href",
      "/courses/psychology-how-minds-work/lessons/base-rates-and-bayes",
    );
    expect(screen.queryByRole("heading", { name: /Nothing matches/ })).not.toBeInTheDocument();
    expect(screen.getByText(/1 lesson/)).toBeInTheDocument();
  });
});
afterEach(() => vi.unstubAllGlobals());
