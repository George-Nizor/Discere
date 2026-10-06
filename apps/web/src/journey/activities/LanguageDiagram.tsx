import type {
  LanguageDiagram as Spec,
  LanguageJoinMark,
  LanguageMark,
  LanguageModel,
} from "@discere/contracts";
import {
  languageArc,
  languageGivens,
  languageJoinVerdict,
  languageMarkGlyph,
  languageMarkLabel,
  languageMarkName,
  languageMeasures,
  languageScansion,
  languageScansionLine,
  languageSonnet,
  languageVoiceSentence,
  languageWordCount,
  languageCompression,
  languageToulminRoles,
} from "@discere/activity-engine";
import { Pause, Play, RotateCcw } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { useExperience } from "../../study/experience.js";

type Model<K extends LanguageModel["kind"]> = Extract<LanguageModel, { kind: K }>;
interface StageProps<K extends LanguageModel["kind"]> {
  model: Model<K>;
  reveal: boolean;
  interactive: boolean;
  reduced: boolean;
}

// ---------------------------------------------------------------- layout helpers

interface Anchor {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
/** Positions of `[data-anchor]` children relative to the container, refreshed on resize. */
function useAnchors(ref: RefObject<HTMLElement | null>, deps: unknown[]): Anchor[] {
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const next = [...el.querySelectorAll<HTMLElement>("[data-anchor]")].map((node) => {
        // A span that wraps reports one box per line; anchor on the first.
        const r = node.getClientRects()[0] ?? node.getBoundingClientRect();
        return {
          key: node.dataset["anchor"]!,
          x: r.left - box.left,
          y: r.top - box.top,
          w: r.width,
          h: r.height,
        };
      });
      setAnchors((old) => (JSON.stringify(old) === JSON.stringify(next) ? old : next));
    };
    measure();
    // Re-measure once glide animations have settled; transforms distort the first reading.
    const settle = setTimeout(measure, 900);
    if (typeof ResizeObserver !== "function") return () => clearTimeout(settle);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      clearTimeout(settle);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return anchors;
}
/** FLIP: elements with `[data-flip]` glide from their previous position to the new one. */
function useFlip(ref: RefObject<HTMLElement | null>, deps: unknown[], reduced: boolean) {
  const previous = useRef(new Map<string, DOMRect>());
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = new Map<string, DOMRect>();
    el.querySelectorAll<HTMLElement>("[data-flip]").forEach((node, index) => {
      const key = node.dataset["flip"]!;
      const rect = node.getBoundingClientRect();
      next.set(key, rect);
      const before = previous.current.get(key);
      if (!before || reduced || typeof node.animate !== "function") return;
      const dx = before.left - rect.left,
        dy = before.top - rect.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      node.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
        { duration: 620, delay: index * 40, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" },
      );
    });
    previous.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
const centre = (a: Anchor) => ({ x: a.x + a.w / 2, y: a.y + a.h / 2 });
/** Where the segment from a rectangle's centre towards a point leaves the rectangle. */
function edge(a: Anchor, toward: { x: number; y: number }, pad = 6) {
  const c = centre(a),
    dx = toward.x - c.x,
    dy = toward.y - c.y;
  if (!dx && !dy) return c;
  const sx = dx ? (a.w / 2 + pad) / Math.abs(dx) : Infinity,
    sy = dy ? (a.h / 2 + pad) / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy, 1);
  return { x: c.x + dx * s, y: c.y + dy * s };
}
/** Pair each item with its position and a stable string id for React keys. */
const indexed = <T,>(list: readonly T[]) => list.map((item, n) => ({ item, n, id: String(n) }));
/** Split text into word and space tokens so that words can be tapped. */
const tokens = (text: string) => text.split(/(\s+)/u).filter(Boolean);
const isWord = (t: string) => /[\p{L}\p{N}]/u.test(t);

function Overlay({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <svg
      className="lang-overlay"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <defs>
        <marker
          id="lang-arrowhead"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 1L9 5L0 9Z" className="lang-arrowhead" />
        </marker>
      </defs>
      {children}
    </svg>
  );
}

// ---------------------------------------------------------------- clauses

const roleLabel: Record<string, string> = {
  subject: "subject",
  verb: "verb",
  object: "object",
  complement: "complement",
  modifier: "modifier",
  subordinator: "linker",
  conjunction: "linker",
  other: "",
};
const joinMarks: LanguageJoinMark[] = [
  "comma",
  "semicolon",
  "colon",
  "dash",
  "full_stop",
  "comma_conjunction",
];

function ClauseStage({ model: m, reveal, interactive, reduced }: StageProps<"clauses">) {
  const [mark, setMark] = useState<LanguageJoinMark | undefined>(m.join?.mark);
  const ref = useRef<HTMLDivElement>(null);
  const anchors = useAnchors(ref, [mark, reveal, m]);
  useFlip(ref, [mark], reduced);
  const strip = (s: string) => s.replace(/[\s,;:.!?]+$/u, "");
  const at = (key: string) => anchors.find((a) => a.key === key);
  const arcs: ReactNode[] = [];
  if (reveal)
    indexed(m.clauses).forEach(({ item: c, n: ci }) => {
      const verb = c.parts.findIndex((p) => p.role === "verb");
      if (verb < 0) return;
      const v = at(ci + "-" + verb);
      indexed(c.parts).forEach(({ item: p, n: pi, id }) => {
        if (!["subject", "object", "complement"].includes(p.role)) return;
        const a = at(ci + "-" + pi);
        if (!v || !a || Math.abs(a.y - v.y) > 6) return;
        const x1 = centre(v).x,
          x2 = centre(a).x,
          y = v.y - 2,
          lift = Math.min(16, 8 + Math.abs(x2 - x1) * 0.1);
        arcs.push(
          <g key={`${String(ci)}:${id}`} className="lang-arc-group" data-role={p.role}>
            <path
              d={`M${x1} ${y} C${x1} ${y - lift} ${x2} ${y - lift} ${x2} ${y}`}
              className="lang-arc"
              data-role={p.role}
            />
            <circle cx={x1} cy={y} r="2.6" className="lang-arc-end" />
            <circle cx={x2} cy={y} r="2.6" className="lang-arc-end" />
          </g>,
        );
      });
    });
  return (
    <div className="lang-clauses">
      <div className="lang-page" ref={ref} data-reveal={reveal}>
        {reveal ? <Overlay>{arcs}</Overlay> : null}
        <p className="lang-quote lang-sentence">
          {indexed(m.clauses).map(({ item: c, n: ci, id: clauseId }) => {
            const last = c.parts.length - 1;
            const joinHere = m.join && mark && ci === 0;
            const capital = m.join && mark === "full_stop" && ci === 1;
            return (
              <span key={clauseId} className="lang-clause-wrap">
                {ci > 0 &&
                !(m.join && ci === 1 && mark === "dash") &&
                !/—$/u.test(m.clauses[ci - 1]!.parts.at(-1)!.text)
                  ? " "
                  : null}
                <span className="lang-clause" data-kind={c.kind} data-reveal={reveal}>
                  {indexed(c.parts).map(({ item: p, n: pi, id: partId }) => {
                    let text = joinHere && pi === last ? strip(p.text) : p.text;
                    if (capital && pi === 0)
                      text = text.charAt(0).toLocaleUpperCase() + text.slice(1);
                    return (
                      <span key={partId}>
                        {pi > 0 && !/^[,;:.!?—]/u.test(text) && !/—$/u.test(c.parts[pi - 1]!.text)
                          ? " "
                          : null}
                        <span className="lang-part" data-role={p.role}>
                          {reveal ? (
                            <span className="lang-clause-kind" data-kind={c.kind}>
                              {pi === 0 ? c.kind : ""}
                            </span>
                          ) : null}
                          <span className="lang-part-text" data-anchor={ci + "-" + pi}>
                            {text}
                          </span>
                          {reveal ? (
                            <span className="lang-part-tag">{roleLabel[p.role] || "\u00a0"}</span>
                          ) : null}
                        </span>
                      </span>
                    );
                  })}
                  {joinHere ? (
                    <span className="lang-join" data-flip="join" key={mark} data-mark={mark}>
                      {mark === "comma_conjunction"
                        ? ", " + (m.join!.conjunction ?? "and")
                        : languageMarkGlyph[mark!]}
                    </span>
                  ) : null}
                </span>
              </span>
            );
          })}
        </p>
        {m.source ? <p className="lang-source">{m.source}</p> : null}
      </div>
      {m.join && interactive ? (
        <div className="lang-segmented" role="group" aria-label="Join the first two clauses with">
          {joinMarks.map((option) => (
            <button
              type="button"
              key={option}
              aria-pressed={mark === option}
              onClick={() => setMark(option)}
            >
              {option === "comma_conjunction"
                ? ", " + (m.join!.conjunction ?? "and")
                : languageMarkName[option]}
            </button>
          ))}
        </div>
      ) : null}
      {m.join && mark && reveal ? (
        <Verdict model={m} mark={mark} />
      ) : m.join && interactive ? (
        <p className="lang-hint">
          Swap the mark and watch the sentence rebuild. Verdicts appear after you answer.
        </p>
      ) : null}
    </div>
  );
}
function Verdict({ model, mark }: { model: Model<"clauses">; mark: LanguageJoinMark }) {
  const v = languageJoinVerdict(model, mark);
  return (
    <p className="lang-verdict" data-standard={v.standard} aria-live="polite">
      <strong>{v.label}.</strong> {v.note}
    </p>
  );
}

// ---------------------------------------------------------------- voice

function VoiceStage({ model: m, reveal, interactive, reduced }: StageProps<"voice">) {
  const [voice, setVoice] = useState(m.display);
  const ref = useRef<HTMLDivElement>(null);
  useFlip(ref, [voice], reduced);
  const cap = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);
  const chip = (key: string, text: string, role: string, ghost = false) => (
    <span key={key} data-flip={key} className="lang-chip" data-role={role} data-ghost={ghost}>
      {text}
    </span>
  );
  const parts =
    voice === "active"
      ? [
          chip("agent", cap(m.agent), "subject"),
          chip("verb", m.active, "verb"),
          chip("patient", m.patient, "object"),
        ]
      : [
          chip("patient", cap(m.patient), "subject"),
          chip("verb", m.passive, "verb"),
          voice === "passive" ? chip("by", "by", "other") : chip("by", "by", "other", true),
          voice === "passive" ? chip("agent", m.agent, "agent") : chip("agent", "?", "agent", true),
        ];
  if (m.tail) parts.push(chip("tail", m.tail, "modifier"));
  return (
    <div className="lang-voice">
      <div className="lang-page" ref={ref}>
        <p className="lang-quote lang-voice-line" aria-label={languageVoiceSentence(m, voice)}>
          {parts}
          <span className="lang-chip-stop" aria-hidden="true">
            .
          </span>
        </p>
        <div className="lang-voice-legend" aria-hidden="true">
          <span data-role="actor">actor</span>
          <span data-role="verb">action</span>
          <span data-role="receiver">receiver</span>
        </div>
      </div>
      {interactive ? (
        <div className="lang-segmented" role="group" aria-label="Voice">
          {(["active", "passive", "agentless"] as const).map((v) => (
            <button type="button" key={v} aria-pressed={voice === v} onClick={() => setVoice(v)}>
              {v === "active" ? "Active" : v === "passive" ? "Passive" : "Remove the actor"}
            </button>
          ))}
        </div>
      ) : null}
      {reveal ? (
        <p className="lang-meter-line" aria-live="polite">
          <span className="lang-meter-number">
            {languageWordCount(languageVoiceSentence(m, voice))}
          </span>{" "}
          words in this version
        </p>
      ) : interactive ? (
        <p className="lang-hint">
          Switch voice and follow the actor. Count the words yourself; totals appear after you
          answer.
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- tap-to-mark words

function useTaps() {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setPicked((old) => {
      const next = new Set(old);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return { picked, toggle, clear: () => setPicked(new Set()) };
}
function Word({
  id,
  text,
  interactive,
  picked,
  onToggle,
  className = "",
}: {
  id: string;
  text: string;
  interactive: boolean;
  picked: boolean;
  onToggle: (id: string) => void;
  className?: string;
}) {
  if (!isWord(text)) return <>{text}</>;
  return interactive ? (
    <button
      type="button"
      className={"lang-word " + className}
      aria-pressed={picked}
      onClick={() => onToggle(id)}
    >
      {text}
    </button>
  ) : (
    <span className={"lang-word " + className}>{text}</span>
  );
}

// ---------------------------------------------------------------- concision

function CompressStage({ model: m, reveal, interactive, reduced }: StageProps<"compress">) {
  const { picked, toggle, clear } = useTaps();
  const [edited, setEdited] = useState(false);
  const c = languageCompression(m);
  useEffect(() => {
    if (!reveal) return setEdited(false);
    if (reduced) return setEdited(true);
    const timer = setTimeout(() => setEdited(true), 450);
    return () => clearTimeout(timer);
  }, [reveal, reduced]);
  const yours = c.beforeWords - picked.size;
  const shown = reveal ? (edited ? c.afterWords : c.beforeWords) : yours;
  return (
    <div className="lang-compress">
      <div className="lang-page" data-edited={edited}>
        <p className="lang-quote lang-compress-line">
          {indexed(m.segments).map(({ item: s, n: si, id: segId }) => (
            <span key={segId} className="lang-seg" data-edit={s.edit}>
              <span className="lang-seg-old">
                {si > 0 ? " " : null}
                {indexed(tokens(s.text)).map(({ item: t, n: ti, id: tokenId }) => (
                  <Word
                    key={tokenId}
                    id={si + "-" + ti}
                    text={t}
                    interactive={interactive && !reveal}
                    picked={picked.has(si + "-" + ti)}
                    onToggle={toggle}
                    className={picked.has(si + "-" + ti) ? "is-struck" : ""}
                  />
                ))}
              </span>
              {s.edit === "replace" ? (
                <span className="lang-seg-new">{(si > 0 ? " " : "") + s.replacement}</span>
              ) : null}
            </span>
          ))}
        </p>
      </div>
      <div className="lang-meter" aria-live="polite">
        <div className="lang-meter-bar" aria-hidden="true">
          <span style={{ width: (100 * shown) / c.beforeWords + "%" }} />
        </div>
        <p>
          <span className="lang-meter-number">{shown}</span>{" "}
          {reveal
            ? edited
              ? "words after the edit, from " + c.beforeWords
              : "words before the edit"
            : picked.size
              ? "words left after your cuts"
              : "words as drafted"}
        </p>
        {interactive && !reveal ? (
          <button
            type="button"
            className="lang-quiet-button"
            onClick={clear}
            disabled={!picked.size}
          >
            <RotateCcw aria-hidden="true" size={15} /> Restore words
          </button>
        ) : null}
      </div>
      {interactive && !reveal ? (
        <p className="lang-hint">
          Tap a word to strike it. The authored edit plays after you answer.
        </p>
      ) : null}
      {reveal ? <p className="lang-quote lang-compress-result">{c.after}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------- Toulmin

const toulminLabel: Record<string, string> = {
  claim: "Claim",
  grounds: "Grounds",
  warrant: "Warrant",
  backing: "Backing",
  qualifier: "Qualifier",
  rebuttal: "Rebuttal",
};
function ToulminStage({ model: m, reveal, reduced }: StageProps<"toulmin">) {
  const ref = useRef<HTMLDivElement>(null);
  useFlip(ref, [reveal], reduced);
  const anchors = useAnchors(ref, [reveal, m]);
  const at = (role: string) => anchors.find((a) => a.key === role);
  const links: Array<[string, string, string]> = [];
  if (reveal) {
    const roles = languageToulminRoles(m);
    const has = (r: string) => roles.includes(r as never);
    if (has("qualifier"))
      links.push(["grounds", "qualifier", "main"], ["qualifier", "claim", "main"]);
    else links.push(["grounds", "claim", "main"]);
    if (has("warrant"))
      links.push(["warrant", has("qualifier") ? "qualifier" : "grounds-claim", "support"]);
    if (has("backing")) links.push(["backing", "warrant", "support"]);
    if (has("rebuttal")) links.push(["rebuttal", "claim", "limit"]);
  }
  const point = (key: string) => {
    if (key === "grounds-claim") {
      const g = at("grounds"),
        c = at("claim");
      if (!g || !c) return undefined;
      const a = centre(g),
        b = centre(c);
      return { key, x: (a.x + b.x) / 2 - 1, y: (a.y + b.y) / 2 - 1, w: 2, h: 2 };
    }
    return at(key);
  };
  return (
    <div className="lang-toulmin" ref={ref} data-built={reveal}>
      {reveal ? (
        <Overlay>
          {links.map(([from, to, kind]) => {
            const a = point(from),
              b = point(to);
            if (!a || !b) return null;
            const p = edge(a, centre(b)),
              q = to === "grounds-claim" ? centre(b) : edge(b, centre(a), 8);
            return (
              <path
                key={from + to}
                d={`M${p.x} ${p.y} L${q.x} ${q.y}`}
                className="lang-link"
                data-kind={kind}
                markerEnd="url(#lang-arrowhead)"
              />
            );
          })}
        </Overlay>
      ) : null}
      {indexed(m.statements).map(({ item: s, n: i, id }) => (
        <div
          key={id}
          className="lang-card"
          data-role={reveal ? s.role : undefined}
          data-flip={"s" + i}
          data-anchor={s.role}
          style={{ "--i": i, gridArea: reveal ? s.role : undefined } as CSSProperties}
        >
          <span className="lang-card-number" data-scale="">
            {i + 1}
          </span>
          {reveal ? <span className="lang-card-role">{toulminLabel[s.role]}</span> : null}
          <p className="lang-quote">{s.text}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- passages

function PassageStage({ model: m, reveal, interactive }: StageProps<"passage">) {
  const { picked, toggle, clear } = useTaps();
  const ref = useRef<HTMLDivElement>(null);
  const anchors = useAnchors(ref, [reveal, m]);
  const marks = reveal
    ? [...new Set(m.lines.flatMap((l) => l.spans.flatMap((s) => (s.mark ? [s.mark] : []))))]
    : [];
  let groupIndex = 0;
  const grouped: Record<string, Anchor[]> = {};
  if (reveal && m.lens === "figure")
    for (const a of anchors) {
      const g = a.key.split("-")[1]!;
      grouped[g] = [...(grouped[g] ?? []), a];
    }
  const curves: ReactNode[] = [];
  Object.entries(grouped).forEach(([g, list]) => {
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1]!,
        b = list[i]!;
      const p = { x: a.x + a.w / 2, y: a.y + a.h },
        q = { x: b.x + b.w / 2, y: b.y + b.h };
      const sameLine = Math.abs(p.y - q.y) < 6;
      // Stacked repetitions (anaphora) bow out into the left margin instead of crossing the text.
      const stacked = !sameLine && Math.abs(a.x - b.x) < 30;
      const margin = Math.min(a.x, b.x) - 6;
      const d = sameLine
        ? `M${p.x} ${p.y + 2} C${p.x} ${p.y + 22} ${q.x} ${q.y + 22} ${q.x} ${q.y + 2}`
        : stacked
          ? `M${a.x - 2} ${a.y + a.h / 2} C${margin - 14} ${a.y + a.h / 2} ${margin - 14} ${b.y + b.h / 2} ${b.x - 2} ${b.y + b.h / 2}`
          : `M${p.x} ${p.y + 2} C${p.x} ${(p.y + q.y) / 2} ${q.x} ${(p.y + q.y) / 2 - 10} ${q.x} ${b.y - 2}`;
      curves.push(<path key={g + i} d={d} className="lang-group-arc" data-group={g} />);
    }
  });
  return (
    <div className="lang-passage" data-lens={m.lens}>
      <div className="lang-page" ref={ref} data-reveal={reveal}>
        {reveal ? <Overlay>{curves}</Overlay> : null}
        <div className="lang-quote lang-lines">
          {indexed(m.lines).map(({ item: line, n: li, id: lineId }) => (
            <p key={lineId} className="lang-line">
              {indexed(line.spans).map(({ item: span, n: si, id: spanId }) => {
                const words = indexed(tokens(span.text)).map(({ item: t, n: ti, id: tokenId }) => {
                  const id = li + "-" + si + "-" + ti;
                  return (
                    <Word
                      key={tokenId}
                      id={id}
                      text={t}
                      interactive={interactive}
                      picked={picked.has(id)}
                      onToggle={toggle}
                      className={picked.has(id) ? "is-picked" : ""}
                    />
                  );
                });
                if (!reveal || !span.mark) return <span key={spanId}>{words}</span>;
                return (
                  <mark
                    key={spanId}
                    className="lang-mark"
                    data-mark={span.mark}
                    data-group={span.group}
                    data-anchor={
                      span.group && (span.mark === "chiasmus" || span.mark === "antithesis")
                        ? "g-" + span.group + "-" + groupIndex++
                        : undefined
                    }
                    style={{ "--delay": si * 90 + li * 160 + "ms" } as CSSProperties}
                  >
                    {words}
                  </mark>
                );
              })}
            </p>
          ))}
        </div>
        <p className="lang-source">{m.source}</p>
      </div>
      <div className="lang-passage-foot">
        {reveal ? (
          <ul className="lang-legend" aria-label="Marked in the passage">
            {marks.map((mark) => (
              <li key={mark} data-mark={mark}>
                {languageMarkLabel[mark as LanguageMark]}
              </li>
            ))}
          </ul>
        ) : null}
        {interactive ? (
          <p className="lang-tally" aria-live="polite">
            {picked.size ? (
              <>
                You marked <span className="lang-meter-number">{picked.size}</span>{" "}
                {picked.size === 1 ? "word" : "words"}
                <button type="button" className="lang-quiet-button" onClick={clear}>
                  Clear
                </button>
              </>
            ) : (
              "Tap words to mark what you notice."
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- scansion

function ScansionStage({ model: m, reveal, interactive, reduced }: StageProps<"scansion">) {
  const [taps, setTaps] = useState(0);
  const [beat, setBeat] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const s = languageScansion(m);
  const step = 420;
  useEffect(() => {
    if (!playing || reduced) {
      if (reduced) setPlaying(false);
      return;
    }
    let i = 0;
    setBeat(0);
    const timer = setInterval(() => {
      i += 1;
      if (i >= m.syllables.length) {
        clearInterval(timer);
        setPlaying(false);
        setBeat(-1);
      } else setBeat(i);
    }, step);
    return () => clearInterval(timer);
  }, [playing, reduced, m.syllables.length]);
  // Group syllables into feet for the bracket underlay.
  const footOf = (i: number) => {
    if (s.foot === "mixed") return -1;
    if (s.ending === "feminine" && s.foot === "iamb" && i === m.syllables.length - 1) return -1;
    return Math.floor(i / 2);
  };
  return (
    <div className="lang-scansion">
      <div className="lang-page" data-reveal={reveal}>
        {reveal ? (
          <p className="lang-quote lang-syllables" aria-label={languageScansionLine(m)}>
            {indexed(m.syllables).map(({ item: syl, n: i, id }) => (
              <span
                key={id}
                className="lang-syllable"
                data-stress={syl.stress}
                data-foot={footOf(i) % 2 === 0 ? "even" : footOf(i) < 0 ? "extra" : "odd"}
                data-now={beat === i}
                data-word-end={syl.wordEnd}
              >
                <span className="lang-stress" aria-hidden="true">
                  {syl.stress ? "/" : "˘"}
                </span>
                <span className="lang-syl-text">{syl.text}</span>
              </span>
            ))}
          </p>
        ) : (
          <p className="lang-quote lang-scan-line">{languageScansionLine(m)}</p>
        )}
        <p className="lang-source">{m.source}</p>
        {reveal ? (
          <div className="lang-metronome" aria-hidden="true">
            {indexed(m.syllables).map(({ item: syl, n: i, id }) => (
              <span key={id} data-stress={syl.stress} data-now={beat === i} data-past={beat > i} />
            ))}
          </div>
        ) : null}
      </div>
      {interactive && !reveal ? (
        <div className="lang-tap">
          <button
            type="button"
            className="lang-tap-pad"
            onClick={() => setTaps((t) => t + 1)}
            aria-label={"Tap once per syllable. Taps so far: " + taps}
          >
            <span className="lang-meter-number">{taps}</span>
            <span>tap per syllable</span>
          </button>
          <button
            type="button"
            className="lang-quiet-button"
            onClick={() => setTaps(0)}
            disabled={!taps}
          >
            <RotateCcw aria-hidden="true" size={15} /> Start again
          </button>
          <p className="lang-hint">
            Read the line aloud and tap once for each syllable. The scansion appears after you
            answer.
          </p>
        </div>
      ) : null}
      {interactive && reveal && !reduced ? (
        <div className="lang-controls">
          <button type="button" onClick={() => setPlaying((p) => !p)}>
            {playing ? (
              <Pause aria-hidden="true" size={16} />
            ) : (
              <Play aria-hidden="true" size={16} />
            )}
            {playing ? "Pause" : "Hear the beat"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- sonnet

function SonnetStage({ model: m, reveal, interactive }: StageProps<"sonnet">) {
  const [listen, setListen] = useState<string | null>(null);
  const s = languageSonnet(m);
  const groupOf = s.groups.flatMap((size, g) => Array.from({ length: size }, () => g));
  return (
    <div className="lang-sonnet" data-reveal={reveal}>
      <ol className="lang-quote lang-sonnet-lines">
        {indexed(m.lines).map(({ item: line, n: i, id }) => {
          const words = line.text.split(" ");
          const end = words.pop()!;
          const body = words.join(" ");
          const content = (
            <>
              <span className="lang-line-number" aria-hidden="true" data-scale="">
                {i + 1}
              </span>
              <span className="lang-line-text">
                {body} <span className="lang-end-word">{end}</span>
              </span>
              <span className="lang-rhyme" aria-hidden={!reveal}>
                {reveal ? s.letters[i] : "·"}
              </span>
            </>
          );
          return (
            <li
              key={id}
              data-group={reveal ? groupOf[i]! % 2 : undefined}
              data-listen={listen === line.sound}
              data-turn={reveal && m.turn === i + 1}
              style={{ "--i": i } as CSSProperties}
            >
              {interactive ? (
                <button
                  type="button"
                  aria-pressed={listen === line.sound}
                  aria-label={
                    "Line " + (i + 1) + ": " + line.text + ". Show lines that rhyme with it."
                  }
                  onClick={() => setListen(listen === line.sound ? null : line.sound)}
                >
                  {content}
                </button>
              ) : (
                <div>{content}</div>
              )}
              {reveal && m.turn === i + 1 ? <span className="lang-volta">volta</span> : null}
            </li>
          );
        })}
      </ol>
      <p className="lang-source">{m.source}</p>
      {interactive ? (
        <p className="lang-hint">Tap a line to light every line that rhymes with it.</p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- irony

function IronyStage({ model: m, interactive }: StageProps<"irony">) {
  const [side, setSide] = useState<"said" | "known">("said");
  const knowerName = m.knower === "speaker" ? m.speaker : "the " + m.knower;
  return (
    <div className="lang-irony" data-side={side}>
      <blockquote className="lang-quote lang-irony-line">
        <p>{m.line}</p>
        <footer>
          {m.speaker}, {m.source}
        </footer>
      </blockquote>
      <div className="lang-irony-layers">
        <section data-layer="said" aria-label="What the words claim">
          <h4>What the words claim</h4>
          <p>{m.said}</p>
        </section>
        <div className="lang-irony-gap" aria-hidden="true">
          <span />
        </div>
        <section data-layer="known" aria-label={"What " + knowerName + " knows"}>
          <h4>What {knowerName} knows</h4>
          <p>{m.known}</p>
        </section>
      </div>
      {interactive ? (
        <div className="lang-segmented" role="group" aria-label="Hear the line">
          <button type="button" aria-pressed={side === "said"} onClick={() => setSide("said")}>
            As {m.speaker} means it
          </button>
          <button type="button" aria-pressed={side === "known"} onClick={() => setSide("known")}>
            As {knowerName} hears it
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- arc

function catmull(points: Array<{ x: number; y: number }>, samples = 24) {
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!,
      p1 = points[i]!,
      p2 = points[i + 1]!,
      p3 = points[Math.min(points.length - 1, i + 2)]!;
    for (let k = 0; k < samples; k++) {
      const t = k / samples,
        t2 = t * t,
        t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  out.push(points.at(-1)!);
  return out;
}
const phaseShort: Record<string, string> = {
  exposition: "Exposition",
  "rising action": "Rising action",
  climax: "Climax",
  "falling action": "Falling action",
  catastrophe: "Catastrophe",
};

function ArcStage({ model: m, reveal, interactive, reduced }: StageProps<"arc">) {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const from = useRef(0);
  const id = useId().replaceAll(":", "");
  const a = languageArc(m);
  const n = m.scenes.length;
  const points = m.scenes.map((s, i) => ({ x: 60 + (i * 480) / (n - 1), y: 250 - s.rise * 19 }));
  const curve = catmull(points);
  const path = curve
    .map((p, i) => (i ? "L" : "M") + p.x.toFixed(1) + " " + p.y.toFixed(1))
    .join(" ");
  const dot = curve[Math.round(progress * (curve.length - 1))]!;
  const current = Math.round(progress * (n - 1));
  useEffect(() => {
    if (!playing || reduced) {
      if (reduced) setPlaying(false);
      return;
    }
    let request = 0,
      begin: number | undefined;
    const run = (now: number) => {
      begin ??= now;
      const next = Math.min(1, from.current + (now - begin) / 4200);
      setProgress(next);
      if (next < 1) request = requestAnimationFrame(run);
      else setPlaying(false);
    };
    request = requestAnimationFrame(run);
    return () => cancelAnimationFrame(request);
  }, [playing, reduced]);
  const scene = m.scenes[current]!;
  return (
    <div className="lang-arc-stage" data-reveal={reveal}>
      <svg viewBox="0 0 600 320" className="lang-arc-svg" role="img" aria-labelledby={id}>
        <title id={id}>{languageGivens(m)}</title>
        <defs>
          <linearGradient id={id + "-stroke"} x1="0" x2="1">
            <stop offset="0" stopColor="#9fb7ff" />
            <stop offset=".5" stopColor="#ff7a8a" />
            <stop offset="1" stopColor="#ffc36b" />
          </linearGradient>
          <linearGradient id={id + "-fill"} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ff7a8a" stopOpacity=".28" />
            <stop offset="1" stopColor="#ff7a8a" stopOpacity="0" />
          </linearGradient>
          <filter id={id + "-glow"} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {reveal
          ? indexed(a.phases).map(({ item: phase, n: i, id }) => {
              const x0 = i === 0 ? 30 : (points[i - 1]!.x + points[i]!.x) / 2,
                x1 = i === n - 1 ? 570 : (points[i]!.x + points[i + 1]!.x) / 2;
              return (
                <rect
                  key={id}
                  className="lang-phase"
                  data-phase={phase}
                  x={x0}
                  y={30}
                  width={x1 - x0}
                  height={232}
                />
              );
            })
          : null}
        {reveal
          ? indexed(a.phases).map(({ item: phase, n: i, id }) => {
              if (i > 0 && a.phases[i - 1] === phase) return null;
              let j = i;
              while (j + 1 < n && a.phases[j + 1] === phase) j++;
              const group = a.phases
                .slice(0, i)
                .filter((p, k) => k === 0 || a.phases[k - 1] !== p).length;
              return (
                <text
                  key={`label-${id}`}
                  x={(points[i]!.x + points[j]!.x) / 2}
                  y={group % 2 ? 4 : 22}
                  textAnchor="middle"
                  className="lang-phase-label"
                  data-phase={phase}
                >
                  {phaseShort[phase]}
                </text>
              );
            })
          : null}
        <path d="M40 262H560" className="lang-arc-floor" />
        <path
          d={path + ` L${points.at(-1)!.x} 262 L${points[0]!.x} 262 Z`}
          fill={`url(#${id}-fill)`}
        />
        <path d={path} className="lang-arc-line" stroke={`url(#${id}-stroke)`} />
        {indexed(points).map(({ item: p, n: i, id }) => {
          const sc = m.scenes[i]!;
          const turned = sc.opens !== sc.closes;
          return (
            <g
              key={id}
              className="lang-scene"
              data-turn={reveal && turned}
              data-climax={reveal && a.climax === i}
              data-now={current === i && progress > 0}
            >
              <circle cx={p.x} cy={p.y} r={reveal && a.climax === i ? 13 : 10} />
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="lang-scene-number"
                data-scale=""
              >
                {i + 1}
              </text>
              <text x={p.x} y={290} textAnchor="middle" className="lang-charge">
                {sc.opens === "+" ? "+" : "−"} → {sc.closes === "+" ? "+" : "−"}
              </text>
            </g>
          );
        })}
        <circle cx={dot.x} cy={dot.y} r="7" className="lang-arc-dot" filter={`url(#${id}-glow)`} />
        <text x={300} y={314} textAnchor="middle" className="lang-arc-axis">
          {m.title}
        </text>
      </svg>
      <ol className="lang-scene-list">
        {indexed(m.scenes).map(({ item: sc, n: i, id }) => (
          <li
            key={id}
            data-now={current === i && progress > 0}
            data-turn={reveal && sc.opens !== sc.closes}
          >
            <span className="lang-scene-dot" data-scale="">
              {i + 1}
            </span>
            {sc.label}
          </li>
        ))}
      </ol>
      {interactive ? (
        <div className="lang-playback">
          <div className="lang-controls">
            {!reduced ? (
              <button
                type="button"
                onClick={() => {
                  from.current = progress >= 1 ? 0 : progress;
                  if (progress >= 1) setProgress(0);
                  setPlaying(!playing);
                }}
              >
                {playing ? (
                  <Pause aria-hidden="true" size={16} />
                ) : (
                  <Play aria-hidden="true" size={16} />
                )}
                {playing ? "Pause" : progress >= 1 ? "Replay" : "Walk the plot"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setProgress(0);
              }}
            >
              <RotateCcw aria-hidden="true" size={16} />
              Reset
            </button>
          </div>
          <label className="lang-scrubber">
            <span>
              Scene <output>{current + 1}</output>: {scene.label}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(progress * 100)}
              aria-label="Position in the plot"
              onChange={(e) => {
                setPlaying(false);
                setProgress(Number(e.currentTarget.value) / 100);
              }}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- dispatch

function Stage(props: {
  model: LanguageModel;
  reveal: boolean;
  interactive: boolean;
  reduced: boolean;
}) {
  const { model } = props;
  switch (model.kind) {
    case "clauses":
      return <ClauseStage {...props} model={model} />;
    case "voice":
      return <VoiceStage {...props} model={model} />;
    case "compress":
      return <CompressStage {...props} model={model} />;
    case "toulmin":
      return <ToulminStage {...props} model={model} />;
    case "passage":
      return <PassageStage {...props} model={model} />;
    case "scansion":
      return <ScansionStage {...props} model={model} />;
    case "sonnet":
      return <SonnetStage {...props} model={model} />;
    case "irony":
      return <IronyStage {...props} model={model} />;
    case "arc":
      return <ArcStage {...props} model={model} />;
  }
}

/** Static drawing of a model's given values for course-check problems. Nothing is revealed. */
export function LanguageGivenVisual({ model }: { model: LanguageModel }) {
  return (
    <div className="language-diagram language-check" data-kind={model.kind}>
      <Stage model={model} reveal={false} interactive={false} reduced />
    </div>
  );
}

export function LanguageDiagram({
  spec,
  showResults = false,
}: {
  spec: Spec;
  showResults?: boolean;
}) {
  const [selected, setSelected] = useState(spec.initialCaseId);
  const { reduced } = useExperience();
  const current = spec.cases.find((c) => c.id === selected) ?? spec.cases[0]!;
  return (
    <div
      className="learning-diagram language-diagram"
      data-kind={current.model.kind}
      data-reduced={reduced}
    >
      <div className="lang-cases" role="group" aria-label="Compare texts">
        {spec.cases.map((c) => (
          <button
            type="button"
            key={c.id}
            aria-pressed={selected === c.id}
            onClick={() => setSelected(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="lang-stage" key={current.id}>
        <Stage model={current.model} reveal={showResults} interactive reduced={reduced} />
      </div>
      <details className="lang-description">
        <summary>Read given values</summary>
        <p>{languageGivens(current.model)}</p>
      </details>
      {showResults ? (
        <dl className="lang-measures" aria-label="Reading revealed after your answer">
          {languageMeasures(current.model).map((m) => (
            <div key={m.label}>
              <dt>{m.label}</dt>
              <dd>{m.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
