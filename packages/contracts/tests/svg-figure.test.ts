import { describe, expect, it } from "vitest";
import { LearningDiagramSchema, svgFigureProblems } from "../src/index.js";

const good =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400"><rect class="f-accent-soft s-accent w2" x="20" y="20" width="200" height="120" rx="12"/><circle class="f-green" cx="320" cy="200" r="24"/><path class="s-ink w3 round" d="M20 300 L300 300" marker-end="url(#head)"/><text class="t t-bold" x="40" y="60">Pole</text></svg>';

describe("authored svg figures", () => {
  it("accepts plain shapes, text and palette classes", () => {
    expect(svgFigureProblems(good)).toEqual([]);
    const figure = {
      type: "svg_figure",
      alt: "A rectangle, a green dot and a labelled line.",
      cases: [{ id: "one", label: "One", svg: good }],
    };
    expect(LearningDiagramSchema.safeParse(figure).success).toBe(true);
  });

  it.each([
    ["a script element", '<svg viewBox="0 0 1 1"><script>alert(1)</script></svg>'],
    ["an event handler", '<svg viewBox="0 0 1 1"><rect onclick="x()" width="1" height="1"/></svg>'],
    ["an external image", '<svg viewBox="0 0 1 1"><image href="https://x.test/a.png"/></svg>'],
    [
      "a literal colour",
      '<svg viewBox="0 0 1 1"><rect fill="#ff0000" width="1" height="1"/></svg>',
    ],
    [
      "a style attribute",
      '<svg viewBox="0 0 1 1"><rect style="fill:red" width="1" height="1"/></svg>',
    ],
    [
      "an unknown class",
      '<svg viewBox="0 0 1 1"><rect class="big-red" width="1" height="1"/></svg>',
    ],
    ["a foreign object", '<svg viewBox="0 0 1 1"><foreignObject/></svg>'],
    ["no viewBox", '<svg><rect width="1" height="1"/></svg>'],
    ["an unclosed element", '<svg viewBox="0 0 1 1"><g><rect width="1" height="1"/></svg>'],
    [
      "a javascript url",
      '<svg viewBox="0 0 1 1"><path d="M0 0" marker-end="url(javascript:x)"/></svg>',
    ],
  ])("refuses %s", (_name, svg) => {
    expect(svgFigureProblems(svg).length).toBeGreaterThan(0);
  });
});
