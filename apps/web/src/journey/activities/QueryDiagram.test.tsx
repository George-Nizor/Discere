import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QueryDiagram } from "./QueryDiagram.js";

const spec = {
  type: "relational_query" as const,
  inputs: [
    {
      name: "orders",
      columns: ["id", "amount"],
      rows: [
        { id: "a", cells: [1, 20] },
        { id: "b", cells: [2, null] },
      ],
    },
  ],
  queries: [
    {
      id: "all",
      label: "All orders",
      sql: "SELECT * FROM orders ORDER BY id;",
      result: {
        name: "Result",
        columns: ["id", "amount"],
        rows: [
          { id: "one", cells: [1, 20] },
          { id: "two", cells: [2, null] },
        ],
      },
    },
    {
      id: "paid",
      label: "Known amounts",
      sql: "SELECT id FROM orders WHERE amount IS NOT NULL;",
      result: { name: "Result", columns: ["id"], rows: [{ id: "one", cells: [1] }] },
    },
    {
      id: "empty",
      label: "Over 100",
      sql: "SELECT id FROM orders WHERE amount > 100;",
      result: { name: "Result", columns: ["id"], rows: [] },
    },
  ],
  initialQueryId: "all",
};

describe("relational query comparison", () => {
  it("changes the query, accessible result table and row count together", () => {
    render(<QueryDiagram spec={spec} />);
    expect(screen.getByRole("button", { name: "All orders" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      within(screen.getByRole("region", { name: "Result table" })).getAllByRole("row"),
    ).toHaveLength(3);
    expect(screen.getByText("2 rows · 2 columns")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Known amounts" }));
    expect(screen.getByText(spec.queries[1]!.sql)).toBeVisible();
    expect(screen.getByText("1 row · 1 column")).toBeVisible();
    expect(
      within(screen.getByRole("region", { name: "Result table" })).getAllByRole("row"),
    ).toHaveLength(2);
    fireEvent.click(screen.getByText("Input data"));
    expect(
      within(screen.getByRole("region", { name: "orders table" })).getByLabelText(
        "NULL, missing value",
      ),
    ).toBeVisible();
  });
  it("shows a genuine empty result and restores a query without altering input data", () => {
    render(<QueryDiagram spec={spec} />);
    fireEvent.click(screen.getByRole("button", { name: "Over 100" }));
    expect(screen.getByText("No rows match.")).toBeVisible();
    expect(screen.getByText("0 rows · 1 column")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "All orders" }));
    expect(screen.queryByText("No rows match.")).toBeNull();
    expect(
      within(screen.getByRole("region", { name: "orders table" })).getAllByRole("row"),
    ).toHaveLength(3);
  });
});

describe("query results before the learner answers", () => {
  it("hides the result table and row count until showResults", () => {
    const view = render(<QueryDiagram spec={spec} showResults={false} />);
    expect(screen.queryByRole("region", { name: "Result table" })).not.toBeInTheDocument();
    expect(screen.queryByText(/2 rows/)).not.toBeInTheDocument();
    expect(screen.getByText(/appears once you have answered/)).toBeInTheDocument();
    view.rerender(<QueryDiagram spec={spec} showResults />);
    expect(screen.getByRole("region", { name: "Result table" })).toBeInTheDocument();
    expect(screen.getByText(/2 rows/)).toBeInTheDocument();
  });
});
