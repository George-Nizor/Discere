import type { LearnerQuestion } from "@discere/contracts";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/harness.js";
import { ModeProvider } from "../mode-context.js";
import { PlayerFooterProvider, PlayerFooterSurface } from "../player-footer.js";
import { AttemptMemoryContext, type AttemptSnapshot } from "../quiz-shared/use-attempt.js";
import { PromptText, QuestionBlock } from "../stages/QuestionBlock.js";
import { AnswerInput } from "./AnswerInput.js";
import { type AnswerDraft, answerResponse, initialAnswerDraft, shuffled } from "./answer-draft.js";

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

const base = { conceptIds: ["c"], difficulty: 1, hintCount: 1, sourceIds: ["s"] };
const orderQuestion: LearnerQuestion = {
  ...base,
  id: "q-order",
  prompt: "Four things happened. In what order did they happen?",
  responseType: "order",
  order: {
    items: [
      { id: "ia", label: "Alpha" },
      { id: "ib", label: "Beta" },
      { id: "ic", label: "Gamma" },
      { id: "id", label: "Delta" },
    ],
  },
};
const sortQuestion: LearnerQuestion = {
  ...base,
  id: "q-sort",
  prompt: "Which group does each belong in?",
  responseType: "sort",
  sort: {
    bins: [
      { id: "scalar", label: "Scalar" },
      { id: "vector", label: "Vector" },
    ],
    items: [
      { id: "im", label: "Mass" },
      { id: "is", label: "Speed" },
      { id: "iv", label: "Velocity" },
      { id: "if", label: "Force" },
    ],
  },
};
const ATTEMPT = "11111111-1111-4111-8111-111111111111";

/** An answer input that keeps its own draft, as a question screen does. */
function Held({
  question,
  start,
  onDraft,
}: {
  question: LearnerQuestion;
  start: AnswerDraft;
  onDraft?: (draft: AnswerDraft) => void;
}) {
  const [draft, setDraft] = useState(start);
  return (
    <AnswerInput
      answered={false}
      correct={false}
      draft={draft}
      onChange={(next) => {
        setDraft(next);
        onDraft?.(next);
      }}
      question={question}
    />
  );
}
const orderShown = () =>
  within(screen.getByRole("list"))
    .getAllByRole("listitem")
    .map((item) => item.querySelector(".order-item-label")?.textContent);

describe("the arrangement a question starts in", () => {
  it("deals the same arrangement for the same seed and another for another seed", () => {
    const items = ["a", "b", "c", "d", "e", "f", "g"];
    expect(shuffled(items, 7)).toEqual(shuffled(items, 7));
    expect([...shuffled(items, 7)].sort()).toEqual(items);
    const seen = new Set([1, 2, 3, 4, 5, 6].map((seed) => shuffled(items, seed).join("")));
    expect(seen.size).toBeGreaterThan(3);
    expect(initialAnswerDraft(orderQuestion, 42)).toEqual(initialAnswerDraft(orderQuestion, 42));
  });

  it("sends an order as soon as it is shown, and a sorting only once every item is placed", () => {
    const order = initialAnswerDraft(orderQuestion, 1);
    expect(answerResponse(orderQuestion, order).split(",")).toHaveLength(4);
    const sort = initialAnswerDraft(sortQuestion, 1);
    expect(answerResponse(sortQuestion, sort)).toBe("");
    expect(
      answerResponse(sortQuestion, {
        kind: "sort",
        ids: ["im", "is", "iv", "if"],
        placed: { iv: "vector", im: "scalar", is: "scalar", if: "vector" },
      }),
    ).toBe("if:vector,im:scalar,is:scalar,iv:vector");
  });
});

describe("an order answer", () => {
  const start: AnswerDraft = { kind: "order", ids: ["ib", "ia", "id", "ic"] };

  it("moves an item with its buttons and says where it now is", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Held question={orderQuestion} start={start} />);
    expect(orderShown()).toEqual(["Beta", "Alpha", "Delta", "Gamma"]);
    await user.click(screen.getByRole("button", { name: "Move up: Alpha" }));
    expect(orderShown()).toEqual(["Alpha", "Beta", "Delta", "Gamma"]);
    expect(screen.getByTestId("order-announcement")).toHaveTextContent("Alpha is now 1 of 4.");
    await user.click(screen.getByRole("button", { name: "Move down: Delta" }));
    expect(orderShown()).toEqual(["Alpha", "Beta", "Gamma", "Delta"]);
    expect(screen.getByTestId("order-announcement")).toHaveTextContent("Delta is now 4 of 4.");
  });

  it("is worked with the keyboard alone: Tab to an item, arrows to move it, focus stays on it", async () => {
    const user = userEvent.setup();
    const drafts: AnswerDraft[] = [];
    renderWithProviders(
      <Held question={orderQuestion} start={start} onDraft={(draft) => drafts.push(draft)} />,
    );
    await user.tab();
    expect(screen.getByRole("button", { name: "Move up: Beta" })).toHaveFocus();
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(orderShown()).toEqual(["Alpha", "Delta", "Beta", "Gamma"]);
    expect(screen.getByRole("button", { name: "Move up: Beta" })).toHaveFocus();
    expect(screen.getByTestId("order-announcement")).toHaveTextContent("Beta is now 3 of 4.");
    await user.keyboard("{ArrowUp}");
    expect(orderShown()).toEqual(["Alpha", "Beta", "Delta", "Gamma"]);
    // Enter and Space press the focused button, as on any button.
    await user.tab();
    expect(screen.getByRole("button", { name: "Move down: Beta" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(orderShown()).toEqual(["Alpha", "Delta", "Beta", "Gamma"]);
    expect(drafts.at(-1)).toEqual({ kind: "order", ids: ["ia", "id", "ib", "ic"] });
  });

  it("keeps the end buttons focusable and does nothing past either end", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Held question={orderQuestion} start={start} />);
    const up = screen.getByRole("button", { name: "Move up: Beta" });
    expect(up).toHaveAttribute("aria-disabled", "true");
    expect(up).not.toBeDisabled();
    await user.click(up);
    expect(orderShown()).toEqual(["Beta", "Alpha", "Delta", "Gamma"]);
    expect(screen.getByRole("button", { name: "Move down: Gamma" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("does not move while it is locked", async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <AnswerInput
        answered={false}
        correct={false}
        draft={start}
        onChange={onChange}
        question={orderQuestion}
        readOnly
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Move up: Alpha" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows the right order once the question has closed, marking what the learner had in place", () => {
    renderWithProviders(
      <AnswerInput
        answered
        correct={false}
        draft={{ kind: "order", ids: ["ia", "ic", "ib", "id"] }}
        onChange={() => {}}
        question={orderQuestion}
        readOnly
        solution={{ order: ["ia", "ib", "ic", "id"] }}
      />,
    );
    expect(screen.getByRole("list", { name: "The right order" })).toBeInTheDocument();
    expect(orderShown()).toEqual(["Alpha", "Beta", "Gamma", "Delta"]);
    expect(screen.getAllByLabelText("You had this in the right place")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /Move/ })).not.toBeInTheDocument();
    expect(screen.getByText("This is the right order.")).toBeInTheDocument();
  });
});

describe("a sort answer", () => {
  const start: AnswerDraft = { kind: "sort", ids: ["iv", "im", "if", "is"], placed: {} };
  const bin = (name: string) => screen.getByRole("region", { name });

  it("places an item by choosing it and then choosing a group", async () => {
    const user = userEvent.setup();
    const drafts: AnswerDraft[] = [];
    renderWithProviders(
      <Held question={sortQuestion} start={start} onDraft={(draft) => drafts.push(draft)} />,
    );
    // Until an item is chosen, a group cannot be chosen, and says so.
    const scalar = screen.getByRole("button", { name: /^Scalar\. 0 placed\. Choose an item first\.$/ });
    expect(scalar).toHaveAttribute("aria-disabled", "true");
    await user.click(scalar);
    expect(drafts).toEqual([]);

    await user.click(screen.getByRole("button", { name: "Mass" }));
    expect(screen.getByRole("button", { name: "Mass" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Put Mass in Scalar" }));
    expect(within(bin("Scalar")).getByRole("button", { name: "Mass" })).toBeInTheDocument();
    expect(screen.getByTestId("sort-announcement")).toHaveTextContent("Mass is in Scalar.");
    expect(drafts.at(-1)).toMatchObject({ placed: { im: "scalar" } });
  });

  it("moves a placed item to another group, or back to the list", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Held question={sortQuestion} start={{ ...start, placed: { im: "vector" } }} />,
    );
    await user.click(within(bin("Vector")).getByRole("button", { name: "Mass" }));
    await user.click(screen.getByRole("button", { name: "Put Mass in Scalar" }));
    expect(within(bin("Scalar")).getByRole("button", { name: "Mass" })).toBeInTheDocument();
    expect(within(bin("Vector")).queryByRole("button", { name: "Mass" })).not.toBeInTheDocument();

    await user.click(within(bin("Scalar")).getByRole("button", { name: "Mass" }));
    await user.click(screen.getByRole("button", { name: "Move it back to the list" }));
    expect(
      within(screen.getByRole("group", { name: "Items to sort" })).getByRole("button", {
        name: "Mass",
      }),
    ).toHaveFocus();
    expect(screen.getByTestId("sort-announcement")).toHaveTextContent("Mass is back in the list.");
  });

  it("is worked with the keyboard alone, and focus goes on to the next item waiting", async () => {
    const user = userEvent.setup();
    const drafts: AnswerDraft[] = [];
    renderWithProviders(
      <Held question={sortQuestion} start={start} onDraft={(draft) => drafts.push(draft)} />,
    );
    await user.tab();
    expect(screen.getByRole("button", { name: "Velocity" })).toHaveFocus();
    await user.keyboard("{Enter}");
    // Tab passes the other three items and reaches the groups: Scalar, then Vector.
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    expect(screen.getByRole("button", { name: "Put Velocity in Vector" })).toHaveFocus();
    await user.keyboard(" ");
    expect(drafts.at(-1)).toMatchObject({ placed: { iv: "vector" } });
    expect(screen.getByRole("button", { name: "Mass" })).toHaveFocus();
    // The last item placed leaves focus on its group, since nothing is waiting.
    for (const [item, group] of [
      ["Mass", "Scalar"],
      ["Force", "Vector"],
      ["Speed", "Scalar"],
    ] as const) {
      await user.click(screen.getByRole("button", { name: item }));
      await user.click(screen.getByRole("button", { name: `Put ${item} in ${group}` }));
    }
    expect(screen.getByText("Every item is in a group.")).toBeInTheDocument();
    expect(drafts.at(-1)).toMatchObject({
      placed: { iv: "vector", im: "scalar", if: "vector", is: "scalar" },
    });
  });

  it("shows each item in its group with its explanation once the question has closed", () => {
    renderWithProviders(
      <AnswerInput
        answered
        correct={false}
        draft={{
          kind: "sort",
          ids: ["iv", "im", "if", "is"],
          placed: { im: "scalar", is: "vector", iv: "vector", if: "vector" },
        }}
        onChange={() => {}}
        question={sortQuestion}
        readOnly
        solution={{
          sort: [
            { id: "im", bin: "scalar", explanation: "Mass has size only." },
            { id: "is", bin: "scalar", explanation: "Speed has no direction." },
            { id: "iv", bin: "vector" },
            { id: "if", bin: "vector" },
          ],
        }}
      />,
    );
    const scalar = bin("Scalar");
    expect(within(scalar).getByText("Speed")).toBeInTheDocument();
    expect(within(scalar).getByText("You put this in Vector.")).toBeInTheDocument();
    expect(within(scalar).getByText("Speed has no direction.")).toBeInTheDocument();
    expect(screen.getAllByLabelText("You placed this here")).toHaveLength(3);
    expect(screen.getAllByLabelText("You placed this elsewhere")).toHaveLength(1);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("an order question on a lesson screen", () => {
  const context = { courseId: "c", lessonId: "l", stepId: "s" };
  const marked = (correct: boolean, feedback: string, extra: object = {}) => ({
    body: {
      attemptId: ATTEMPT,
      correct,
      feedback,
      xpAwarded: 0,
      mastery: 0.1,
      independent: false,
      qualifying: true,
      allowedMisses: 2,
      ...extra,
    },
  });
  function Screen({ memory }: { memory: Map<string, AttemptSnapshot> }) {
    return (
      <ModeProvider lessonId="l">
        <AttemptMemoryContext.Provider value={memory}>
          <PlayerFooterProvider enabled>
            <QuestionBlock context={context} question={orderQuestion} />
            <PlayerFooterSurface />
          </PlayerFooterProvider>
        </AttemptMemoryContext.Provider>
      </ModeProvider>
    );
  }

  it("says how many are in place after a miss, then shows the right order after the last one", async () => {
    const user = userEvent.setup();
    let checks = 0;
    const { calls } = stubFetch({
      "POST /api/attempts": () => {
        checks += 1;
        return checks === 1
          ? marked(false, "2 of 4 are in the right place.", { misses: 1 })
          : marked(false, "None are in the right place.", { misses: 2, closed: true });
      },
      [`POST /api/attempts/${ATTEMPT}/lesson-feedback`]: {
        body: {
          attemptId: ATTEMPT,
          correct: false,
          answer: "Alpha came first because it was the cause of the rest.",
          blocks: [],
          reviewRequired: true,
          solution: { order: ["ia", "ib", "ic", "id"] },
        },
      },
    });
    renderWithProviders(<Screen memory={new Map()} />);
    const before = orderShown();
    await user.click(screen.getByRole("button", { name: "Check answer" }));
    expect(await screen.findByText("2 of 4 are in the right place.")).toBeInTheDocument();
    expect(screen.getByText("Not quite")).toBeInTheDocument();
    // The list is as the learner left it: nothing shows which two were right.
    expect(orderShown()).toEqual(before);
    expect(screen.queryByLabelText("You had this in the right place")).not.toBeInTheDocument();
    expect(calls[0]?.body).toMatchObject({ questionId: "q-order", lesson: context });
    expect(String((calls[0]!.body as { response: string }).response).split(",").sort()).toEqual([
      "ia",
      "ib",
      "ic",
      "id",
    ]);

    // The same arrangement cannot be checked twice; a move makes it a new answer.
    expect(screen.getByRole("button", { name: "Check again" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    const first = before[0] as string;
    await user.click(screen.getByRole("button", { name: `Move down: ${first}` }));
    await user.click(screen.getByRole("button", { name: "Check again" }));
    expect(await screen.findByRole("list", { name: "The right order" })).toBeInTheDocument();
    expect(orderShown()).toEqual(["Alpha", "Beta", "Gamma", "Delta"]);
    expect(screen.getByText("Not quite. Here is the answer")).toBeInTheDocument();
    expect(
      screen.getByText("Alpha came first because it was the cause of the rest."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Check/ })).not.toBeInTheDocument();
  });

  it("deals the items the same way when the learner comes back to the screen in one visit", () => {
    stubFetch({});
    const memory = new Map<string, AttemptSnapshot>();
    const first = renderWithProviders(<Screen memory={memory} />);
    const dealt = orderShown();
    first.unmount();
    renderWithProviders(<Screen memory={memory} />);
    expect(orderShown()).toEqual(dealt);
  });
});

describe("extracts in a prompt", () => {
  const extracts = [
    { text: "I restored liberty.", who: "Augustus, Res Gestae", when: "14 CE", kind: "His own record" },
    { text: "He won them over with gifts.", who: "Tacitus, Annals", when: "about 116 CE", kind: "A later history" },
  ];

  it("sets a pair between the setup and the question, each under its name and above its attribution", () => {
    const { container } = renderWithProviders(
      <h1>
        <PromptText prompt="Two accounts of one rise. Which claim should be tested?" extracts={extracts} />
      </h1>,
    );
    expect(container.querySelector(".prompt-sources")).toHaveClass("is-pair");
    const parts = [...container.querySelectorAll("h1 > span")].map((part) => part.className);
    expect(parts).toEqual(["prompt-setup", "prompt-sources is-pair", "prompt-ask"]);
    const sources = [...container.querySelectorAll(".prompt-source")];
    expect(sources.map((source) => source.querySelector(".prompt-source-name")?.textContent)).toEqual([
      "Source A",
      "Source B",
    ]);
    expect(sources[0]?.querySelector(".prompt-quote")).toHaveTextContent("I restored liberty.");
    expect(sources[0]?.querySelector(".prompt-attribution")).toHaveTextContent(
      "Augustus, Res Gestae, 14 CE. His own record.",
    );
    expect(sources[1]?.querySelector(".prompt-attribution")).toHaveTextContent(
      "Tacitus, Annals, about 116 CE. A later history.",
    );
  });

  it("gives a single extract its attribution and no source name", () => {
    const { container } = renderWithProviders(
      <p>
        <PromptText prompt="What is this evidence of?" extracts={extracts.slice(0, 1)} />
      </p>,
    );
    expect(container.querySelector(".prompt-sources")).not.toHaveClass("is-pair");
    expect(container.querySelector(".prompt-source-name")).toBeNull();
    expect(container.querySelector(".prompt-attribution")).toHaveTextContent("Augustus, Res Gestae");
    expect(container.querySelector(".prompt-ask")).toHaveTextContent("What is this evidence of?");
  });

  it("still shows a quoted paragraph written into an older prompt", () => {
    const { container } = renderWithProviders(
      <p>
        <PromptText prompt={"A chronicler writes.\n\n> So very narrowly did he survey.\n\nWhat does he think?"} />
      </p>,
    );
    expect(container.querySelector(".prompt-quote")).toHaveTextContent("So very narrowly did he survey.");
    expect(container.querySelector(".prompt-attribution")).toBeNull();
  });
});
