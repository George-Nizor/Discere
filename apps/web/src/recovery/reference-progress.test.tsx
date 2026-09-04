import type { RomanReferenceMilestoneId, RomanReferenceProgress } from "@discere/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "../api/queries.js";
import {
  ROMAN_REFERENCE_COURSE_ID,
  ROMAN_REFERENCE_LESSON_ID,
  useReferenceProgress,
} from "./reference-progress.js";
import { defaultRomanReferenceProgress } from "./roman-reference-test-fixtures.js";

const progressKey = queryKeys.romanReferenceProgress(
  ROMAN_REFERENCE_COURSE_ID,
  ROMAN_REFERENCE_LESSON_ID,
);

function progressWithMilestone(milestoneId: RomanReferenceMilestoneId): RomanReferenceProgress {
  const progress = defaultRomanReferenceProgress();
  progress.opening = {
    order: ["augustus", "extent", "division", "deposition"],
    submittedOrder: ["augustus", "extent", "division", "deposition"],
    status: "checked",
    wasCorrect: true,
  };
  progress.augustus.completed = true;
  progress.activeBeat = "expansion";
  progress.updatedAt = "2026-08-22T08:00:00.000Z";
  progress.expansion.milestoneId = milestoneId;
  return progress;
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, reject, resolve };
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  } as Response;
}

function SaveControl({
  milestoneId,
  onSave,
}: {
  milestoneId: RomanReferenceMilestoneId;
  onSave: (save: Promise<RomanReferenceProgress>) => void;
}) {
  const progress = useReferenceProgress();
  return (
    <button
      onClick={() => onSave(progress.save({ action: "select_expansion_milestone", milestoneId }))}
      type="button"
    >
      Save {milestoneId}
    </button>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reference progress write queue", () => {
  it("serialises writes across hook unmounts that share one query client", async () => {
    const firstResponse = deferred<Response>();
    const secondResponse = deferred<Response>();
    const started: RomanReferenceMilestoneId[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string | URL, init?: RequestInit) => {
        const action = JSON.parse(String(init?.body)) as {
          action: string;
          milestoneId: RomanReferenceMilestoneId;
        };
        expect(action.action).toBe("select_expansion_milestone");
        started.push(action.milestoneId);
        return action.milestoneId === "284-ce" ? firstResponse.promise : secondResponse.promise;
      }),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
    });
    queryClient.setQueryData(progressKey, progressWithMilestone("117-ce"));

    let firstSave: Promise<RomanReferenceProgress> | undefined;
    let secondSave: Promise<RomanReferenceProgress> | undefined;
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <SaveControl key="first" milestoneId="284-ce" onSave={(save) => (firstSave = save)} />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save 284-ce" }));
    await waitFor(() => expect(started).toEqual(["284-ce"]));

    rerender(
      <QueryClientProvider client={queryClient}>
        <SaveControl key="second" milestoneId="476-ce" onSave={(save) => (secondSave = save)} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save 476-ce" }));
    await act(async () => Promise.resolve());

    expect(secondSave).toBeInstanceOf(Promise);
    expect(started).toEqual(["284-ce"]);

    await act(async () => {
      firstResponse.resolve(jsonResponse(progressWithMilestone("284-ce")));
      await firstSave;
    });
    await waitFor(() => expect(started).toEqual(["284-ce", "476-ce"]));

    await act(async () => {
      secondResponse.resolve(jsonResponse(progressWithMilestone("476-ce")));
      await secondSave;
    });

    expect(
      queryClient.getQueryData<RomanReferenceProgress>(progressKey)?.expansion.milestoneId,
    ).toBe("476-ce");
  });
});
