import type { NotebookSaveRequest } from "@discere/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useCallback, useState } from "react";
import { Link, useParams } from "react-router";
import { errorMessage } from "../api/client.js";
import { getNotebookPage, saveNotebookPage } from "../api/endpoints.js";
import { queryKeys, useCourse, useJourney } from "../api/queries.js";
import { ModeProvider, useTutoringMode } from "../journey/mode-context.js";
import { paths } from "../lib/paths.js";
import { ErrorScreen, LoadingScreen } from "../ui/Feedback.js";
import { NotebookCanvas } from "./NotebookCanvas.js";
import { type NotebookDraft, hasWorkings, pageSnapshot } from "./notebook-page.js";
import { WorkingsReviewPanel } from "./WorkingsReviewPanel.js";

export function NotebookScreen() {
  const { courseId, lessonId } = useParams();
  if (!courseId || !lessonId) {
    return <ErrorScreen message="The notebook address is incomplete." title="Notebook not found" />;
  }
  return (
    <ModeProvider lessonId={lessonId}>
      <Notebook courseId={courseId} lessonId={lessonId} />
    </ModeProvider>
  );
}

/**
 * One working page per lesson, alongside the review that reads it. The page is saved through
 * the same endpoints the server has always exposed; nothing about the drawing leaves this
 * machine unless the learner asks for a review.
 */
function Notebook({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const queryClient = useQueryClient();
  const { mode } = useTutoringMode();
  const journey = useJourney(courseId, lessonId);
  const course = useCourse(courseId);
  const [draft, setDraft] = useState<NotebookDraft | null>(null);
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);

  const page = useQuery({
    queryKey: queryKeys.notebook(lessonId),
    queryFn: () => getNotebookPage(lessonId),
  });
  const save = useMutation({
    mutationFn: (input: NotebookSaveRequest) => saveNotebookPage(lessonId, input),
    onSuccess: (saved) => queryClient.setQueryData(queryKeys.notebook(lessonId), saved),
  });

  const onDraftChange = useCallback((next: NotebookDraft) => setDraft(next), []);
  const onSvgReady = useCallback((element: SVGSVGElement | null) => setSvg(element), []);

  if (page.isPending) return <LoadingScreen message="Opening the working page…" />;
  if (page.error || !page.data) {
    return (
      <ErrorScreen
        message={errorMessage(page.error, "The working page did not load.")}
        title="Notebook unavailable"
      />
    );
  }

  const stored = page.data;
  const current: NotebookDraft = draft ?? {
    pageType: stored.pageType,
    strokes: stored.strokes,
    note: stored.note,
  };
  const savedOnServer =
    pageSnapshot(current) ===
    pageSnapshot({ pageType: stored.pageType, strokes: stored.strokes, note: stored.note });

  return (
    <main className="page notebook-page" id="stage">
      <p className="eyebrow">{course.data?.course.title ?? "Course"}</p>
      <h1>{journey.data?.title ?? "Working notebook"}</h1>
      <p className="deck page-deck">
        Work the problem here by hand. The page is kept with the lesson, and you can ask the
        tutor to read it.
      </p>

      <NotebookCanvas
        onDraftChange={onDraftChange}
        onSave={(input) => save.mutateAsync(input)}
        onSvgReady={onSvgReady}
        page={stored}
        saving={save.isPending}
      />

      <WorkingsReviewPanel
        draft={current}
        lessonId={lessonId}
        mode={mode}
        saved={savedOnServer && hasWorkings(current)}
        svg={svg}
      />

      <div className="button-row">
        <Link className="button button-quiet" to={paths.lesson(courseId, lessonId)}>
          <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.8} />
          Back to the lesson
        </Link>
      </div>
    </main>
  );
}
