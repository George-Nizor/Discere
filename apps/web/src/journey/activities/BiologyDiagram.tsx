import { useId, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { BiologyModel, BiologyDiagram as Spec } from "@discere/contracts";
import {
  biologyGivens,
  biologyResults,
  membraneState,
  divisionState,
  divisionPhases,
  dnaComplement,
  punnett,
  foodWebs,
  trophicEnergy,
  bioNumber,
} from "@discere/activity-engine";
const slots = (n: number) => Array.from({ length: n }, (_, position) => position);
const colours = ["#85adff", "#e5bc67", "#87d9ab", "#cdacf7"];
const cellParts = {
  animal: ["Membrane", "Nucleus", "Mitochondria"],
  plant: ["Membrane", "Nucleus", "Mitochondria", "Chloroplasts", "Cell wall"],
  bacterium: ["Membrane", "Nucleoid", "Ribosomes"],
};
export function BiologyDrawing({
  model: m,
  progress = 0,
  selected = 0,
  reveal = false,
  scaleMax,
}: {
  model: BiologyModel;
  progress?: number;
  selected?: number;
  reveal?: boolean;
  scaleMax?: number | undefined;
}) {
  const id = useId();
  let drawing: React.ReactNode;
  if (m.kind === "cell") {
    const plant = m.cell === "plant",
      bacterium = m.cell === "bacterium";
    drawing = (
      <>
        {plant && (
          <rect
            x="117"
            y="15"
            width="326"
            height="200"
            rx="42"
            fill="#294939"
            stroke={selected === 4 ? "#e5bc67" : "#82bf87"}
            strokeWidth="7"
          />
        )}
        <rect
          x={plant ? 130 : 128}
          y={plant ? 29 : 25}
          width={plant ? 300 : 304}
          height={plant ? 172 : 180}
          rx={plant ? 30 : 86}
          fill="#223c3c"
          stroke={selected === 0 ? "#e5bc67" : "#70aaa9"}
          strokeWidth="3"
        />
        {plant && (
          <rect x="235" y="55" width="118" height="116" rx="28" fill="#284f60" stroke="#5391a0" />
        )}
        {bacterium ? (
          <path
            d="M205 97q32-65 76 0t60 10q-3 56-64 17t-66 17q-31-13-6-44"
            fill="none"
            stroke={selected === 1 ? "#e5bc67" : "#c5a7ef"}
            strokeWidth="7"
          />
        ) : (
          <g>
            <ellipse
              cx={plant ? 194 : 263}
              cy="109"
              rx="40"
              ry="37"
              fill="#6e5694"
              stroke={selected === 1 ? "#e5bc67" : "#bd9fe4"}
              strokeWidth="3"
            />
            <circle cx={plant ? 194 : 263} cy="109" r="14" fill="#b698da" />
          </g>
        )}
        {!bacterium &&
          [0, 1].map((p) => (
            <g
              key={p}
              transform={
                "translate(" +
                (plant ? 170 + p * 208 : 181 + p * 176) +
                " " +
                (plant ? 165 : 160) +
                ") rotate(-25)"
              }
            >
              <ellipse
                rx="26"
                ry="13"
                fill="#c58c57"
                stroke={selected === 2 ? "#ffe285" : "#edb17e"}
                strokeWidth="3"
              />
              <path d="M-17 0l7-7 6 14 6-14 7 7" fill="none" stroke="#654634" strokeWidth="3" />
            </g>
          ))}
        {plant &&
          [175, 382].map((x) => (
            <g key={x} transform={"translate(" + x + " 60) rotate(-20)"}>
              <ellipse
                rx="28"
                ry="15"
                fill="#4fa571"
                stroke={selected === 3 ? "#ffe285" : "#a1e2a9"}
                strokeWidth="3"
              />
              <path d="M-13-7v14m9-15v16m9-16v16m9-14v12" stroke="#1c6340" strokeWidth="3" />
            </g>
          ))}
        {bacterium &&
          slots(14).map((p) => (
            <circle
              key={p}
              cx={161 + (p % 7) * 39}
              cy={p < 7 ? 59 : 171}
              r="4"
              fill={selected === 2 ? "#ffe285" : "#8de0b8"}
            />
          ))}
        <text x="280" y="237" textAnchor="middle" className="bio-label">
          {cellParts[m.cell][selected] ?? cellParts[m.cell][0]}
        </text>
      </>
    );
  } else if (m.kind === "membrane") {
    const s = membraneState(m, progress),
      split = 70 + 210 * s.leftVolume;
    drawing = (
      <>
        <rect
          x="70"
          y="30"
          width="420"
          height="155"
          rx="14"
          fill="#213647"
          stroke="#6d90b0"
          strokeWidth="2"
        />
        <rect x="71" y="31" width={split - 71} height="153" rx="12" fill="#31584e" />
        <line
          x1={split}
          y1="30"
          x2={split}
          y2="185"
          stroke="#e3c77b"
          strokeWidth="5"
          strokeDasharray={m.permits === "neither" ? undefined : "5 5"}
        />

        {[
          { centre: (70 + split) / 2, x: 165, n: s.left, label: "Left" },
          { centre: (split + 490) / 2, x: 395, n: s.right, label: "Right" },
        ].map((a) => (
          <g key={a.label}>
            <path
              d={`M${a.centre} 170V195L${a.x} 210`}
              fill="none"
              stroke="#aac5b9"
              strokeWidth="1.5"
            />
            <text x={a.x} y="238" textAnchor="middle" className="bio-label">
              {a.label}: {bioNumber(a.n)} units
            </text>
          </g>
        ))}
      </>
    );
  } else if (m.kind === "series") {
    const maxY = scaleMax ?? Math.max(...m.points.map((p) => p[1]), 1),
      maxX = m.points.at(-1)![0],
      x = (v: number) => 70 + (420 * v) / Math.max(maxX, 1),
      y = (v: number) => 185 - (145 * v) / maxY;
    drawing = (
      <>
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1="70" x2="490" y1={y(t * maxY)} y2={y(t * maxY)} stroke="#3e5058" />
            <text x="59" y={y(t * maxY) + 6} textAnchor="end" className="bio-label">
              {bioNumber(t * maxY)}
            </text>
          </g>
        ))}
        <polyline
          points={m.points.map((p) => x(p[0]) + "," + y(p[1])).join(" ")}
          fill="none"
          stroke="#80d7a6"
          strokeWidth="3"
        />
        {m.points.map((p, i) => (
          <g key={p[0]}>
            <circle
              cx={x(p[0])}
              cy={y(p[1])}
              r={selected === i ? 8 : 5}
              fill={selected === i ? "#f7d67c" : "#8cd7ad"}
            />
            <text x={x(p[0])} y="211" textAnchor="middle" className="bio-label">
              {p[0]}
            </text>
          </g>
        ))}
        <text x="280" y="24" textAnchor="middle" className="bio-label">
          {m.yLabel}
        </text>
        <text x="280" y="239" textAnchor="middle" className="bio-label">
          {m.xLabel}
        </text>
      </>
    );
  } else if (m.kind === "energy") {
    const photo = m.process === "photosynthesis";
    drawing = (
      <>
        <path
          d={
            photo
              ? "M235 175Q159 48 337 40Q376 160 235 175"
              : "M204 85C177 18 374 18 384 104C403 193 218 212 204 85"
          }
          fill={photo ? "#327556" : "#745537"}
          stroke={photo ? "#91d49b" : "#e5b981"}
          strokeWidth="3"
        />
        <path
          d={
            photo
              ? "M234 174L321 57M267 124l-48-33m62 11 59-11"
              : "M223 89l28-30 27 85 27-84 27 72 29-29"
          }
          stroke={photo ? "#9bd69c" : "#d8a77b"}
          strokeWidth="5"
          fill="none"
        />
        <text x="280" y="219" textAnchor="middle" className="bio-label">
          {photo ? "Light energy captured" : "Energy transferred to ATP and heat"}
        </text>
        <text x="85" y="76" textAnchor="middle" className="bio-label">
          {photo ? "CO₂" : "Glucose"}
        </text>
        <text
          x="85"
          y="140"
          textAnchor="middle"
          className="bio-label"
          opacity={selected === 1 ? 0.25 : 1}
        >
          {photo ? "Water" : "O₂"}
        </text>
        <text x="477" y="76" textAnchor="middle" className="bio-label">
          {photo ? "Glucose" : "CO₂"}
        </text>
        <text
          x="477"
          y="140"
          textAnchor="middle"
          className="bio-label"
          opacity={selected === 1 ? 0.25 : 1}
        >
          {photo ? "O₂" : "Water"}
        </text>
        <path
          d="M120 105h65m-12-8 12 8-12 8M388 105h40m-12-8 12 8-12 8"
          fill="none"
          stroke="#b1c5be"
          strokeWidth="3"
        />
      </>
    );
  } else if (m.kind === "dna") {
    const other = dnaComplement(m.sequence),
      width = 420 / m.sequence.length;
    drawing = (
      <>
        <text x="34" y="85" className="bio-label">
          5′
        </text>
        <text x="515" y="85" className="bio-label">
          3′
        </text>
        <text x="34" y="169" className="bio-label">
          3′
        </text>
        <text x="515" y="169" className="bio-label">
          5′
        </text>
        {slots(m.sequence.length).map((i) => (
          <g key={i}>
            <rect
              x={70 + i * width}
              y="52"
              width={width - 6}
              height="51"
              rx="9"
              fill={colours["ATCG".indexOf(m.sequence[i]!)]}
            />
            <text
              x={70 + i * width + (width - 6) / 2}
              y="86"
              textAnchor="middle"
              className="bio-base"
            >
              {m.sequence[i]}
            </text>
            <path
              d={"M" + (70 + i * width + (width - 6) / 2) + " 109v18"}
              stroke="#809496"
              strokeDasharray="3 3"
            />
            <rect
              x={70 + i * width}
              y="136"
              width={width - 6}
              height="51"
              rx="9"
              fill={
                i < Math.round(progress * m.sequence.length)
                  ? colours["ATCG".indexOf(other[i]!)]
                  : "#273a43"
              }
              stroke="#65808b"
            />
            <text
              x={70 + i * width + (width - 6) / 2}
              y="170"
              textAnchor="middle"
              className={i < Math.round(progress * m.sequence.length) ? "bio-base" : "bio-label"}
            >
              {i < Math.round(progress * m.sequence.length) ? other[i] : "?"}
            </text>
          </g>
        ))}
        <text x="280" y="223" textAnchor="middle" className="bio-label">
          Template above · complementary strand below
        </text>
      </>
    );
  } else if (m.kind === "division") {
    const s = divisionState(m);
    drawing = (
      <>
        {slots(s.cells).map((c) => (
          <g
            key={c}
            transform={
              "translate(" +
              (s.cells === 1 ? 280 : s.cells === 2 ? 158 + c * 244 : 75 + c * 137) +
              " 110)"
            }
          >
            <ellipse
              rx={s.cells === 4 ? 60 : 101}
              ry="76"
              fill="#253c44"
              stroke="#6a9aa2"
              strokeWidth="2"
            />
            {slots(s.chromosomes).map((k) => {
              const x = (k - (s.chromosomes - 1) / 2) * (s.cells === 4 ? 12 : 20),
                colour = colours[s.chromosomes === m.pairs ? c % 2 : k % 2],
                halfLength = 15 + 7 * (s.chromosomes === m.pairs ? k : Math.floor(k / 2));
              return (
                <g key={k} stroke={colour} strokeWidth="5" strokeLinecap="round">
                  <path
                    d={
                      s.copied
                        ? `M${x - 5} ${-halfLength}l10 ${halfLength * 2}`
                        : `M${x} ${-halfLength}v${halfLength * 2}`
                    }
                  />
                  {s.copied && <path d={`M${x + 5} ${-halfLength}l-10 ${halfLength * 2}`} />}
                </g>
              );
            })}
          </g>
        ))}
        <text x="280" y="219" textAnchor="middle" className="bio-label">
          {divisionPhases[m.phase]}
        </text>
      </>
    );
  } else if (m.kind === "cross") {
    const cells = punnett(m.first, m.second);
    drawing = (
      <>
        {slots(2).map((p) => (
          <g key={p}>
            <text x={267 + p * 90} y="39" textAnchor="middle" className="bio-value">
              {m.second[p]}
            </text>
            <text x="193" y={99 + p * 80} textAnchor="middle" className="bio-value">
              {m.first[p]}
            </text>
          </g>
        ))}
        {slots(4).map((p) => (
          <g key={p}>
            <rect
              x={225 + (p % 2) * 90}
              y={51 + Math.floor(p / 2) * 80}
              width="82"
              height="72"
              rx="12"
              fill={selected === p ? "#345743" : "#25383d"}
              stroke={selected === p ? "#83d6a1" : "#56757b"}
              strokeWidth="2"
            />
            <text
              x={266 + (p % 2) * 90}
              y={96 + Math.floor(p / 2) * 80}
              textAnchor="middle"
              className="bio-value"
            >
              {reveal || selected === p ? cells[p] : "?"}
            </text>
          </g>
        ))}
        <text x="280" y="239" textAnchor="middle" className="bio-label">
          One equally likely pairing per square
        </text>
      </>
    );
  } else if (m.kind === "population") {
    const max = scaleMax ?? Math.max(...m.before, ...m.after),
      values = selected === 0 ? m.before : m.after;
    drawing = (
      <>
        {[0, 1].map((p) => (
          <g key={p}>
            <rect
              x={145 + p * 170}
              y={185 - (140 * values[p]!) / max}
              width="98"
              height={(140 * values[p]!) / max}
              rx="9"
              fill={colours[p]}
            />
            <text
              x={194 + p * 170}
              y={172 - (140 * values[p]!) / max}
              textAnchor="middle"
              className="bio-value"
            >
              {values[p]}
            </text>
            <text x={194 + p * 170} y="216" textAnchor="middle" className="bio-label">
              {p === 0 ? "Blue" : "Gold"}
            </text>
          </g>
        ))}
        <path d="M100 185h355" stroke="#80908c" strokeWidth="2" />
        <text x="280" y="25" textAnchor="middle" className="bio-label">
          {selected === 0 ? "Before" : "Later"} · number of organisms
        </text>
      </>
    );
  } else if (m.kind === "food_web") {
    const web = foodWebs[m.habitat],
      pos =
        m.habitat === "meadow"
          ? [
              [65, 115],
              [230, 55],
              [230, 185],
              [393, 55],
              [493, 175],
            ]
          : [
              [65, 115],
              [215, 55],
              [365, 55],
              [480, 175],
            ];
    drawing = (
      <>
        <defs>
          <marker
            id={id + "arrow"}
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
          >
            <path d="M0 0 8 4 0 8" fill="#95c3ac" />
          </marker>
        </defs>
        {web.edges.map(([a, b]) => {
          const A = pos[a]!,
            B = pos[b]!,
            d = Math.hypot(B[0]! - A[0]!, B[1]! - A[1]!),
            dx = (B[0]! - A[0]!) / d,
            dy = (B[1]! - A[1]!) / d;
          return (
            <line
              key={a + ":" + b}
              x1={A[0]! + dx * 33}
              y1={A[1]! + dy * 33}
              x2={B[0]! - dx * 39}
              y2={B[1]! - dy * 39}
              stroke={selected === a || selected === b ? "#93d9ad" : "#4b6e60"}
              strokeWidth={selected === a || selected === b ? 3 : 1.5}
              markerEnd={"url(#" + id + "arrow)"}
            />
          );
        })}
        {web.names.map((name, p) => (
          <g key={name}>
            <circle
              cx={pos[p]![0]}
              cy={pos[p]![1]}
              r="28"
              fill={p === 0 ? "#357651" : colours[p % 4]}
              stroke={selected === p ? "#f7dc8c" : "#566c68"}
              strokeWidth="3"
            />
            <text
              x={pos[p]![0]}
              y={pos[p]![1]! + 7}
              textAnchor="middle"
              className="bio-base"
              data-scale=""
            >
              {p + 1}
            </text>
            <text x={pos[p]![0]} y={pos[p]![1]! + 49} textAnchor="middle" className="bio-label">
              {name}
            </text>
          </g>
        ))}
      </>
    );
  } else {
    const values = trophicEnergy(m);
    drawing = (
      <>
        {values.map((n, p) => (
          <g key={n}>
            <rect
              x="100"
              y={187 - p * 49}
              width={(360 * n) / m.base}
              height="28"
              rx="3"
              fill={colours[p]}
            />
            <text x="90" y={208 - p * 49} textAnchor="end" className="bio-label">
              L{p + 1}
            </text>
            <text
              x={Math.max(100 + (360 * n) / m.base + 9, 170)}
              y={208 - p * 49}
              className="bio-label"
            >
              {reveal || p === 0 ? bioNumber(n) + " kJ" : "?"}
            </text>
          </g>
        ))}
        <text x="280" y="25" textAnchor="middle" className="bio-label">
          Bar length: energy on one common scale
        </text>
      </>
    );
  }

  let description = "";
  if (m.kind === "series")
    description = m.points
      .map((p) => m.xLabel + " " + p[0] + ": " + m.yLabel + " " + p[1])
      .join("; ");
  if (m.kind === "membrane") {
    const state = membraneState(m, progress);
    description =
      "Left: " +
      bioNumber(state.left) +
      " solute units in volume " +
      bioNumber(state.leftVolume) +
      ". Right: " +
      bioNumber(state.right) +
      " units in volume " +
      bioNumber(state.rightVolume) +
      ".";
  }
  if (m.kind === "dna")
    description =
      "Visible complementary bases: " +
      [...dnaComplement(m.sequence)]
        .map((b, i) => (i < Math.round(progress * m.sequence.length) ? b : "blank"))
        .join(", ");
  if (m.kind === "division") {
    const state = divisionState(m);
    description =
      divisionPhases[m.phase] +
      ": " +
      state.cells +
      " cells, each showing " +
      state.chromosomes +
      " chromosomes and " +
      state.chromatids +
      " DNA molecules.";
  }
  if (m.kind === "cross")
    description =
      selected < 0
        ? "Four empty pairing squares."
        : reveal
          ? "Pairings: " + punnett(m.first, m.second).join(", ")
          : "Selected pairing: " + punnett(m.first, m.second)[selected];
  return (
    <svg
      className="biology-drawing"
      viewBox="0 0 560 250"
      role="img"
      aria-labelledby={id}
      aria-describedby={description ? id + "-description" : undefined}
    >
      <title id={id}>{biologyGivens(m)}</title>
      {description && <desc id={id + "-description"}>{description}</desc>}
      {drawing}
    </svg>
  );
}
export function BiologyGivenVisual({ model }: { model: BiologyModel }) {
  return (
    <div className="biology-check">
      <p className="bio-givens">{biologyGivens(model)}</p>
      <BiologyDrawing model={model} selected={-1} />
    </div>
  );
}
export function BiologyDiagram({
  spec,
  showResults = false,
}: {
  spec: Spec;
  showResults?: boolean;
}) {
  const [selectedCase, setCase] = useState(spec.initialCaseId),
    [value, setValue] = useState(0),
    id = useId();
  const base = spec.cases.find((c) => c.id === selectedCase)!.model;
  const m: BiologyModel =
    base.kind === "division"
      ? { ...base, phase: (base.phase + value) % 4 }
      : base.kind === "pyramid"
        ? { ...base, percent: base.percent + value }
        : base;
  const scaleMax =
    base.kind === "series"
      ? Math.max(
          ...spec.cases.flatMap((c) =>
            c.model.kind === "series" ? c.model.points.map((p) => p[1]) : [],
          ),
          1,
        )
      : base.kind === "population"
        ? Math.max(
            ...spec.cases.flatMap((c) =>
              c.model.kind === "population" ? [...c.model.before, ...c.model.after] : [],
            ),
          )
        : undefined;
  const options =
    base.kind === "cell"
      ? cellParts[base.cell]
      : base.kind === "population"
        ? ["Before", "Later"]
        : base.kind === "food_web"
          ? [...foodWebs[base.habitat].names]
          : null;
  const max =
    base.kind === "series"
      ? base.points.length - 1
      : base.kind === "division" || base.kind === "cross"
        ? 3
        : base.kind === "pyramid"
          ? 30 - base.percent
          : 100;
  const label =
    base.kind === "membrane"
      ? "Move toward equilibrium"
      : base.kind === "dna"
        ? "Build the complementary strand"
        : base.kind === "series"
          ? "Inspect an observation"
          : base.kind === "division"
            ? "Follow the divisions"
            : base.kind === "cross"
              ? "Inspect a pairing"
              : base.kind === "pyramid"
                ? "Transfer percentage"
                : "Glucose units";
  const legend =
    base.kind === "cell"
      ? "Schematic; organelle sizes and numbers are not to scale."
      : base.kind === "membrane"
        ? "Ideal equal starting volumes; a movable partition, no pressure difference, equal solute concentration at equilibrium."
        : base.kind === "series"
          ? "Illustrative measurements, not a universal biological rate."
          : base.kind === "dna"
            ? "Aligned opposite directions: A pairs with T; C pairs with G."
            : base.kind === "division"
              ? "One possible chromosome allocation. Endpoints after copying or division; crossover omitted."
              : base.kind === "cross"
                ? "One gene, two alleles, complete dominance; a probability, not a promised family ratio."
                : base.kind === "population"
                  ? "Counts alone show a change, not its cause."
                  : base.kind === "food_web"
                    ? "Arrows point from food to consumer. Only selected feeding links are shown."
                    : base.kind === "pyramid"
                      ? "The stated percentage is a model assumption; real transfer varies."
                      : "Simplified overall accounting; respiration also occurs in plant cells.";
  return (
    <div className="learning-diagram biology-diagram">
      <div className="bio-cases" role="group" aria-label="Compare biology cases">
        {spec.cases.map((c) => (
          <button
            type="button"
            key={c.id}
            aria-pressed={c.id === selectedCase}
            onClick={() => {
              setCase(c.id);
              setValue(0);
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      <p className="bio-givens">{biologyGivens(m)}</p>
      <BiologyDrawing
        model={m}
        progress={value / 100}
        selected={value}
        scaleMax={scaleMax}
        reveal={showResults}
      />
      <div className="bio-tools">
        {options ? (
          <label htmlFor={id}>
            Inspect
            <select id={id} value={value} onChange={(e) => setValue(Number(e.currentTarget.value))}>
              {options.map((o, i) => (
                <option key={o} value={i}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        ) : base.kind === "energy" ? (
          <button
            type="button"
            aria-pressed={value === 1}
            onClick={() => setValue(value === 0 ? 1 : 0)}
          >
            {value === 0 ? "Trace the carbon" : "Show energy transfer"}
          </button>
        ) : (
          <label htmlFor={id}>
            {label}
            {base.kind === "pyramid" ? " · " + (base.percent + value) + "%" : ""}
            <input
              type="range"
              id={id}
              aria-label={label}
              min={base.kind === "pyramid" ? 5 - base.percent : 0}
              max={max}
              value={value}
              step={1}
              onChange={(e) => setValue(Number(e.currentTarget.value))}
            />
          </label>
        )}
        <button type="button" aria-label="Reset biology model" onClick={() => setValue(0)}>
          <RotateCcw size={18} aria-hidden="true" />
        </button>
      </div>
      {base.kind === "series" && (
        <p className="bio-reading" aria-live="polite">
          {base.xLabel}: {base.points[value]![0]} · {base.yLabel}: {base.points[value]![1]}
        </p>
      )}
      {base.kind === "energy" && (
        <p className="bio-reading" aria-live="polite">
          {value === 1
            ? "Carbon travels between carbon dioxide and sugar; oxygen gas contains no carbon."
            : base.glucose +
              " glucose " +
              (base.glucose === 1 ? "unit" : "units") +
              " in this reaction accounting."}
        </p>
      )}
      <p className="bio-legend">{legend}</p>
      {showResults && (
        <div className="bio-results" aria-label="Biology results">
          {biologyResults(m).map((r) => (
            <p key={r}>{r}</p>
          ))}
        </div>
      )}
    </div>
  );
}
