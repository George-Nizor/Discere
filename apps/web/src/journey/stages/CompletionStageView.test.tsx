import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/harness.js";
import { CompletionStageView } from "./CompletionStageView.js";

vi.mock("../../api/queries.js", () => ({
  useHome: () => ({ data: undefined }),
  useStudy: () => ({ data: undefined }),
  queryKeys: { lessonResult: (course: string, lesson: string) => ["result", course, lesson] },
}));
afterEach(() => vi.unstubAllGlobals());
const stage = {
  id: "last:completion",
  type: "completion" as const,
  title: "Ready for the next idea",
  optional: false,
  conceptIds: ["lines"],
  sourceIds: [],
  completionPolicy: "view" as const,
  concepts: ["lines"],
  nextAction: "Return to your review queue.",
};
function setup(status: "available" | "locked" | "in_progress") {
  return stubFetch({
    "GET /api/courses/maths-foundations/checks": {
      body: {
        checks: [
          {
            id: "mixed-challenge",
            courseId: "maths-foundations",
            courseTitle: "Maths Foundations",
            kind: "checkpoint",
            title: "Bring it together",
            description: "Fresh mixed questions.",
            questionCount: 8,
            status,
            remainingLessons: status === "locked" ? 1 : 0,
          },
        ],
      },
    },
    "GET /api/courses/maths-foundations/lessons/last/result": {
      body: {
        lessonId: "last",
        completed: true,
        completedAt: "2026-10-02T12:00:00Z",
        xp: 150,
        answered: 6,
        correct: 6,
        independent: 6,
        assisted: 0,
        reviews: 2,
      },
    },
  });
}
it("offers the available mixed check as the final lesson's next action", async () => {
  setup("available");
  renderWithProviders(
    <CompletionStageView
      stage={stage}
      courseId="maths-foundations"
      lessonId="last"
      nextLesson={null}
    />,
  );
  expect(await screen.findByRole("link", { name: "Start Bring it together" })).toHaveAttribute(
    "href",
    "/courses/maths-foundations/checks/mixed-challenge",
  );
  expect(screen.getByRole("heading", { name: "Ready for the course check" })).toBeInTheDocument();
});
it("uses the roadmap while the server still requires earlier lessons", async () => {
  const { calls } = setup("locked");
  renderWithProviders(
    <CompletionStageView
      stage={stage}
      courseId="maths-foundations"
      lessonId="last"
      nextLesson={null}
    />,
  );
  await waitFor(() => expect(calls.some((call) => call.key.endsWith("/checks"))).toBe(true));
  expect(screen.getByRole("link", { name: "Back to the course" })).toHaveAttribute(
    "href",
    "/courses/maths-foundations",
  );
  expect(screen.queryByRole("link", { name: /Start Bring/ })).not.toBeInTheDocument();
});
it("resumes an existing mixed check without creating another session", async () => {
  setup("in_progress");
  renderWithProviders(
    <CompletionStageView
      stage={stage}
      courseId="maths-foundations"
      lessonId="last"
      nextLesson={null}
    />,
  );
  expect(await screen.findByRole("link", { name: "Continue Bring it together" })).toHaveAttribute(
    "href",
    "/courses/maths-foundations/checks/mixed-challenge",
  );
});

it("refreshes a recently cached locked check after the final lesson", async () => {
  setup("available");
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
  });
  client.setQueryData(["course-checks", "maths-foundations"], {
    checks: [
      {
        id: "mixed-challenge",
        courseId: "maths-foundations",
        courseTitle: "Maths Foundations",
        kind: "checkpoint",
        title: "Bring it together",
        description: "Fresh mixed questions.",
        questionCount: 8,
        status: "locked",
        remainingLessons: 1,
      },
    ],
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CompletionStageView
          stage={stage}
          courseId="maths-foundations"
          lessonId="last"
          nextLesson={null}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(await screen.findByRole("link", { name: "Start Bring it together" })).toBeInTheDocument();
  client.clear();
});
