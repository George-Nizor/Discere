import type { NotebookPage, NotebookPageType, NotebookPoint, NotebookSaveRequest, NotebookStroke } from "@discere/contracts";
import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react";
import "./Notebook.css";

type NotebookTool = "pen" | "eraser";

export interface NotebookProps {
  page: NotebookPage;
  saving: boolean;
  onSave: (input: NotebookSaveRequest) => Promise<NotebookPage>;
}

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 600;
const MAX_STROKES = 300;
const MAX_POINTS_PER_STROKE = 750;

function snapshot(pageType: NotebookPageType, strokes: NotebookStroke[], note: string): string {
  return JSON.stringify({ pageType, strokes, note });
}

function createStrokeId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `stroke-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function Notebook({ page, saving, onSave }: NotebookProps) {
  const [pageType, setPageType] = useState<NotebookPageType>(page.pageType);
  const [strokes, setStrokes] = useState<NotebookStroke[]>(page.strokes);
  const [note, setNote] = useState(page.note);
  const [tool, setTool] = useState<NotebookTool>("pen");
  const [undoStack, setUndoStack] = useState<NotebookStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<NotebookStroke[][]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshot(page.pageType, page.strokes, page.note));
  const [savedAt, setSavedAt] = useState<string | null>(page.updatedAt);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  const activePointerRef = useRef<number>();
  const activeStrokeRef = useRef<string>();
  const erasingRef = useRef(false);

  useEffect(() => {
    setPageType(page.pageType);
    setStrokes(page.strokes);
    setNote(page.note);
    setUndoStack([]);
    setRedoStack([]);
    setSavedSnapshot(snapshot(page.pageType, page.strokes, page.note));
    setSavedAt(page.updatedAt);
    setMessage("");
    setError("");
  }, [page.lessonId, page.updatedAt]);

  const dirty = snapshot(pageType, strokes, note) !== savedSnapshot;

  function pointFromEvent(event: ReactPointerEvent<SVGSVGElement>): NotebookPoint | null {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const point = {
      x: clamp((event.clientX - rect.left) / rect.width),
      y: clamp((event.clientY - rect.top) / rect.height),
    };
    return event.pressure > 0 ? { ...point, pressure: clamp(event.pressure) } : point;
  }

  function beginStrokeHistory(): void {
    setUndoStack((history) => [...history, strokes]);
    setRedoStack([]);
    setMessage("");
    setError("");
  }

  function eraseAt(point: NotebookPoint): void {
    const radiusSquared = 0.0014;
    setStrokes((current) => current.filter((stroke) => !stroke.points.some((candidate) => {
      const x = candidate.x - point.x;
      const y = candidate.y - point.y;
      return x * x + y * y <= radiusSquared;
    })));
  }

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>): void {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    const point = pointFromEvent(event);
    if (!point) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    activePointerRef.current = event.pointerId;
    beginStrokeHistory();

    if (tool === "eraser") {
      erasingRef.current = true;
      eraseAt(point);
      return;
    }

    if (strokes.length >= MAX_STROKES) {
      activePointerRef.current = undefined;
      setUndoStack((history) => history.slice(0, -1));
      setError("This page has reached its stroke limit. Clear or erase some workings before drawing more.");
      return;
    }

    const id = createStrokeId();
    activeStrokeRef.current = id;
    setStrokes((current) => [...current, { id, width: 3, points: [point] }]);
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>): void {
    if (activePointerRef.current !== event.pointerId) return;
    const point = pointFromEvent(event);
    if (!point) return;

    if (erasingRef.current) {
      eraseAt(point);
      return;
    }

    const strokeId = activeStrokeRef.current;
    if (!strokeId) return;
    setStrokes((current) => current.map((stroke) => {
      if (stroke.id !== strokeId || stroke.points.length >= MAX_POINTS_PER_STROKE) return stroke;
      const previous = stroke.points.at(-1);
      if (previous && Math.abs(previous.x - point.x) < 0.0005 && Math.abs(previous.y - point.y) < 0.0005) return stroke;
      return { ...stroke, points: [...stroke.points, point] };
    }));
  }

  function endPointer(event: ReactPointerEvent<SVGSVGElement>): void {
    if (activePointerRef.current !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    activePointerRef.current = undefined;
    activeStrokeRef.current = undefined;
    erasingRef.current = false;
  }

  function undo(): void {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setRedoStack((history) => [...history, strokes]);
    setStrokes(previous);
    setUndoStack((history) => history.slice(0, -1));
    setMessage("");
  }

  function redo(): void {
    const next = redoStack.at(-1);
    if (!next) return;
    setUndoStack((history) => [...history, strokes]);
    setStrokes(next);
    setRedoStack((history) => history.slice(0, -1));
    setMessage("");
  }

  function clearPage(): void {
    if (strokes.length === 0) return;
    setUndoStack((history) => [...history, strokes]);
    setRedoStack([]);
    setStrokes([]);
    setMessage("");
    setError("");
  }

  async function save(): Promise<void> {
    try {
      setError("");
      const saved = await onSave({ pageType, strokes, note });
      setSavedSnapshot(snapshot(saved.pageType, saved.strokes, saved.note));
      setSavedAt(saved.updatedAt);
      setMessage("Workings saved locally.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the notebook page.");
    }
  }

  async function downloadPng(): Promise<void> {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      setError("");
      let markup = new XMLSerializer().serializeToString(svg);
      if (!markup.includes("xmlns=")) markup = markup.replace("<svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"");
      const svgBlob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
      const sourceUrl = URL.createObjectURL(svgBlob);
      try {
        const image = new Image();
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("The notebook image could not be rendered."));
          image.src = sourceUrl;
        });
        const canvas = document.createElement("canvas");
        canvas.width = VIEWBOX_WIDTH * 2;
        canvas.height = VIEWBOX_HEIGHT * 2;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("PNG export is unavailable in this browser.");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const png = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG export failed.")), "image/png");
        });
        const downloadUrl = URL.createObjectURL(png);
        try {
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.download = `discere-${page.lessonId}-workings.png`;
          link.click();
          setMessage("PNG workings exported.");
        } finally {
          URL.revokeObjectURL(downloadUrl);
        }
      } finally {
        URL.revokeObjectURL(sourceUrl);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not export the notebook page.");
    }
  }

  return <section className="notebook" aria-labelledby="notebook-title">
    <div className="notebook-heading">
      <div>
        <p className="eyebrow">Working notebook</p>
        <h2 id="notebook-title">Draw the calculation</h2>
        <p>Use the page for equations, circuit sketches, or notes. Saved strokes remain on this machine.</p>
      </div>
      <div className="notebook-save-state" aria-live="polite">
        <strong>{dirty ? "Unsaved changes" : "Saved"}</strong>
        <span>{savedAt ? `Last saved ${new Date(savedAt).toLocaleString()}` : "No saved page yet"}</span>
      </div>
    </div>

    <div className="notebook-toolbar">
      <fieldset><legend>Page</legend>{(["blank", "lined", "graph"] as NotebookPageType[]).map((type) => <button key={type} type="button" className={pageType === type ? "active" : ""} aria-pressed={pageType === type} onClick={() => setPageType(type)}>{type[0]?.toLocaleUpperCase()}{type.slice(1)}</button>)}</fieldset>
      <fieldset><legend>Tool</legend><button type="button" className={tool === "pen" ? "active" : ""} aria-pressed={tool === "pen"} onClick={() => setTool("pen")}>Pen</button><button type="button" className={tool === "eraser" ? "active" : ""} aria-pressed={tool === "eraser"} onClick={() => setTool("eraser")}>Eraser</button></fieldset>
      <div className="notebook-history"><button type="button" disabled={undoStack.length === 0} onClick={undo}>Undo</button><button type="button" disabled={redoStack.length === 0} onClick={redo}>Redo</button><button type="button" disabled={strokes.length === 0} onClick={clearPage}>Clear</button></div>
    </div>

    <svg ref={svgRef} className={`notebook-canvas tool-${tool}`} role="application" aria-label="Working canvas" viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endPointer} onPointerCancel={endPointer}>
      <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#ffffff" />
      {pageType === "lined" ? Array.from({ length: 14 }, (_, index) => <line key={index} x1="0" y1={(index + 1) * 40} x2={VIEWBOX_WIDTH} y2={(index + 1) * 40} stroke="#d4d4d4" strokeWidth="1" />) : null}
      {pageType === "graph" ? <g aria-hidden="true">
        {Array.from({ length: 49 }, (_, index) => <line key={`v-${index}`} x1={(index + 1) * 20} y1="0" x2={(index + 1) * 20} y2={VIEWBOX_HEIGHT} stroke={(index + 1) % 5 === 0 ? "#b8b8b8" : "#e2e2e2"} strokeWidth={(index + 1) % 5 === 0 ? "1.4" : "0.7"} />)}
        {Array.from({ length: 29 }, (_, index) => <line key={`h-${index}`} x1="0" y1={(index + 1) * 20} x2={VIEWBOX_WIDTH} y2={(index + 1) * 20} stroke={(index + 1) % 5 === 0 ? "#b8b8b8" : "#e2e2e2"} strokeWidth={(index + 1) % 5 === 0 ? "1.4" : "0.7"} />)}
      </g> : null}
      {strokes.map((stroke) => <polyline key={stroke.id} data-stroke-id={stroke.id} points={stroke.points.map((point) => `${point.x * VIEWBOX_WIDTH},${point.y * VIEWBOX_HEIGHT}`).join(" ")} fill="none" stroke="#111111" strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />)}
    </svg>

    <label className="notebook-note"><span>Typed note about these workings</span><textarea rows={3} maxLength={4_000} value={note} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => { setNote(event.currentTarget.value); setMessage(""); }} placeholder="Describe a step that may be hard to read from the drawing." /></label>
    <div className="notebook-actions"><button type="button" className="primary-button" disabled={!dirty || saving} onClick={() => void save()}>{saving ? "Saving…" : "Save workings"}</button><button type="button" onClick={() => void downloadPng()}>Download PNG</button></div>
    {message ? <p className="notebook-message" role="status">{message}</p> : null}
    {error ? <p className="form-error" role="alert">{error}</p> : null}
  </section>;
}
