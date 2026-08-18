import type Database from "better-sqlite3";
import { NotebookPageSchema, NotebookStrokeSchema, type NotebookPage, type NotebookSaveRequest } from "@discere/contracts";
import { z } from "zod";

const LOCAL_USER_ID = "local-user";
const StrokeArraySchema = z.array(NotebookStrokeSchema).max(300);

interface NotebookRow {
  lessonId: string;
  pageType: NotebookPage["pageType"];
  strokesJson: string;
  note: string;
  updatedAt: string;
}

export function getNotebookPage(database: Database.Database, lessonId: string): NotebookPage {
  const row = database
    .prepare("SELECT lesson_id AS lessonId, page_type AS pageType, strokes_json AS strokesJson, note, updated_at AS updatedAt FROM notebook_pages WHERE user_id = ? AND lesson_id = ?")
    .get(LOCAL_USER_ID, lessonId) as NotebookRow | undefined;

  if (!row) {
    return NotebookPageSchema.parse({ lessonId, pageType: "blank", strokes: [], note: "", updatedAt: null });
  }

  let rawStrokes: unknown;
  try {
    rawStrokes = JSON.parse(row.strokesJson) as unknown;
  } catch {
    throw new Error(`Stored notebook data for lesson '${lessonId}' is invalid JSON.`);
  }

  return NotebookPageSchema.parse({
    lessonId: row.lessonId,
    pageType: row.pageType,
    strokes: StrokeArraySchema.parse(rawStrokes),
    note: row.note,
    updatedAt: row.updatedAt,
  });
}

export function saveNotebookPage(database: Database.Database, lessonId: string, input: NotebookSaveRequest): NotebookPage {
  const updatedAt = new Date().toISOString();
  database
    .prepare(`
      INSERT INTO notebook_pages (user_id, lesson_id, page_type, strokes_json, note, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, lesson_id) DO UPDATE SET
        page_type = excluded.page_type,
        strokes_json = excluded.strokes_json,
        note = excluded.note,
        updated_at = excluded.updated_at
    `)
    .run(LOCAL_USER_ID, lessonId, input.pageType, JSON.stringify(input.strokes), input.note, updatedAt);

  return NotebookPageSchema.parse({ lessonId, ...input, updatedAt });
}
