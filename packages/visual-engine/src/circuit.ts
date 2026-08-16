import type { CircuitDiagramSpec } from "@discere/contracts";
import { escapeXml, formatNumber } from "./svg.js";

export function calculateCurrent(voltage: number, resistance: number): number {
  if (!Number.isFinite(voltage) || voltage <= 0) throw new RangeError("Voltage must be positive.");
  if (!Number.isFinite(resistance) || resistance <= 0) throw new RangeError("Resistance must be positive.");
  return voltage / resistance;
}

export function renderCircuitSvg(spec: CircuitDiagramSpec): string {
  const current = calculateCurrent(spec.voltage, spec.resistance);
  const safeId = escapeXml(spec.id);
  const title = `${formatNumber(spec.voltage)} volt series circuit with a ${formatNumber(spec.resistance)} ohm resistor`;
  const description = `A battery is connected in one closed loop to a resistor. The calculated current is ${formatNumber(current)} amperes.`;
  const values = spec.showValues
    ? `<text x="124" y="248" text-anchor="middle" class="value">${formatNumber(spec.voltage)} V</text>
       <text x="360" y="103" text-anchor="middle" class="value">${formatNumber(spec.resistance)} Ω</text>
       <text x="360" y="292" text-anchor="middle" class="current">I = ${formatNumber(current)} A</text>`
    : "";
  const arrow = spec.showCurrentArrow
    ? `<defs><marker id="arrow-${safeId}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="currentColor" /></marker></defs>
       <path d="M205 60 H270" class="flow" marker-end="url(#arrow-${safeId})" />`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 350" role="img" aria-labelledby="title-${safeId} desc-${safeId}">
  <title id="title-${safeId}">${escapeXml(title)}</title>
  <desc id="desc-${safeId}">${escapeXml(description)}</desc>
  <style>
    .wire { fill: none; stroke: currentColor; stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; }
    .component { fill: #f7f1e7; stroke: currentColor; stroke-width: 5; }
    .plate { stroke: currentColor; stroke-width: 6; stroke-linecap: round; }
    .label { font: 650 18px ui-sans-serif, system-ui, sans-serif; fill: currentColor; }
    .value, .current { font: 500 17px ui-monospace, SFMono-Regular, Consolas, monospace; fill: currentColor; }
    .flow { fill: none; stroke: currentColor; stroke-width: 3; }
  </style>
  ${arrow}
  <path d="M124 60 H305 M415 60 H600 V270 H124 V215 M124 140 V60" class="wire" />
  <line x1="100" y1="150" x2="148" y2="150" class="plate" />
  <line x1="112" y1="192" x2="136" y2="192" class="plate" />
  <rect x="305" y="35" width="110" height="50" rx="4" class="component" />
  <path d="M320 60 l12 -14 14 28 14 -28 14 28 14 -28 12 14" class="wire" style="stroke-width:3" />
  <text x="124" y="122" text-anchor="middle" class="label">${escapeXml(spec.batteryLabel)}</text>
  <text x="360" y="27" text-anchor="middle" class="label">${escapeXml(spec.resistorLabel)}</text>
  ${values}
</svg>`;
}
