import { z } from "zod";

/**
 * An authored figure: a still drawing, or a few of them the learner switches between. The
 * drawing is SVG written into the lesson, so it has to be safe to place in a page without a
 * sandbox. This file is the gate: it allows plain shapes and text, refuses anything that could
 * run code or fetch something, and makes every colour come from a theme class so the drawing
 * reads in both light and dark. See docs/learning-experience/figure-brief.md for how to draw one.
 */

export const SVG_FIGURE_MAX_CHARS = 14000;

const ELEMENTS = new Set([
  "svg",
  "g",
  "defs",
  "title",
  "desc",
  "path",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "rect",
  "text",
  "tspan",
  "marker",
]);
const ATTRIBUTES = new Set([
  "xmlns",
  "viewBox",
  "width",
  "height",
  "preserveAspectRatio",
  "id",
  "class",
  "transform",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "d",
  "points",
  "text-anchor",
  "dominant-baseline",
  "font-weight",
  "font-style",
  "letter-spacing",
  "stroke-width",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
  "fill-rule",
  "fill",
  "stroke",
  "dx",
  "dy",
  "rotate",
  "marker-start",
  "marker-end",
  "markerWidth",
  "markerHeight",
  "refX",
  "refY",
  "orient",
  "markerUnits",
  "role",
  "aria-hidden",
  "aria-label",
]);
/** Classes a drawing may use. Each maps to a theme token in styles/learning-diagram.css. */
export const SVG_FIGURE_CLASSES = [
  "s-ink",
  "s-soft",
  "s-muted",
  "s-line",
  "s-accent",
  "s-green",
  "s-warn",
  "s-error",
  "f-ink",
  "f-soft",
  "f-muted",
  "f-canvas",
  "f-sunken",
  "f-accent",
  "f-accent-soft",
  "f-green",
  "f-green-soft",
  "f-warn",
  "f-warn-soft",
  "f-error",
  "f-error-soft",
  "f-none",
  "t",
  "t-small",
  "t-bold",
  "t-accent",
  "t-muted",
  "t-green",
  "t-warn",
  "t-error",
  "t-big",
  "w1",
  "w2",
  "w3",
  "w4",
  "dash",
  "dot",
  "round",
] as const;
const CLASS_SET = new Set<string>(SVG_FIGURE_CLASSES);

/** Everything wrong with a drawing, as short sentences. Empty means it is safe to render. */
export function svgFigureProblems(svg: string): string[] {
  const problems: string[] = [];
  if (svg.length > SVG_FIGURE_MAX_CHARS)
    problems.push(
      `The drawing is ${svg.length} characters; keep it under ${SVG_FIGURE_MAX_CHARS}.`,
    );
  const trimmed = svg.trim();
  if (!/^<svg[\s>]/u.test(trimmed) || !/<\/svg>\s*$/u.test(trimmed))
    problems.push("A drawing is a single <svg> element.");
  if (/<!|<\?|&#|&(?!amp;|lt;|gt;|quot;|apos;)/u.test(svg))
    problems.push("No comments, doctypes, processing instructions or odd entities.");
  const stack: string[] = [];
  const tag = /<(\/?)([A-Za-z][\w:-]*)((?:\s+[^<>]*?)?)(\/?)>/gu;
  let consumed = 0;
  for (const match of trimmed.matchAll(tag)) {
    const [whole, closing, name, rest, selfClosing] = match;
    const lowered = name!.toLowerCase();
    if (!ELEMENTS.has(name!)) problems.push(`<${name}> is not allowed.`);
    if (lowered === "svg" && !closing && !/\bviewBox\s*=/u.test(rest!))
      problems.push("The <svg> needs a viewBox.");
    if (closing) {
      if (stack.pop() !== name) problems.push(`</${name}> closes the wrong element.`);
    } else {
      for (const attribute of rest!.matchAll(/([^\s=/]+)\s*=\s*("([^"]*)"|'([^']*)')/gu)) {
        const key = attribute[1]!;
        const value = attribute[3] ?? attribute[4] ?? "";
        if (!ATTRIBUTES.has(key)) problems.push(`Attribute '${key}' is not allowed.`);
        else if (/^on/iu.test(key)) problems.push(`Attribute '${key}' is not allowed.`);
        if (key === "xmlns" && value !== "http://www.w3.org/2000/svg")
          problems.push("xmlns may only be the SVG namespace.");
        else if (
          key !== "xmlns" &&
          /javascript:|data:|https?:|\/\/|@import|expression\(/iu.test(value)
        )
          problems.push(`Attribute '${key}' may not point anywhere.`);
        if (/url\(/iu.test(value) && !/^url\(#[\w-]+\)$/u.test(value))
          problems.push(`Attribute '${key}' may only use url(#id).`);
        if ((key === "fill" || key === "stroke") && !/^(?:none|currentColor)$/u.test(value))
          problems.push(`Use a colour class (f-accent, s-ink, …) instead of ${key}="${value}".`);
        if (key === "class")
          for (const name of value.split(/\s+/u).filter(Boolean))
            if (!CLASS_SET.has(name))
              problems.push(`Class '${name}' is not in the figure palette.`);
      }
      if (!selfClosing) stack.push(name!);
    }
    consumed += whole.length;
  }
  if (stack.length) problems.push(`<${stack.at(-1)}> is never closed.`);
  const text = trimmed.replace(tag, "");
  if (/[<>]/u.test(text)) problems.push("Stray angle brackets in the drawing.");
  if (consumed === 0) problems.push("The drawing has no elements.");
  return [...new Set(problems)];
}

export const SvgFigureCaseSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/u),
    /** The chip the learner presses; at most 40 characters. */
    label: z.string().min(1).max(40),
    svg: z.string().min(1),
  })
  .strict()
  .superRefine((value, context) => {
    for (const problem of svgFigureProblems(value.svg))
      context.addIssue({ code: "custom", message: problem, path: ["svg"] });
  });

export const SvgFigureSchema = z
  .object({
    type: z.literal("svg_figure"),
    /** What the figure shows, for a reader who cannot see it. */
    alt: z.string().min(20).max(400),
    caption: z.string().min(1).max(300).optional(),
    cases: z.array(SvgFigureCaseSchema).min(1).max(5),
    initialCaseId: z.string().optional(),
  })
  .strict()
  .refine(
    (figure) =>
      new Set(figure.cases.map((item) => item.id)).size === figure.cases.length &&
      (figure.initialCaseId === undefined ||
        figure.cases.some((item) => item.id === figure.initialCaseId)),
    "Use distinct case ids and an initial case that exists.",
  );
export type SvgFigure = z.infer<typeof SvgFigureSchema>;
