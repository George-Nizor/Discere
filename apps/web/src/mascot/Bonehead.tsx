import { type CSSProperties, useEffect, useId, useRef, useState } from "react";

/**
 * Bonehead, the Bonehead Labs bone: Discere's companion. Drawn in code from the brand art so it
 * can blink, emote and react. The drawing is a 128-unit square; the right half of the bone is
 * authored and mirrored, so the figure is exactly symmetric and its shadow sits centred under it.
 */
export type BoneheadExpression = "idle" | "curious" | "delighted" | "encouraging" | "sleepy" | "proud";
export type BoneheadProp = "glasses" | "cap" | "bandage" | "sweat";
export type BoneheadAction = "react" | "bob" | "shake" | "celebrate";

const INK = "#0B1A1C";
const TEAL = "#14A9A9";
const RIM = "#5FD9D2";
const f = (n: number) => +n.toFixed(2);

const START: [number, number] = [64, 37.2];
const RIGHT: Array<[number, number, number, number, number, number]> = [
  [67.4, 37.2, 69.8, 31.6, 76.2, 31.6],
  [82.6, 31.6, 87.6, 35.6, 87.6, 42.5],
  [87.6, 47.6, 85.8, 51.6, 83.6, 55.2],
  [81, 59.6, 79.2, 63.2, 79.2, 68.2],
  [79.2, 74, 79.1, 80, 79.6, 84.6],
  [80.1, 88, 83.4, 89.6, 85.7, 92.2],
  [87.6, 94.4, 88.2, 98.2, 86.9, 101.8],
  [85.5, 105.6, 81.4, 106.6, 77.4, 106.1],
  [72.2, 105.4, 68, 101.8, 64, 101.8],
];
const BONE = (() => {
  let d = `M${START[0]} ${START[1]}`;
  for (const s of RIGHT) d += `C${s.join(" ")}`;
  const ends = [START, ...RIGHT.map((s) => [s[4], s[5]] as [number, number])];
  for (let i = RIGHT.length - 1; i >= 0; i -= 1) {
    const s = RIGHT[i]!;
    const to = ends[i]!;
    d += `C${f(128 - s[2])} ${s[3]} ${f(128 - s[0])} ${s[1]} ${f(128 - to[0])} ${to[1]}`;
  }
  return `${d}Z`;
})();
const EYE = { l: 56.6, r: 71.4, y: 51.8 };

function Eye({
  x,
  side,
  expression,
  mark,
  clipId,
}: {
  x: number;
  side: -1 | 1;
  expression: BoneheadExpression;
  mark: boolean;
  clipId: string;
}) {
  const rx = mark ? 3.2 : 2.75;
  const ry = mark ? 4.8 : 4.2;
  const sw = mark ? 2.8 : 2.3;
  let body: React.ReactNode;
  if (expression === "delighted" || expression === "proud") {
    const h = expression === "proud" ? 2.6 : 4.2;
    body = (
      <path d={`M-2.9 1.2Q0 ${-h} 2.9 1.2`} fill="none" stroke={INK} strokeWidth={sw} strokeLinecap="round" />
    );
  } else if (expression === "sleepy") {
    body = <path d="M-2.9 -.4Q0 2.9 2.9 -.4" fill="none" stroke={INK} strokeWidth={sw * 0.9} strokeLinecap="round" />;
  } else {
    const k = expression === "curious" && side === 1 ? 1.18 : 1;
    const pupil = (
      <g className="bh-pupil">
        <ellipse className="bh-lid" rx={f(rx * k)} ry={f(ry * k)} fill={INK} />
      </g>
    );
    body =
      expression === "encouraging" ? (
        <>
          <clipPath id={clipId}>
            <path d="M-6 -7H6V2.2Q0 -.6 -6 2.2Z" />
          </clipPath>
          <g clipPath={`url(#${clipId})`}>{pupil}</g>
        </>
      ) : (
        pupil
      );
  }
  return (
    <g transform={`translate(${x} ${EYE.y})`}>
      {body}
      {expression === "curious" && side === 1 ? (
        <path d="M-2.7 -6.6Q0 -9 3 -7.2" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      ) : null}
      {expression === "encouraging" ? (
        <path
          d={`M${f(side * 2.8)} -5.6L${f(-side * 2.3)} -7.1`}
          stroke={INK}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      ) : null}
    </g>
  );
}

function Mouth({ expression, mark }: { expression: BoneheadExpression; mark: boolean }) {
  const stroke = {
    fill: "none",
    stroke: INK,
    strokeWidth: mark ? 3.2 : 2.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (expression) {
    case "curious":
      return <ellipse cx="66.2" cy="62" rx="1.9" ry="2.3" fill={INK} />;
    case "delighted":
      return (
        <>
          <path
            d="M57.4 59.4C58.4 66.8 69.4 66.8 70.4 59.4Z"
            fill={INK}
            stroke={INK}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {mark ? null : <ellipse cx="63.9" cy="63.7" rx="3" ry="1.5" fill="#FF8A9A" />}
        </>
      );
    case "encouraging":
      return <path d="M59 60.6C60.6 63 67.2 63 68.8 60.6" {...stroke} />;
    case "sleepy":
      return <ellipse cx="64" cy="62" rx="1.6" ry="1.2" fill={INK} />;
    case "proud":
      return <path d="M58 60.8C60 64.6 67 64.8 70.6 59.4" {...stroke} />;
    default:
      return mark ? (
        <path d="M58 60.2C60 64.4 67.8 64.4 69.8 60.2" {...stroke} />
      ) : (
        <path d="M57.6 59.4C59 62 61 64.4 64 64.4C67 64.4 69 62 70.4 59.4" {...stroke} />
      );
  }
}

function Effects({ expression, dark }: { expression: BoneheadExpression; dark: boolean }) {
  const sparkle = (x: number, y: number, s: number, fill: string) => {
    const k = s * 0.18;
    return (
      <path
        key={`${x}:${y}`}
        className="bh-spark"
        fill={fill}
        d={`M${x} ${y - s}Q${f(x + k)} ${f(y - k)} ${x + s} ${y}Q${f(x + k)} ${f(y + k)} ${x} ${y + s}Q${f(x - k)} ${f(y + k)} ${x - s} ${y}Q${f(x - k)} ${f(y - k)} ${x} ${y - s}Z`}
      />
    );
  };
  switch (expression) {
    case "curious":
      return (
        <text className="bh-q" x="92" y="30" fontSize="15" fontWeight="800" fill={TEAL} fontFamily="system-ui,sans-serif">
          ?
        </text>
      );
    case "sleepy":
      return (
        <g fill={dark ? "#9FE9E3" : "#5D7C80"} fontWeight="800" fontFamily="system-ui,sans-serif">
          <text className="bh-z" x="90" y="34" fontSize="8">
            z
          </text>
          <text className="bh-z" x="90" y="34" fontSize="11">
            z
          </text>
          <text className="bh-z" x="90" y="34" fontSize="14">
            Z
          </text>
        </g>
      );
    case "delighted":
      return <g>{[sparkle(98, 22, 5, "#FFC93D"), sparkle(24, 28, 3.6, TEAL), sparkle(104, 40, 3, "#FFC93D")]}</g>;
    case "proud": {
      let d = "";
      for (let i = 0; i < 10; i += 1) {
        const r = i % 2 ? 6.5 * 0.45 : 6.5;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        d += `${i ? "L" : "M"}${f(98 + r * Math.cos(a))} ${f(18 + r * Math.sin(a))}`;
      }
      return <path className="bh-star" d={`${d}Z`} fill="#FFC93D" stroke="#FFC93D" strokeWidth="1.4" strokeLinejoin="round" />;
    }
    case "encouraging":
      return (
        <path
          className="bh-heart"
          fill={TEAL}
          d="M103 28.5C96 24 98.5 18.5 103 22.25C107.5 18.5 110 24 103 28.5Z"
        />
      );
    default:
      return null;
  }
}

function Note({ x, y, colour, dx, rot }: { x: number; y: number; colour: string; dx: number; rot: number }) {
  return (
    <g className="bh-note" style={{ "--dx": `${dx}px`, "--rot": `${rot}deg` } as CSSProperties}>
      <g transform={`translate(${x} ${y})`}>
        <ellipse rx="2.2" ry="1.6" transform="rotate(-22)" fill={colour} />
        <path d="M1.9 -.3V-8.2Q5.4 -7 5.4 -3.8" fill="none" stroke={colour} strokeWidth="1.3" strokeLinecap="round" />
      </g>
    </g>
  );
}

export interface BoneheadProps {
  expression?: BoneheadExpression;
  /** Dark adds a teal rim so the outline survives on the near-black interface. */
  treatment?: "dark" | "light";
  /** The heavier small-size drawing for marks, avatars and icons up to about 48px. */
  mark?: boolean;
  props?: readonly BoneheadProp[];
  /** Ear cups light up, as after a correct answer. */
  glow?: boolean;
  /** Nods along with notes, as while a lesson is read aloud. */
  listening?: boolean;
  /** Plays a one-off body animation; change the key to replay. */
  action?: { name: BoneheadAction; key: number } | null;
  /** Idle bob, breathing and blinking. Off for static uses such as icons. */
  live?: boolean;
  /** -1..1 gaze offset for eyes that follow something. */
  look?: { x: number; y: number };
  /** Hide the expression sparkles and z's, e.g. at small sizes. */
  quiet?: boolean;
  size?: number | string;
  className?: string;
  title?: string;
  /** Crop to the figure (default) or keep the full square canvas. */
  framing?: "figure" | "full";
}

export function Bonehead({
  expression = "idle",
  treatment = "dark",
  mark = false,
  props = [],
  glow = false,
  listening = false,
  action = null,
  live = false,
  look,
  quiet = false,
  size = 64,
  className = "",
  title,
  framing = "figure",
}: BoneheadProps) {
  const id = useId().replace(/[:]/g, "");
  const dark = treatment === "dark";
  const sw = mark ? 6.2 : 4.7;
  const body = dark ? "#F7F8F4" : "#FFFFFF";
  const [blinking, setBlinking] = useState(false);
  const [playing, setPlaying] = useState<BoneheadAction | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!live) return;
    let handle: number;
    const schedule = () => {
      handle = window.setTimeout(() => {
        setBlinking(true);
        window.setTimeout(() => setBlinking(false), 130);
        schedule();
      }, 2200 + Math.random() * 3600);
    };
    schedule();
    return () => window.clearTimeout(handle);
  }, [live]);

  // Keyed by name and key, not object identity: a caller may build the object on every render.
  const actionName = action?.name;
  const actionKey = action?.key;
  useEffect(() => {
    if (!actionName) return;
    setPlaying(null);
    const frame = requestAnimationFrame(() => setPlaying(actionName));
    const duration = { react: 720, bob: 660, shake: 560, celebrate: 1060 }[actionName];
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPlaying(null), duration);
    return () => cancelAnimationFrame(frame);
  }, [actionName, actionKey]);

  const classes = [
    "bh",
    `bh--${treatment}`,
    `bh-expr-${expression}`,
    mark ? "is-mark" : "",
    live ? "is-live" : "",
    blinking ? "is-blinking" : "",
    glow ? "is-glowing" : "",
    listening ? "is-listening" : "",
    playing ? `do-${playing}` : "",
    ...props.map((prop) => `p-${prop}`),
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const gaze = look ?? { x: 0, y: 0 };
  const cup = (cls: "cup-l" | "cup-r", x: number) => (
    <g className={`bh-cup ${cls}`}>
      <rect x={x} y="40" width="14" height="24" rx="6.4" fill={INK} stroke={INK} strokeWidth={sw} />
      <rect
        className="bh-cup-fill"
        x={x + (cls === "cup-l" ? 2.1 : 3)}
        y={mark ? 42.6 : 42.2}
        width={mark ? 8 : 8.9}
        height={mark ? 18.8 : 19.6}
        rx={mark ? 3.6 : 4}
        fill={TEAL}
      />
    </g>
  );
  const viewBox = framing === "full" ? "0 0 128 128" : "10 8 108 108";
  return (
    <svg
      className={classes}
      viewBox={viewBox}
      width={size}
      height={size}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        {dark ? (
          <filter id={`${id}rim`} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
            <feMorphology in="SourceAlpha" operator="dilate" radius={mark ? 2.2 : 1.6} result="d" />
            <feFlood floodColor={RIM} />
            <feComposite in2="d" operator="in" result="rim" />
            <feGaussianBlur in="rim" stdDeviation={mark ? 2 : 3.2} result="b" />
            <feComponentTransfer in="b" result="glow">
              <feFuncA type="linear" slope={mark ? 0.3 : 0.45} />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="rim" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ) : null}
      </defs>
      {/* Centred under the bone; the brand art's puddle sat off to the right. */}
      <ellipse className="bh-puddle" cx="64" cy="110" rx={mark ? 21.5 : 22.8} ry={mark ? 4.4 : 3.8} fill={dark ? "#1DB5B1" : TEAL} />
      <g className="bh-rig">
        <g className="bh-act">
          <g className="bh-pose" filter={dark ? `url(#${id}rim)` : undefined}>
            <g className="bh-phones">
              <path
                className="bh-band"
                d="M36.8 41C36.2 25 49 17.8 64 17.8C79 17.8 91.8 25 91.2 41"
                fill="none"
                stroke={INK}
                strokeWidth={sw}
                strokeLinecap="round"
              />
              {cup("cup-l", 30)}
              {cup("cup-r", 84)}
            </g>
            <path className="bh-bone" d={BONE} fill={body} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
            <path
              className="bh-neckband"
              d="M38.5 42C42 55 54 59.5 64 59.5C74 59.5 86 55 89.5 42"
              fill="none"
              stroke={INK}
              strokeWidth={sw}
              strokeLinecap="round"
            />
            <g className="bh-prop bh-bandage" transform="rotate(32 80.5 38)">
              <rect x="74" y="35.8" width="13" height="4.6" rx="2.2" fill="#F4D3AE" stroke={INK} strokeWidth="1.3" />
              <rect x="78.6" y="35.8" width="3.8" height="4.6" fill="#E6B585" />
            </g>
            <g
              className="bh-face"
              transform={`translate(${f(gaze.x * 1.8)} ${f(gaze.y * 1.4)})`}
            >
              {!mark && (expression === "delighted" || expression === "proud" || expression === "encouraging") ? (
                <g fill="#FF9DA8" opacity={expression === "delighted" ? 0.55 : 0.35}>
                  <ellipse cx="51.5" cy="59" rx="3" ry="1.5" />
                  <ellipse cx="76.3" cy="59" rx="3" ry="1.5" />
                </g>
              ) : null}
              <g transform={`translate(${f(gaze.x * 1.3)} ${f(gaze.y * 1.3)})`}>
                <Eye x={EYE.l} side={-1} expression={expression} mark={mark} clipId={`${id}cl`} />
                <Eye x={EYE.r} side={1} expression={expression} mark={mark} clipId={`${id}cr`} />
              </g>
              <Mouth expression={expression} mark={mark} />
            </g>
            <g className="bh-prop bh-glasses" fill="none" stroke={INK} strokeWidth="1.6">
              <circle cx={EYE.l} cy={EYE.y + 0.4} r="5.6" fill="#E8F7F6" fillOpacity=".35" />
              <circle cx={EYE.r} cy={EYE.y + 0.4} r="5.6" fill="#E8F7F6" fillOpacity=".35" />
              <path d="M61.6 51.6Q63.8 50 66 51.6M50.4 51.4L46.8 50M77.2 51.4L80.8 50" strokeLinecap="round" />
            </g>
            <g className="bh-prop bh-sweat">
              <path
                d="M84 44.5C82.2 47.5 81.4 49 81.4 50.4A2.6 2.6 0 0 0 86.6 50.4C86.6 49 85.8 47.5 84 44.5Z"
                fill="#9BEAF0"
                stroke={INK}
                strokeWidth="1.1"
              />
            </g>
            <g className="bh-prop bh-cap">
              <g transform="rotate(-8 64 18)">
                <path d="M54 18.5V24.6Q64 28.6 74 24.6V18.5" fill={INK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
                <path d="M64 9.4L84 16.2L64 23L44 16.2Z" fill="#1E3336" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
                <circle cx="64" cy="16.2" r="1.7" fill={TEAL} />
                <g className="bh-tassel">
                  <path d="M64 16.2L76 19V27" fill="none" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M74.4 26.4H77.6L78 31.4H74Z" fill={TEAL} />
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
      {mark || quiet ? null : <Effects expression={expression} dark={dark} />}
      <g className="bh-waves" fill="none" stroke={dark ? RIM : TEAL} strokeWidth="1.6" strokeLinecap="round">
        <path className="bh-wave" d="M22 46Q18 52 22 58" />
        <path className="bh-wave" d="M17 43Q12 52 17 61" />
        <path className="bh-wave" d="M106 46Q110 52 106 58" />
        <path className="bh-wave" d="M111 43Q116 52 111 61" />
      </g>
      <g className="bh-notes">
        <Note x={22} y={44} colour={dark ? RIM : TEAL} dx={-6} rot={-14} />
        <Note x={104} y={42} colour={dark ? RIM : TEAL} dx={7} rot={14} />
        <Note x={26} y={40} colour={dark ? "#FFC93D" : "#E0A100"} dx={-9} rot={-10} />
        <Note x={100} y={46} colour={dark ? "#FFC93D" : "#E0A100"} dx={9} rot={12} />
      </g>
    </svg>
  );
}
