/**
 * One canvas over the whole app draws every earned effect: confetti, sparks, shockwave rings
 * and stars. It runs only while something is alive, so an idle page costs nothing. Every entry
 * point checks reduced motion first; the learning never depends on an effect having played.
 */
import { reducedMotionEnabled } from "../study/experience.js";

type Kind = "confetti" | "spark" | "star" | "ring" | "ember";
interface Particle {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  color: string;
  rotation: number;
  spin: number;
  gravity: number;
  drag: number;
  wobble: number;
  /** Final radius of a shockwave ring. */
  reach: number;
}

export interface Point {
  x: number;
  y: number;
}

export const palettes = {
  correct: ["#3ee07f", "#7cf5a8", "#c9ffe0", "#ffffff", "#22c55e"],
  hot: ["#ffd23e", "#ffb020", "#ff7a3d", "#fff3b0", "#3ee07f"],
  blaze: ["#ff5e3a", "#ffb020", "#ffd23e", "#ff8ad8", "#fff6d5"],
  cosmic: ["#9b7bff", "#5ad1ff", "#ff8ad8", "#ffd23e", "#ffffff", "#3ee07f"],
  gold: ["#ffe58a", "#ffd23e", "#f2a91c", "#fff7d6", "#ffffff"],
} as const;
export type PaletteName = keyof typeof palettes;

let canvas: HTMLCanvasElement | null = null;
let context: CanvasRenderingContext2D | null = null;
let layer: HTMLElement | null = null;
const particles: Particle[] = [];
let frame = 0;
let last = 0;
let ratio = 1;

export function attachFxCanvas(element: HTMLCanvasElement | null, textLayer: HTMLElement | null) {
  canvas = element;
  layer = textLayer;
  context = element?.getContext("2d") ?? null;
  if (element) resize();
}

function resize() {
  if (!canvas) return;
  ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(window.innerWidth * ratio);
  canvas.height = Math.round(window.innerHeight * ratio);
}
if (typeof window !== "undefined") window.addEventListener("resize", resize);

const enabled = () => Boolean(context) && !reducedMotionEnabled();

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

function spawn(partial: Partial<Particle> & Pick<Particle, "kind" | "x" | "y">) {
  particles.push({
    vx: 0,
    vy: 0,
    age: 0,
    life: 1,
    size: 6,
    color: "#fff",
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 12,
    gravity: 0,
    drag: 0.9,
    wobble: Math.random() * Math.PI * 2,
    reach: 0,
    ...partial,
  });
  if (!frame) {
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }
}

function star(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 ? r * 0.42 : r;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
  }
  ctx.closePath();
  ctx.fill();
}

function tick(now: number) {
  const ctx = context;
  if (!ctx || !canvas) {
    particles.length = 0;
    frame = 0;
    return;
  }
  // A frame timestamp can precede the spawn time; time never runs backwards here.
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i]!;
    p.age += dt;
    if (p.age >= p.life) {
      particles.splice(i, 1);
      continue;
    }
    const k = Math.pow(p.drag, dt * 60);
    p.vx *= k;
    p.vy = p.vy * k + p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rotation += p.spin * dt;
    p.wobble += dt * 9;
    const t = p.age / p.life;
    const fade = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = Math.max(0, fade);
    if (p.kind === "confetti") {
      ctx.rotate(p.rotation);
      ctx.scale(1, Math.cos(p.wobble));
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else if (p.kind === "spark" || p.kind === "ember") {
      ctx.globalCompositeOperation = "lighter";
      const r = p.size * (p.kind === "ember" ? 1 - t * 0.6 : 1 - t * 0.3);
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 3);
      gradient.addColorStop(0, p.color);
      gradient.addColorStop(0.25, p.color + "aa");
      gradient.addColorStop(1, p.color + "00");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, r * 3, 0, Math.PI * 2);
      ctx.fill();
      if (p.kind === "spark") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, r * 0.5);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-p.vx * 0.03, -p.vy * 0.03);
        ctx.stroke();
      }
    } else if (p.kind === "star") {
      ctx.globalCompositeOperation = "lighter";
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      star(ctx, p.size * (1 - t * 0.4));
    } else if (p.kind === "ring") {
      const eased = 1 - Math.pow(1 - t, 3);
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(0.5, p.size * (1 - eased));
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0, 8 + eased * p.reach), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  frame = particles.length ? requestAnimationFrame(tick) : 0;
  if (!frame) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/** A radial burst of confetti and sparks from a point, e.g. the button that was pressed. */
export function burst(
  at: Point,
  { count = 36, palette = "correct", power = 1 }: { count?: number; palette?: PaletteName; power?: number } = {},
) {
  if (!enabled()) return;
  const colours = palettes[palette];
  for (let i = 0; i < count; i += 1) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.6;
    const speed = (260 + Math.random() * 520) * power;
    const confetti = i % 3 !== 0;
    spawn({
      kind: confetti ? "confetti" : "spark",
      x: at.x,
      y: at.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: confetti ? 1.1 + Math.random() * 0.8 : 0.5 + Math.random() * 0.4,
      size: confetti ? 7 + Math.random() * 7 : 2 + Math.random() * 2.5,
      color: pick(colours),
      gravity: confetti ? 900 : 300,
      drag: confetti ? 0.93 : 0.9,
    });
  }
}

export function ring(at: Point, colour = "#3ee07f", radius = 120) {
  if (!enabled()) return;
  spawn({ kind: "ring", x: at.x, y: at.y, reach: radius, life: 0.6, size: 6, color: colour });
  spawn({ kind: "ring", x: at.x, y: at.y, reach: radius * 0.6, life: 0.45, size: 3, color: "#ffffff" });
}

export function stars(at: Point, count = 10, palette: PaletteName = "gold") {
  if (!enabled()) return;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const speed = 160 + Math.random() * 260;
    spawn({
      kind: "star",
      x: at.x,
      y: at.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.9 + Math.random() * 0.5,
      size: 6 + Math.random() * 6,
      color: pick(palettes[palette]),
      gravity: 120,
      drag: 0.9,
    });
  }
}

/** Confetti falling from the top edge across the whole viewport. */
export function rain({ count = 160, palette = "cosmic" }: { count?: number; palette?: PaletteName } = {}) {
  if (!enabled()) return;
  const width = window.innerWidth;
  for (let i = 0; i < count; i += 1) {
    spawn({
      kind: i % 7 === 0 ? "star" : "confetti",
      x: Math.random() * width,
      y: -20 - Math.random() * 240,
      vx: (Math.random() - 0.5) * 180,
      vy: 120 + Math.random() * 260,
      life: 2.4 + Math.random() * 1.4,
      size: 7 + Math.random() * 8,
      color: pick(palettes[palette]),
      gravity: 260,
      drag: 0.985,
    });
  }
}

/** Embers rising from a point, used for streak flames and combo heat. */
export function embers(at: Point, count = 14, palette: PaletteName = "blaze") {
  if (!enabled()) return;
  for (let i = 0; i < count; i += 1) {
    spawn({
      kind: "ember",
      x: at.x + (Math.random() - 0.5) * 30,
      y: at.y,
      vx: (Math.random() - 0.5) * 80,
      vy: -120 - Math.random() * 200,
      life: 0.7 + Math.random() * 0.6,
      size: 2 + Math.random() * 3,
      color: pick(palettes[palette]),
      gravity: -40,
      drag: 0.96,
    });
  }
}

export function centre(element: Element | null | undefined): Point {
  if (!element) return { x: window.innerWidth / 2, y: window.innerHeight * 0.72 };
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** Text that rises from a point, then optionally flies into a target such as the XP counter. */
export function floatText(
  text: string,
  from: Point,
  { to, tone = "xp", size = 1 }: { to?: Element | null; tone?: "xp" | "combo" | "hype" | "gold"; size?: number } = {},
) {
  if (!layer || reducedMotionEnabled()) return;
  const node = document.createElement("span");
  node.className = `fx-float fx-float--${tone}`;
  node.textContent = text;
  node.style.left = `${from.x}px`;
  node.style.top = `${from.y}px`;
  node.style.setProperty("--fx-size", String(size));
  layer.appendChild(node);
  const target = to ? centre(to) : null;
  const dx = target ? target.x - from.x : 0;
  const dy = target ? target.y - from.y : -90;
  const frames: Keyframe[] = target
    ? [
        { transform: "translate(-50%, -50%) scale(0.4)", opacity: 0 },
        { transform: "translate(-50%, -140%) scale(1.15)", opacity: 1, offset: 0.25 },
        { transform: "translate(-50%, -150%) scale(1)", opacity: 1, offset: 0.5 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.45)`, opacity: 0.2 },
      ]
    : [
        { transform: "translate(-50%, -50%) scale(0.3)", opacity: 0 },
        { transform: "translate(-50%, -80%) scale(1.2)", opacity: 1, offset: 0.2 },
        { transform: "translate(-50%, -110%) scale(1)", opacity: 1, offset: 0.7 },
        { transform: `translate(-50%, calc(-50% + ${dy}px)) scale(0.9)`, opacity: 0 },
      ];
  const animation = node.animate?.(frames, {
    duration: target ? 1100 : 1300,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    fill: "forwards",
  });
  const done = () => {
    node.remove();
    if (to) {
      to.classList.remove("fx-receive");
      void (to as HTMLElement).offsetWidth;
      to.classList.add("fx-receive");
    }
  };
  if (animation) animation.onfinish = done;
  else window.setTimeout(done, 1200);
}

/** A soft coloured vignette around the viewport edge. */
export function pulse(tone: "correct" | "wrong" | "gold" | "cosmic") {
  if (!layer || reducedMotionEnabled()) return;
  const node = document.createElement("div");
  node.className = `fx-pulse fx-pulse--${tone}`;
  layer.appendChild(node);
  window.setTimeout(() => node.remove(), 900);
}

export function shake(element: Element | null | undefined) {
  if (!element || reducedMotionEnabled()) return;
  (element as HTMLElement).animate?.(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-9px)" },
      { transform: "translateX(8px)" },
      { transform: "translateX(-6px)" },
      { transform: "translateX(4px)" },
      { transform: "translateX(0)" },
    ],
    { duration: 420, easing: "ease-out" },
  );
}
