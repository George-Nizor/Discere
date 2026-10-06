import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/harness.js";
import { Calculator } from "./Calculator.js";
import type { Workbench } from "./Workbench.js";

function Lesson() {
  const [value, setValue] = useState("");
  return (
    <>
      <main className="stage-canvas">
        <label>
          Value
          <input
            type="text"
            value={value}
            onChange={(event) => setValue(event.currentTarget.value)}
          />
        </label>
        <output data-testid="seen">{value}</output>
      </main>
      <Calculator />
    </>
  );
}

describe("workbench calculator", () => {
  it("evaluates from the keypad and puts the result in the lesson's answer box", async () => {
    renderWithProviders(<Lesson />);
    fireEvent.focusIn(screen.getByLabelText("Value"));
    const keys = screen.getByRole("group", { name: "Calculator keys" });
    for (const name of ["Square root", "1", "4", "4", ")", "Multiply", "3"])
      await userEvent.click(within(keys, name));
    expect(screen.getByLabelText("Expression")).toHaveValue("√(144)×3");
    expect(screen.getByText("= 36")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Use in answer/ }));
    expect(screen.getByTestId("seen")).toHaveTextContent("36");
  });
  it("explains an error instead of showing a wrong number", async () => {
    renderWithProviders(<Calculator />);
    await userEvent.type(screen.getByLabelText("Expression"), "1/0{Enter}");
    expect(screen.getByText("Division by zero.")).toBeInTheDocument();
  });
  it("switches to radians and second functions", async () => {
    renderWithProviders(<Calculator />);
    await userEvent.click(screen.getByRole("button", { name: /Angle unit: degrees/ }));
    expect(screen.getByRole("button", { name: /Angle unit: radians/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Second functions" }));
    expect(screen.getByRole("button", { name: "Inverse sine" })).toBeInTheDocument();
  });
});

function within(group: HTMLElement, name: string) {
  const match = [...group.querySelectorAll("button")].find(
    (b) => b.getAttribute("aria-label") === name,
  );
  if (!match) throw new Error(`No key ${name}`);
  return match;
}

describe("workbench shell", () => {
  async function bench(props: Partial<Parameters<typeof Workbench>[0]> = {}) {
    const { Workbench } = await import("./Workbench.js");
    const onClose = vi.fn();
    renderWithProviders(
      <Workbench
        tab="calculator"
        onTab={() => {}}
        onClose={onClose}
        lessonId="l"
        conceptIds={["c"]}
        mode="coach"
        accent="#be185d"
        visited={new Set()}
        {...props}
      />,
    );
    return onClose;
  }
  it("closes on Escape, but a first Escape in a filled calculator only clears it", async () => {
    const onClose = await bench();
    await userEvent.type(screen.getByLabelText("Expression"), "2+2");
    await userEvent.keyboard("{Escape}");
    expect(screen.getByLabelText("Expression")).toHaveValue("");
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });
  it("offers no calculator where the lesson's policy is off", async () => {
    await bench({ calculator: "off" });
    expect(screen.queryByRole("tab", { name: /Calculator/ })).toBeNull();
  });
  it("repeats the question and folds down so the lesson stays readable", async () => {
    await bench({ questionPrompt: "For x = 2, what is x + 5?" });
    expect(screen.getByText("For x = 2, what is x + 5?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Fold the tools down" }));
    expect(screen.getByRole("button", { name: "Show the tools" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
