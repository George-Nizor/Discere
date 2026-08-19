import {
  MAX_NOTEBOOK_NOTE_LENGTH,
  MAX_NOTEBOOK_STROKES,
  type NotebookPage,
  type NotebookPageType,
  type NotebookSaveRequest,
  type NotebookStroke,
} from "@discere/contracts";
import { Download, Eraser, PenLine, Save, Trash2, Undo2 } from "lucide-react";
import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { errorMessage } from "../api/client.js";
import { formatSavedAt } from "../lib/format.js";
import { Notice } from "../ui/Feedback.js";
import {
  canDraw,
  eraseAt,
  extendStroke,
  hasWorkings,
  NOTEBOOK_HEIGHT,
  NOTEBOOK_WIDTH,
  type NotebookDraft,
  type NotebookTool,
  pageSnapshot,
  pointFromClient,
  strokePoints,
} from "./notebook-page.js";
import { exportCanvasPng } from "./png-export.js";

const PAGE_TYPES: Array<{ id: NotebookPageType; label: string }> = [
  { id: "blank", label: "Blank" },
  { id: "lined", label: "Lined" },
  { id: "graph", label: "Graph" },
];
const LINED_Y = Array.from({ length: 14 }, (_, position) => (position + 1) * 40);
const GRAPH_X = Array.from({ length: 49 }, (_, position) => (position + 1) * 20);
const GRAPH_Y = Array.from({ length: 29 }, (_, position) => (position + 1) * 20);

function createStrokeId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `stroke-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export interface NotebookCanvasHandle {
  exportPng: () => Promise<Blob>;
}

/**
 * The working page. Strokes are normalised coordinates so the drawing survives a change of
 * window size, and the same SVG is what the PNG export rasterises, so the tutor sees exactly
 * the page the learner sees.
 */
export function NotebookCanvas({
  page,
  saving,
  onSave,
  onDraftChange,
  onSvgReady,
}: {
  page: NotebookPage;
  saving: boolean;
  onSave: (input: NotebookSaveRequest) => Promise<NotebookPage>;
  onDraftChange?: (draft: NotebookDraft) => void;
  onSvgReady?: (element: SVGSVGElement | null) => void;
}) {
  const [pageType, setPageType] = useState<NotebookPageType>(page.pageType);
  const [strokes, setStrokes] = useState<NotebookStroke[]>(page.strokes);
  const [note, setNote] = useState(page.note);
  const [tool, setTool] = useState<NotebookTool>("pen");
  const [history, setHistory] = useState<NotebookStroke[][]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    pageSnapshot({ pageType: page.pageType, strokes: page.strokes, note: page.note }),
  );
  const [savedAt, setSavedAt] = useState<string | null>(page.updatedAt);
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const activePointer = useRef<number | undefined>(undefined);
  const activeStroke = useRef<string | undefined>(undefined);
  const erasing = useRef(false);

  const draft: NotebookDraft = { pageType, strokes, note };
  const dirty = pageSnapshot(draft) !== savedSnapshot;

  useEffect(() => {
    onSvgReady?.(svgRef.current);
  }, [onSvgReady]);

  useEffect(() => {
    onDraftChange?.({ pageType, strokes, note });
  }, [onDraftChange, pageType, strokes, note]);

  // Leaving with unsaved strokes would lose work the server has never seen.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function remember(): void {
    setHistory((entries) => [...entries.slice(-49), strokes]);
    setMessage(null);
    setFailure(null);
  }

  function pointOf(event: ReactPointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    return pointFromClient(box, { x: event.clientX, y: event.clientY }, event.pressure);
  }

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>): void {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    const point = pointOf(event);
    if (!point) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    activePointer.current = event.pointerId;
    remember();

    if (tool === "eraser") {
      erasing.current = true;
      setStrokes((current) => eraseAt(current, point));
      return;
    }
    if (!canDraw(strokes)) {
      activePointer.current = undefined;
      setHistory((entries) => entries.slice(0, -1));
      setFailure(
        `This page holds ${MAX_NOTEBOOK_STROKES} strokes. Erase some working before drawing more.`,
      );
      return;
    }
    const id = createStrokeId();
    activeStroke.current = id;
    setStrokes((current) => [...current, { id, width: 3, points: [point] }]);
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>): void {
    if (activePointer.current !== event.pointerId) return;
    const point = pointOf(event);
    if (!point) return;
    if (erasing.current) {
      setStrokes((current) => eraseAt(current, point));
      return;
    }
    const strokeId = activeStroke.current;
    if (!strokeId) return;
    setStrokes((current) => extendStroke(current, strokeId, point));
  }

  function endPointer(event: ReactPointerEvent<SVGSVGElement>): void {
    if (activePointer.current !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    activePointer.current = undefined;
    activeStroke.current = undefined;
    erasing.current = false;
  }

  function undo(): void {
    const previous = history.at(-1);
    if (!previous) return;
    setStrokes(previous);
    setHistory((entries) => entries.slice(0, -1));
    setMessage(null);
  }

  function clearPage(): void {
    if (strokes.length === 0) return;
    remember();
    setStrokes([]);
  }

  async function save(): Promise<void> {
    setFailure(null);
    try {
      const saved = await onSave({ pageType, strokes, note });
      setSavedSnapshot(
        pageSnapshot({ pageType: saved.pageType, strokes: saved.strokes, note: saved.note }),
      );
      setSavedAt(saved.updatedAt);
      setMessage("Workings saved on this machine.");
    } catch (error) {
      setFailure(errorMessage(error, "The notebook page could not be saved."));
    }
  }

  async function download(): Promise<void> {
    setFailure(null);
    try {
      const blob = await exportCanvasPng(svgRef.current);
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = `discere-${page.lessonId}-workings.png`;
        link.click();
        setMessage("The page was exported as a PNG.");
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      setFailure(errorMessage(error, "The page could not be exported."));
    }
  }

  return (
    <section aria-labelledby="notebook-title" className="notebook">
      <div className="notebook-heading">
        <h2 id="notebook-title">Show your working</h2>
        <p aria-live="polite" className="notebook-state muted">
          {dirty ? "Unsaved changes" : formatSavedAt(savedAt)}
        </p>
      </div>

      <div className="notebook-toolbar">
        <fieldset className="notebook-group">
          <legend>Page</legend>
          {PAGE_TYPES.map((type) => (
            <button
              aria-pressed={pageType === type.id}
              className={pageType === type.id ? "chip chip-active" : "chip"}
              key={type.id}
              onClick={() => setPageType(type.id)}
              type="button"
            >
              {type.label}
            </button>
          ))}
        </fieldset>
        <fieldset className="notebook-group">
          <legend>Tool</legend>
          <button
            aria-pressed={tool === "pen"}
            className={tool === "pen" ? "chip chip-active" : "chip"}
            onClick={() => setTool("pen")}
            type="button"
          >
            <PenLine aria-hidden="true" size={15} strokeWidth={1.8} />
            Pen
          </button>
          <button
            aria-pressed={tool === "eraser"}
            className={tool === "eraser" ? "chip chip-active" : "chip"}
            onClick={() => setTool("eraser")}
            type="button"
          >
            <Eraser aria-hidden="true" size={15} strokeWidth={1.8} />
            Eraser
          </button>
        </fieldset>
        <div className="notebook-group notebook-history">
          {history.length > 0 ? (
            <button className="chip" onClick={undo} type="button">
              <Undo2 aria-hidden="true" size={15} strokeWidth={1.8} />
              Undo
            </button>
          ) : (
            <p className="muted notebook-hint">Undo appears once you have drawn something.</p>
          )}
          {strokes.length > 0 ? (
            <button className="chip" onClick={clearPage} type="button">
              <Trash2 aria-hidden="true" size={15} strokeWidth={1.8} />
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="notebook-split">
        <div className="notebook-pane notebook-pane-pad">
          <p className="notebook-pane-label" id="notebook-pad-label">
            Sketch
          </p>
        <svg
          aria-label="Working canvas"
          className={`notebook-canvas notebook-${tool}`}
          height={NOTEBOOK_HEIGHT}
          onPointerCancel={endPointer}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          ref={svgRef}
          role="application"
          viewBox={`0 0 ${NOTEBOOK_WIDTH} ${NOTEBOOK_HEIGHT}`}
          width={NOTEBOOK_WIDTH}
        >
          <title>The lesson working page</title>
          <rect fill="#ffffff" height={NOTEBOOK_HEIGHT} width={NOTEBOOK_WIDTH} />
          {pageType === "lined"
            ? LINED_Y.map((y) => (
                <line
                  key={`rule-${y}`}
                  stroke="#d9d9d4"
                  strokeWidth="1"
                  x1="0"
                  x2={NOTEBOOK_WIDTH}
                  y1={y}
                  y2={y}
                />
              ))
            : null}
          {pageType === "graph" ? (
            <g>
              {GRAPH_X.map((x) => (
                <line
                  key={`column-${x}`}
                  stroke={x % 100 === 0 ? "#c2c2bc" : "#e6e6e1"}
                  strokeWidth={x % 100 === 0 ? "1.3" : "0.7"}
                  x1={x}
                  x2={x}
                  y1="0"
                  y2={NOTEBOOK_HEIGHT}
                />
              ))}
              {GRAPH_Y.map((y) => (
                <line
                  key={`row-${y}`}
                  stroke={y % 100 === 0 ? "#c2c2bc" : "#e6e6e1"}
                  strokeWidth={y % 100 === 0 ? "1.3" : "0.7"}
                  x1="0"
                  x2={NOTEBOOK_WIDTH}
                  y1={y}
                  y2={y}
                />
              ))}
            </g>
          ) : null}
          {strokes.map((stroke) => (
            <polyline
              data-stroke-id={stroke.id}
              fill="none"
              key={stroke.id}
              points={strokePoints(stroke)}
              stroke="#15171a"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={stroke.width}
            />
          ))}
        </svg>
        </div>

        <div className="notebook-pane notebook-pane-typed">
          <label className="notebook-typed" htmlFor="notebook-typed-field">
            Typed working
          </label>
          <textarea
            className="notebook-typed-field"
            id="notebook-typed-field"
            maxLength={MAX_NOTEBOOK_NOTE_LENGTH}
            onChange={(event) => {
              setNote(event.currentTarget.value);
              setMessage(null);
            }}
            placeholder={"Set the problem out in steps.\n\nI = V / R\nI = 5 / 100"}
            value={note}
          />
          <p className="notebook-typed-count muted">
            {note.length} / {MAX_NOTEBOOK_NOTE_LENGTH}
          </p>
        </div>
      </div>


      <div className="button-row notebook-actions">
        {dirty && !saving ? (
          <button className="button button-primary" onClick={() => void save()} type="button">
            <Save aria-hidden="true" size={16} strokeWidth={1.8} />
            Save workings
          </button>
        ) : null}
        {saving ? <p className="muted">Saving…</p> : null}
        {hasWorkings(draft) ? (
          <button className="button button-quiet" onClick={() => void download()} type="button">
            <Download aria-hidden="true" size={16} strokeWidth={1.8} />
            Export PNG
          </button>
        ) : (
          <p className="muted">Draw or write something to export the page.</p>
        )}
      </div>

      {message ? (
        <p aria-live="polite" className="muted notebook-message">
          {message}
        </p>
      ) : null}
      {failure ? (
        <Notice live tone="error" title="The notebook could not do that">
          <p>{failure}</p>
        </Notice>
      ) : null}
    </section>
  );
}
