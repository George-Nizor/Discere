import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/harness.js";
import { studyFixture } from "../test/study-fixture.js";
import { Bonehead } from "./Bonehead.js";
import { emitMascot } from "./bus.js";
import { MascotPet } from "./MascotPet.js";

afterEach(() => vi.unstubAllGlobals());

describe("Bonehead", () => {
  it("draws the requested expression, props and treatment", () => {
    const { container } = renderWithProviders(
      <Bonehead expression="proud" props={["cap"]} treatment="dark" glow title="Bonehead" />,
    );
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveClass("bh-expr-proud", "p-cap", "bh--dark", "is-glowing");
    expect(screen.getByRole("img", { name: "Bonehead" })).toBeInTheDocument();
  });
  it("centres its shadow under the bone", () => {
    const { container } = renderWithProviders(<Bonehead />);
    expect(container.querySelector(".bh-puddle")).toHaveAttribute("cx", "64");
  });
});

describe("companion pet", () => {
  it("reacts to a wrong answer with encouragement", async () => {
    stubFetch({ "GET /api/study/preferences": { body: studyFixture.preferences } });
    const { container } = renderWithProviders(<MascotPet inLesson={false} />);
    await screen.findByRole("button", { name: /Click to pet/ });
    act(() => emitMascot({ type: "answer", correct: false, combo: 0 }));
    await waitFor(() => expect(container.querySelector(".bh")).toHaveClass("bh-expr-encouraging"), {
      timeout: 2000,
    });
  });
  it("stays hidden when the learner turned it off", async () => {
    stubFetch({ "GET /api/study/preferences": { body: { ...studyFixture.preferences, companion: false } } });
    renderWithProviders(<MascotPet inLesson={false} />);
    await waitFor(() => expect(screen.queryByRole("button", { name: /Click to pet/ })).toBeNull());
  });
});

describe("pet position", () => {
  it("starts at the default spot and moves with the arrow keys, Home resets", async () => {
    localStorage.removeItem("discere:pet-position:v1");
    stubFetch({ "GET /api/study/preferences": { body: studyFixture.preferences } });
    const { container } = renderWithProviders(<MascotPet inLesson={false} />);
    const pet = await screen.findByRole("button", { name: /Click to pet/ });
    expect(container.querySelector(".pet-dock")).toHaveClass("is-default");
    act(() => pet.focus());
    fireEvent.keyDown(pet, { key: "ArrowRight" });
    expect(container.querySelector(".pet-dock")).toHaveClass("is-placed");
    expect(JSON.parse(localStorage.getItem("discere:pet-position:v1")!)).toEqual({ fx: 0.05, fy: 0.5 });
    fireEvent.keyDown(pet, { key: "Home" });
    expect(container.querySelector(".pet-dock")).toHaveClass("is-default");
  });
});
