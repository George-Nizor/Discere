import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SourcePanel } from "./SourcePanel";

describe("SourcePanel", () => {
  it("shows source provenance and licensing", () => {
    render(<SourcePanel sources={[{ id: "openstax", title: "Electric Current", publisher: "OpenStax", url: "https://openstax.org/example", licence: "CC BY 4.0", accessedAt: "2026-08-16" }]} />);
    const link = screen.getByRole("link", { name: /Electric Current/ });
    expect(link).toHaveAttribute("href", "https://openstax.org/example");
    expect(screen.getByText("OpenStax")).toBeInTheDocument();
    expect(screen.getByText("CC BY 4.0")).toBeInTheDocument();
  });
});
