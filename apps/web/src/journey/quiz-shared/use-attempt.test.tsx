import { act, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/harness.js";
import { useAttempt } from "./use-attempt.js";
import { ModeProvider } from "../mode-context.js";
afterEach(() => vi.unstubAllGlobals());

function Answer() {
  const attempt = useAttempt({
    id: "q",
    conceptIds: [],
    prompt: "A question",
    responseType: "short_text",
    difficulty: 1,
    hintCount: 0,
    sourceIds: [],
  });
  return (
    <>
      <input
        aria-label="Response"
        value={attempt.draft.kind === "text" ? attempt.draft.text : ""}
        onChange={(event) => attempt.setDraft({ kind: "text", text: event.currentTarget.value })}
      />
      <button
        type="button"
        onClick={() => {
          void attempt.send();
          void attempt.send();
        }}
      >
        Check
      </button>
      <p role="status">
        {attempt.busy ? "Checking" : (attempt.failure ?? attempt.result?.feedback ?? "Ready")}
      </p>
    </>
  );
}
describe("rapid answer submission", () => {
  it("keeps one request in flight and allows retry after a network failure", async () => {
    let reject: (reason: Error) => void = () => {};
    const fetch = vi.fn(
      () =>
        new Promise<Response>((_resolve, fail) => {
          reject = fail;
        }),
    );
    vi.stubGlobal("fetch", fetch);
    const user = (await import("@testing-library/user-event")).default.setup();
    renderWithProviders(
      <ModeProvider lessonId="q">
        <Answer />
      </ModeProvider>,
    );
    await user.type(screen.getByLabelText("Response"), "my response");
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(fetch).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent("Checking");
    await act(async () => reject(new Error("Offline")));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Discere’s engine isn’t responding.",
    );
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(fetch).toHaveBeenCalledTimes(2);
    await act(async () => reject(new Error("Offline")));
    vi.unstubAllGlobals();
  });
});
