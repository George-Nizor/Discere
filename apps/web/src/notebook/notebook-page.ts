import {
  MAX_NOTEBOOK_POINTS_PER_STROKE,
  MAX_NOTEBOOK_STROKES,
  type NotebookPageType,
  type NotebookPoint,
  type NotebookStroke,
} from "@discere/contracts";

export const NOTEBOOK_WIDTH = 1000;
export const NOTEBOOK_HEIGHT = 600;
/** How close a pointer must pass to a stroke before the eraser takes it, in page units. */
const ERASER_RADIUS = 0.0375;
/** Points closer together than this add nothing to the drawing and are dropped. */
const MINIMUM_STEP = 0.0005;

export type NotebookTool = "pen" | "eraser";

export interface NotebookDraft {
  pageType: NotebookPageType;
  strokes: NotebookStroke[];
  note: string;
}

/** A comparable value for the whole page, so unsaved work can be detected exactly. */
export function pageSnapshot(draft: NotebookDraft): string {
  return JSON.stringify(draft);
}

export function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Turns a pointer position inside the canvas box into a point on the page. */
export function pointFromClient(
  box: { left: number; top: number; width: number; height: number },
  client: { x: number; y: number },
  pressure?: number,
): NotebookPoint | null {
  if (box.width <= 0 || box.height <= 0) return null;
  const point: NotebookPoint = {
    x: clampUnit((client.x - box.left) / box.width),
    y: clampUnit((client.y - box.top) / box.height),
  };
  return pressure !== undefined && pressure > 0
    ? { ...point, pressure: clampUnit(pressure) }
    : point;
}

export function canDraw(strokes: readonly NotebookStroke[]): boolean {
  return strokes.length < MAX_NOTEBOOK_STROKES;
}

/** Removes every stroke passing under the eraser, so a whole mark goes at once. */
export function eraseAt(
  strokes: readonly NotebookStroke[],
  point: NotebookPoint,
): NotebookStroke[] {
  const radiusSquared = ERASER_RADIUS * ERASER_RADIUS;
  return strokes.filter(
    (stroke) =>
      !stroke.points.some((candidate) => {
        const x = candidate.x - point.x;
        const y = candidate.y - point.y;
        return x * x + y * y <= radiusSquared;
      }),
  );
}

/**
 * Extends the named stroke. A stroke that has reached the contract's point limit stops
 * growing rather than producing a page the server would refuse to save.
 */
export function extendStroke(
  strokes: readonly NotebookStroke[],
  strokeId: string,
  point: NotebookPoint,
): NotebookStroke[] {
  return strokes.map((stroke) => {
    if (stroke.id !== strokeId) return stroke;
    if (stroke.points.length >= MAX_NOTEBOOK_POINTS_PER_STROKE) return stroke;
    const previous = stroke.points.at(-1);
    if (
      previous &&
      Math.abs(previous.x - point.x) < MINIMUM_STEP &&
      Math.abs(previous.y - point.y) < MINIMUM_STEP
    ) {
      return stroke;
    }
    return { ...stroke, points: [...stroke.points, point] };
  });
}

/** The SVG polyline for one stroke, in the canvas coordinate system. */
export function strokePoints(stroke: NotebookStroke): string {
  return stroke.points
    .map((point) => `${point.x * NOTEBOOK_WIDTH},${point.y * NOTEBOOK_HEIGHT}`)
    .join(" ");
}

export function hasWorkings(draft: NotebookDraft): boolean {
  return draft.strokes.length > 0 || draft.note.trim().length > 0;
}
