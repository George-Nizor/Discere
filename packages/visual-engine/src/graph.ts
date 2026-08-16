import { escapeXml, formatNumber } from "./svg.js";

export interface OhmsLawGraphOptions {
  id: string;
  resistance: number;
  maxVoltage?: number;
  width?: number;
  height?: number;
}

export function renderOhmsLawGraphSvg(options: OhmsLawGraphOptions): string {
  if (options.resistance <= 0) throw new RangeError("Resistance must be positive.");
  const maxVoltage = options.maxVoltage ?? 12;
  const width = options.width ?? 720;
  const height = options.height ?? 360;
  const margin = 58;
  const plotWidth = width - margin * 2;
  const plotHeight = height - margin * 2;
  const maxCurrent = maxVoltage / options.resistance;
  const points = Array.from({ length: 7 }, (_, index) => {
    const voltage = (maxVoltage * index) / 6;
    const current = voltage / options.resistance;
    const x = margin + (voltage / maxVoltage) * plotWidth;
    const y = height - margin - (current / maxCurrent) * plotHeight;
    return { voltage, x, y };
  });
  const polyline = points.map((point) => `${formatNumber(point.x, 1)},${formatNumber(point.y, 1)}`).join(" ");
  const ticks = points.map((point) => `<line x1="${point.x}" y1="${height - margin}" x2="${point.x}" y2="${height - margin + 7}" class="axis" />
      <text x="${point.x}" y="${height - margin + 26}" text-anchor="middle" class="tick">${formatNumber(point.voltage, 1)}</text>`).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="graph-title-${escapeXml(options.id)} graph-desc-${escapeXml(options.id)}">
  <title id="graph-title-${escapeXml(options.id)}">Current against voltage for a ${formatNumber(options.resistance)} ohm resistor</title>
  <desc id="graph-desc-${escapeXml(options.id)}">A straight line through the origin. Current increases in direct proportion to voltage while resistance remains fixed.</desc>
  <style>
    .axis { stroke: currentColor; stroke-width: 2; }
    .line { fill: none; stroke: #1d6b5d; stroke-width: 5; stroke-linecap: round; }
    .tick, .label { fill: currentColor; font: 15px ui-sans-serif, system-ui, sans-serif; }
    .label { font-weight: 650; }
  </style>
  <line x1="${margin}" y1="${height - margin}" x2="${width - margin}" y2="${height - margin}" class="axis" />
  <line x1="${margin}" y1="${height - margin}" x2="${margin}" y2="${margin}" class="axis" />
  ${ticks}
  <polyline points="${polyline}" class="line" />
  <text x="${width / 2}" y="${height - 10}" text-anchor="middle" class="label">Voltage (V)</text>
  <text x="18" y="${height / 2}" text-anchor="middle" transform="rotate(-90 18 ${height / 2})" class="label">Current (A)</text>
</svg>`;
}
