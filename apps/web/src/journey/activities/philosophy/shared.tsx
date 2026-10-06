import type { PhilosophyModel } from "@discere/contracts";
import type { ReactNode } from "react";

export type Of<K extends PhilosophyModel["kind"]> = Extract<PhilosophyModel, { kind: K }>;

/** Props every kind's view receives. `interactive` is false for course-check drawings. */
export interface ViewProps<K extends PhilosophyModel["kind"]> {
  model: Of<K>;
  showResults: boolean;
  interactive: boolean;
  reduced: boolean;
  label: string;
}

/** A row of mutually exclusive toggle buttons. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; disabled?: boolean; title?: string | undefined }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="phil-segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          aria-pressed={value === o.value}
          disabled={o.disabled}
          title={o.title}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Controls({ children }: { children: ReactNode }) {
  return <div className="phil-controls">{children}</div>;
}

/** Soft radial glows and gradients shared by the SVG views. Ids are scoped by `id`. */
export function Glows({ id }: { id: string }) {
  return (
    <>
      <radialGradient id={id + "-halo"}>
        <stop offset="0" stopColor="#c58cff" stopOpacity="0.55" />
        <stop offset="1" stopColor="#c58cff" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={id + "-gold"}>
        <stop offset="0" stopColor="#ffe3a3" stopOpacity="0.7" />
        <stop offset="1" stopColor="#ffe3a3" stopOpacity="0" />
      </radialGradient>
      <filter id={id + "-soft"} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      <linearGradient id={id + "-violet"} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#e3c8ff" />
        <stop offset="1" stopColor="#8f5ad9" />
      </linearGradient>
      <linearGradient id={id + "-teal"} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#9ff3e4" />
        <stop offset="1" stopColor="#3aa898" />
      </linearGradient>
      <linearGradient id={id + "-coral"} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffb2a6" />
        <stop offset="1" stopColor="#d8584b" />
      </linearGradient>
      <linearGradient id={id + "-amber"} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffe3a3" />
        <stop offset="1" stopColor="#d79a35" />
      </linearGradient>
    </>
  );
}

/** A small standing figure, drawn from simple solids. */
export function Figure({
  x,
  y,
  scale = 1,
  className = "",
}: {
  x: number;
  y: number;
  scale?: number;
  className?: string;
}) {
  return (
    <g
      className={"phil-figure " + className}
      style={{ transform: "translate(" + x + "px, " + y + "px) scale(" + scale + ")" }}
    >
      <ellipse cx="0" cy="2" rx="9" ry="2.6" className="phil-figure-shadow" />
      <rect x="-6.5" y="-26" width="13" height="26" rx="6.5" className="phil-figure-body" />
      <circle cx="0" cy="-33" r="6.5" className="phil-figure-head" />
    </g>
  );
}

/** Splits a label into at most two lines of roughly `width` characters. */
export function wrap(text: string, width: number): string[] {
  if (text.length <= width) return [text];
  const words = text.split(" ");
  const lines: string[] = [""];
  for (const w of words) {
    const last = lines[lines.length - 1]!;
    if ((last + " " + w).trim().length > width && last && lines.length < 2) lines.push(w);
    else lines[lines.length - 1] = (last + " " + w).trim();
  }
  return lines;
}
