import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { StatisticsDiagram } from "./StatisticsDiagram.js";

describe("statistics diagrams", () => {
  it("updates a restricted sample space and its equivalent outcome table", async () => {
    render(
      <StatisticsDiagram
        spec={{
          type: "outcome_grid",
          sides: 6,
          event: "sum_at_least",
          threshold: { min: 2, max: 12, value: 7, step: 1 },
          givenFirstAtMost: 2,
        }}
      />,
    );
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("3 of 12");
    fireEvent.change(screen.getByRole("slider", { name: /Sum at least/ }), {
      target: { value: "12" },
    });
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("0 of 12");
    await userEvent.click(screen.getByText("Read the outcomes"));
    expect(screen.getByRole("table")).toHaveTextContent(
      "0 matching outcomes among 12 eligible outcomes",
    );
    expect(screen.getAllByText("Excluded by condition")).toHaveLength(24);
  });
  it("moves the mean while the median resists an extreme endpoint, and restores the data", async () => {
    const { container } = render(
      <StatisticsDiagram
        spec={{
          type: "data_distribution",
          values: [2, 4, 4, 5, 5],
          editableIndex: 4,
          control: { min: 0, max: 30, value: 5, step: 1 },
          showSpread: false,
        }}
      />,
    );
    fireEvent.change(screen.getByRole("slider", { name: /Observation 5/ }), {
      target: { value: "25" },
    });
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("mean 8; median 4");
    expect(container.querySelector("dl")).toHaveTextContent("Mean8Median4Range23");
    await userEvent.click(screen.getByRole("button", { name: "Restore values" }));
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("mean 4; median 4");
  });
  it("changes the selected sample without changing the population", async () => {
    render(
      <StatisticsDiagram
        spec={{
          type: "sampling_population",
          groups: [
            { label: "Morning", value: 2, count: 6 },
            { label: "Evening", value: 8, count: 6 },
          ],
          samples: [
            { id: "one", label: "Morning only", indices: [0, 1, 2, 3, 4, 5] },
            { id: "mixed", label: "Both groups", indices: [0, 2, 4, 6, 8, 10] },
          ],
          initialSampleId: "one",
        }}
      />,
    );
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain(
      "sample mean 2; population mean 5",
    );
    await userEvent.click(screen.getByRole("button", { name: "Both groups" }));
    expect(screen.getByRole("button", { name: "Both groups" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain(
      "sample mean 5; population mean 5",
    );
    await userEvent.click(screen.getByText("Read the sample"));
    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Morning263");
    expect(rows[2]).toHaveTextContent("Evening863");
  });
  it("names the selected members without the population total before an answer", () => {
    render(
      <StatisticsDiagram
        showResults={false}
        spec={{
          type: "sampling_population",
          groups: [
            { label: "Morning", value: 2, count: 6 },
            { label: "Evening", value: 8, count: 6 },
          ],
          samples: [
            { id: "one", label: "Morning only", indices: [0, 1, 2, 3, 4, 5] },
            { id: "mixed", label: "Both groups", indices: [0, 2, 4, 6, 8, 10] },
          ],
          initialSampleId: "one",
        }}
      />,
    );
    expect(screen.getByRole("img")).toHaveAccessibleName("Morning only: 6 members selected");
  });
});
