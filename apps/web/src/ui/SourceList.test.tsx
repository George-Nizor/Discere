import type { Source } from "@discere/contracts";
import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { SourceList } from "./SourceList.js";

const source = (id: string, extra: Partial<Source> = {}): Source => ({
  id,
  title: `Title ${id}`,
  publisher: "OpenStax",
  url: `https://example.org/${id}`,
  licence: "CC BY 4.0",
  accessedAt: "2026-11-03",
  ...extra,
});

it("lists each source under a Sources heading, with the title as a link that opens outside", () => {
  render(<SourceList sources={[source("a"), source("b", { checked: { status: "unchecked", at: "2026-11-11" } })]} />);
  const section = screen.getByRole("region", { name: "Sources" });
  expect(within(section).getByRole("heading", { level: 2, name: "Sources" })).toBeVisible();
  const items = within(section).getAllByRole("listitem");
  expect(items).toHaveLength(2);
  const link = within(items[0]!).getByRole("link", { name: "Title a" });
  expect(link).toHaveAttribute("href", "https://example.org/a");
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", "noreferrer noopener");
  expect(items[0]).toHaveTextContent("OpenStax. CC BY 4.0.");
  // An unchecked source reads like any other.
  expect(within(items[1]!).getByRole("link", { name: "Title b" })).toBeVisible();
  expect(section.querySelector("details")).toBeNull();
});

it("lists an unreachable source without a link and says the link no longer works", () => {
  render(<SourceList sources={[source("gone", { checked: { status: "unreachable", at: "2026-11-11" } })]} />);
  const item = screen.getByRole("listitem");
  expect(within(item).queryByRole("link")).toBeNull();
  expect(item).toHaveTextContent("Title gone");
  expect(item).toHaveTextContent("Its link no longer works.");
});

it("starts a long list closed behind a summary that says how many there are", () => {
  render(<SourceList sources={Array.from({ length: 7 }, (_, index) => source(`s${index}`))} />);
  const details = screen.getByRole("group");
  expect(details).not.toHaveAttribute("open");
  expect(screen.getByText("Show all 7 sources")).toBeVisible();
  expect(details.querySelectorAll("li")).toHaveLength(7);
});

it("renders nothing when there are no sources", () => {
  const { container } = render(<SourceList sources={[]} />);
  expect(container).toBeEmptyDOMElement();
});
