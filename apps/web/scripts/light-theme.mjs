/**
 * Derives the light theme from the dark stylesheets.
 *
 * The interface is drawn dark first, and many surfaces carry literal colours rather than tokens.
 * Hand-writing a light override for each would drift the first time someone touched a dark rule,
 * so this reads every stylesheet and, for each declaration with a literal colour, writes the same
 * declaration under `html[data-theme="light"]` with the colour moved to daylight in OKLCH:
 *
 * - surfaces (backgrounds, borders, fills): dark neutrals become paper, light ones become ink;
 *   dark tinted surfaces become pale tints of the same hue; mid and bright fills keep their colour.
 * - text: light neutrals become ink, bright hues are deepened until they read on white.
 * - shadows: stay dark, at about half the strength.
 *
 * A rule containing the comment `light-theme: keep` is left as it is.
 *
 * Tokens (`var(--…)`) are untouched; `styles/theme.css` sets their light values by hand and loads
 * after the generated file. Run `pnpm --filter @discere/web theme:light` after changing a stylesheet;
 * a unit test fails while the generated file is stale.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";

const here = dirname(fileURLToPath(import.meta.url));
export const STYLES = join(here, "../src/styles");
export const OUTPUT = join(STYLES, "theme-light.generated.css");
// tokens.css is the original light palette, already daylight; brilliant.css redefines it dark.
const SKIP = new Set(["tokens.css", "theme.css", "theme-light.generated.css"]);
const LIGHT = 'html[data-theme="light"]';

/* Colour space ---------------------------------------------------------------------------------- */
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function rgbToOklch(r, g, b) {
  const [lr, lg, lb] = [r, g, b].map((v) => toLinear(v / 255));
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  const H = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { L, C, H };
}

const COLOUR =
  /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|\brgba?\([^()]*\)|\b(?:white|black)\b/g;

function parseColour(text) {
  const t = text.toLowerCase();
  if (t === "white") return { r: 255, g: 255, b: 255, a: 1 };
  if (t === "black") return { r: 0, g: 0, b: 0, a: 1 };
  if (t.startsWith("#")) {
    let h = t.slice(1);
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    const n = (i) => Number.parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  const parts = t
    .replace(/^rgba?\(|\)$/g, "")
    .split(/[\s,/]+/)
    .filter(Boolean);
  if (parts.length < 3 || parts.some((p) => p.startsWith("var"))) return null;
  const channel = (p) => (p.endsWith("%") ? (Number.parseFloat(p) * 255) / 100 : Number.parseFloat(p));
  const alpha = parts[3] === undefined ? 1 : parts[3].endsWith("%") ? Number.parseFloat(parts[3]) / 100 : Number.parseFloat(parts[3]);
  const [r, g, b] = parts.slice(0, 3).map(channel);
  if ([r, g, b, alpha].some(Number.isNaN)) return null;
  return { r, g, b, a: alpha };
}

const lerp = (x, x0, x1, y0, y1) => y0 + ((Math.min(Math.max(x, x0), x1) - x0) / (x1 - x0)) * (y1 - y0);
/** Dark surface → paper; mid → mid; light surface → ink. */
function surfaceLightness(L) {
  if (L < 0.4) return lerp(L, 0.12, 0.4, 0.995, 0.9);
  if (L < 0.7) return lerp(L, 0.4, 0.7, 0.9, 0.55);
  return lerp(L, 0.7, 1, 0.55, 0.18);
}

function mapColour(colour, role) {
  const { L, C, H } = rgbToOklch(colour.r, colour.g, colour.b);
  let a = colour.a;
  let L2 = L;
  let C2 = C;
  const neutral = C < 0.05;
  if (role === "shadow") {
    if (neutral && L < 0.5) a *= 0.45;
    else if (!neutral) a *= 0.7;
    else return null;
  } else if (role === "text") {
    if (neutral) L2 = L >= 0.5 ? lerp(L, 0.5, 1, 0.45, 0.17) : 1 - L * 0.9;
    else if (L > 0.6) L2 = lerp(L, 0.6, 1, 0.5, 0.44);
    else if (L < 0.32) L2 = 0.93;
    else return null;
  } else if (neutral) {
    L2 = surfaceLightness(L);
    C2 = C * 0.6;
  } else if (L < 0.45) {
    L2 = surfaceLightness(L);
    C2 = Math.min(C * 0.35, 0.05);
  } else return null;
  const f = (n, d = 3) => Number(n.toFixed(d));
  return `oklch(${f(L2)} ${f(C2)} ${f(H, 1)}${a < 1 ? ` / ${f(a, 3)}` : ""})`;
}

/* Declarations ---------------------------------------------------------------------------------- */
const TEXT = /^(color|-webkit-text-fill-color|caret-color|text-decoration-color|text-emphasis-color)$/;
const SHADOW = /^(box-shadow|text-shadow|filter|-webkit-filter)$/;
const SURFACE =
  /^(background(-color|-image)?|border(-(top|right|bottom|left|block|inline)(-start|-end)?)?(-color)?|outline(-color)?|fill|stroke|stop-color|accent-color|column-rule(-color)?|scrollbar-color|-webkit-tap-highlight-color)$/;

function roleOf(prop) {
  if (prop.startsWith("--")) {
    if (/shadow|glow/.test(prop)) return "shadow";
    if (/ink|text|fg|label|muted|-on-/.test(prop)) return "text";
    return "surface";
  }
  if (TEXT.test(prop)) return "text";
  if (SHADOW.test(prop)) return "shadow";
  if (SURFACE.test(prop)) return "surface";
  return null;
}

export function mapValue(value, role) {
  let changed = false;
  const out = value.replace(COLOUR, (match) => {
    const colour = parseColour(match);
    const mapped = colour && mapColour(colour, role);
    if (!mapped) return match;
    changed = true;
    return mapped;
  });
  return changed ? out : null;
}

/**
 * Scopes a selector to the light theme without adding specificity, so each generated rule only
 * outranks the rule it was made from. The root keeps a real attribute so light tokens beat `:root`.
 */
function scope(selector) {
  if (selector === ":root" || selector === "html") return LIGHT;
  if (/^:root\b/.test(selector)) return `:root:where([data-theme="light"])${selector.slice(5)}`;
  if (/^html\b/.test(selector)) return `html:where([data-theme="light"])${selector.slice(4)}`;
  return `:where(${LIGHT}) ${selector}`;
}

function insideKeyframes(node) {
  for (let p = node.parent; p; p = p.parent) if (p.type === "atrule" && /keyframes$/.test(p.name)) return true;
  return false;
}
function contextOf(rule) {
  const chain = [];
  for (let p = rule.parent; p && p.type === "atrule"; p = p.parent) chain.unshift({ name: p.name, params: p.params });
  return chain;
}
const family = (prop) => (/^background(-color|-image)?$/.test(prop) ? "background" : prop);

export function generate() {
  // In the order main.tsx imports them, so a later sheet still wins in the light theme.
  const main = readFileSync(join(here, "../src/main.tsx"), "utf8");
  const imported = [...main.matchAll(/import "\.\/styles\/([\w.-]+\.css)";/g)].map((m) => m[1]);
  const rest = readdirSync(STYLES).filter((f) => f.endsWith(".css") && !imported.includes(f));
  const files = [...imported, ...rest.sort()].filter((f) => !SKIP.has(f));

  // Model the cascade per selector and property: only the declaration that wins in the dark
  // theme gets a light counterpart. An early light-era rule that a later dark rule replaced (often
  // with a token) must not come back.
  const winners = new Map();
  let order = 0;
  // Sheets imported before brilliant.css predate the dark redesign: their literal colours were
  // chosen for a light page, so where one still wins it is already right in the light theme.
  const darkFrom = files.indexOf("brilliant.css");
  for (const [index, file] of files.entries()) {
    const daylight = index < darkFrom;
    const root = postcss.parse(readFileSync(join(STYLES, file), "utf8"), { from: file });
    root.walkRules((rule) => {
      if (insideKeyframes(rule)) return;
      // Surfaces that are the same in both themes, such as the notebook's paper, opt out.
      if (rule.nodes?.some((n) => n.type === "comment" && n.text.includes("light-theme: keep"))) return;
      const context = contextOf(rule);
      const contextKey = context.map((c) => `@${c.name} ${c.params}`).join(" ");
      // A background clipped to the glyphs is text, and has to read like text.
      const clipDecls = (rule.nodes ?? []).filter(
        (n) => n.type === "decl" && /^(-webkit-)?background-clip$/.test(n.prop),
      );
      const clipText = clipDecls.some((n) => n.value === "text");
      for (const selector of rule.selectors) {
        for (const node of rule.nodes ?? []) {
          if (node.type !== "decl") continue;
          const role = clipText && node.prop.startsWith("background") ? "text" : roleOf(node.prop);
          if (!role) continue;
          const key = `${contextKey}|${selector}|${family(node.prop)}`;
          const previous = winners.get(key);
          if (previous?.important && !node.important) continue;
          winners.set(key, { order: order++, context, contextKey, selector, node, role, clipDecls, daylight });
        }
      }
    });
  }

  const out = postcss.root();
  let count = 0;
  let open = null;
  for (const w of [...winners.values()].sort((a, b) => a.order - b.order)) {
    const value = w.daylight ? null : mapValue(w.node.value, w.role);
    if (!value) continue;
    count++;
    const decls = [postcss.decl({ prop: w.node.prop, value, important: w.node.important })];
    // The background shorthand resets clipping, which would turn gradient text into a block.
    if (w.node.prop === "background") for (const c of w.clipDecls) decls.push(c.clone());
    if (open && open.selector === w.selector && open.contextKey === w.contextKey) {
      open.rule.append(decls);
      continue;
    }
    const rule = postcss.rule({ selector: scope(w.selector), nodes: decls });
    let target = rule;
    for (const c of [...w.context].reverse()) target = postcss.atRule({ name: c.name, params: c.params, nodes: [target] });
    out.append(target);
    open = { selector: w.selector, contextKey: w.contextKey, rule };
  }
  const header = `/* Generated by apps/web/scripts/light-theme.mjs from ${files.length} stylesheets (${count} declarations). Do not edit. */\n`;
  return header + out.toString().replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(OUTPUT, generate());
  console.log(`Wrote ${OUTPUT}`);
}
