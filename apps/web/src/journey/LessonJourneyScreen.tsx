import type { LearnerStage } from "@discere/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircleQuestion, NotebookPen } from "lucide-react";
import { useCallback, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router";
import { errorMessage } from "../api/client.js";
import { saveJourneyProgress } from "../api/endpoints.js";
import { queryKeys, useCourse, useJourney, useJourneyProgress } from "../api/queries.js";
import { paths } from "../lib/paths.js";
import { TutorPanel } from "../tutor/TutorPanel.js";
import { ErrorScreen, LoadingScreen } from "../ui/Feedback.js";
import { LessonNavigator } from "./LessonNavigator.js";
import { ModeProvider, useTutoringMode } from "./mode-context.js";
import { StageHeader } from "./StageHeader.js";
import {
  buildStageViews,
  canAdvanceFrom,
  findStageView,
  firstStageOfType,
  resolveStageId,
  type StageView,
  stageTypeLabel,
} from "./stage-machine.js";
import { CompletionStageView } from "./stages/CompletionStageView.js";
import { EssayStageView } from "./stages/EssayStageView.js";
import { ExplainerStageView } from "./stages/ExplainerStageView.js";
import { InteractiveVisualStageView } from "./stages/InteractiveVisualStageView.js";
import { QuizStageView } from "./stages/QuizStageView.js";
import { ReviewStageView } from "./stages/ReviewStageView.js";

export function LessonJourneyScreen() {
  const { courseId, lessonId, stageId } = useParams();
  if (!courseId || !lessonId) {
    return <ErrorScreen message="The lesson address is incomplete." title="Lesson not found" />;
  }
  return (
    <ModeProvider lessonId={lessonId}>
      <LessonJourney courseId={courseId} lessonId={lessonId} requestedStageId={stageId} />
    </ModeProvider>
  );
}

/** History state is whatever the browser kept. Only a string stage id is trusted. */
function readReturnTo(state: unknown): string | null {
  if (typeof state !== "object" || state === null) return null;
  const value = (state as { returnTo?: unknown }).returnTo;
  return typeof value === "string" && value.length > 0 ? value : null;
}

function LessonJourney({
  courseId,
  lessonId,
  requestedStageId,
}: {
  courseId: string;
  lessonId: string;
  requestedStageId: string | undefined;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { mode } = useTutoringMode();
  const journey = useJourney(courseId, lessonId);
  const progress = useJourneyProgress(courseId, lessonId);
  const course = useCourse(courseId);
  const [tutorOpen, setTutorOpen] = useState(false);

  // A jump made from inside a stage records where it came from, so returning is a property of
  // the navigation rather than a guess from stage state.
  const returnToStageId = readReturnTo(location.state);

  const goToStage = useCallback(
    (nextStageId: string, returnTo?: string) => {
      void navigate(
        paths.stage(courseId, lessonId, nextStageId),
        returnTo === undefined ? undefined : { state: { returnTo } },
      );
    },
    [courseId, lessonId, navigate],
  );

  const complete = useCallback(
    async (view: StageView, followingStageId: string | null) => {
      const saved = await saveJourneyProgress(courseId, lessonId, {
        stageId: view.stage.id,
        state: "completed",
        interactionState: {},
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.journeyProgress(courseId, lessonId),
      });
      // Finishing a stage moves to the one after it. Falling back to the server's active stage
      // only matters at the end of a journey the learner has already worked through.
      goToStage(followingStageId ?? saved.activeStageId);
    },
    [courseId, lessonId, queryClient, goToStage],
  );

  if (journey.isPending || progress.isPending) {
    return <LoadingScreen message="Opening the lesson…" />;
  }
  if (journey.error || !journey.data) {
    return (
      <ErrorScreen
        message={errorMessage(journey.error, "The lesson journey did not load.")}
        title="This lesson is unavailable"
      />
    );
  }

  const views = buildStageViews(journey.data, progress.data);
  const resolvedId = resolveStageId(journey.data, progress.data, requestedStageId);
  if (resolvedId !== requestedStageId) {
    return <Navigate replace to={paths.stage(courseId, lessonId, resolvedId)} />;
  }
  const current = findStageView(views, resolvedId);
  if (!current) {
    return <ErrorScreen message="That stage is not part of this lesson." title="Stage not found" />;
  }

  const quiz = firstStageOfType(views, "quiz");
  const following = views[current.index + 1] ?? null;
  const returnTo = findStageView(views, returnToStageId ?? undefined);
  const lessons = course.data?.lessons ?? [];
  const lessonIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
  const upcoming = lessons.slice(lessonIndex + 1).find((lesson) => lesson.available) ?? null;

  return (
    <div className="lesson-screen">
      <StageHeader
        coursePath={paths.course(courseId)}
        courseTitle={course.data?.course.title ?? "Course"}
        lessonTitle={journey.data.title}
        position={current.index + 1}
        stageLabel={stageTypeLabel(current.stage.type)}
        total={views.length}
        utility={
          <>
            {/* The working page stays open in every mode. Only the tutor closes in an exam. */}
            <Link
              aria-label="Notebook"
              className="button button-quiet stage-utility"
              to={paths.notebook(courseId, lessonId)}
            >
              <NotebookPen aria-hidden="true" size={16} strokeWidth={1.8} />
              <span className="stage-utility-label">Notebook</span>
            </Link>
            {mode === "exam" ? (
              <span className="stage-exam-note">Tutor closed in Exam mode</span>
            ) : (
              <button
                aria-label="Ask the tutor"
                className="button button-quiet stage-utility"
                onClick={() => setTutorOpen(true)}
                type="button"
              >
                <MessageCircleQuestion aria-hidden="true" size={16} strokeWidth={1.8} />
                <span className="stage-utility-label">Ask the tutor</span>
              </button>
            )}
          </>
        }
      />

      <main className="stage-canvas" id="stage">
        <StageCanvas
          // Each stage owns its own working state. Keying by stage id means moving between two
          // stages of the same type starts the second one clean, rather than showing the first
          // stage's answer, hints, and result.
          key={current.stage.id}
          courseId={courseId}
          nextLesson={upcoming ? { id: upcoming.id, title: upcoming.title } : null}
          onComplete={() => void complete(current, following?.stage.id ?? null)}
          onTryQuestion={
            quiz && quiz.index !== current.index
              ? () => goToStage(quiz.stage.id, current.stage.id)
              : null
          }
          returnLink={
            returnTo && returnTo.index !== current.index
              ? {
                  label: `Back to ${returnTo.stage.title}`,
                  onSelect: () => goToStage(returnTo.stage.id),
                }
              : null
          }
          stage={current.stage}
        />
      </main>

      <LessonNavigator
        canAdvance={canAdvanceFrom(current)}
        current={current}
        onNavigate={goToStage}
        views={views}
      />

      {tutorOpen ? (
        <TutorPanel
          conceptIds={current.stage.conceptIds}
          lessonId={lessonId}
          mode={mode}
          onClose={() => setTutorOpen(false)}
        />
      ) : null}
    </div>
  );
}

function StageCanvas({
  stage,
  courseId,
  nextLesson,
  onComplete,
  onTryQuestion,
  returnLink,
}: {
  stage: LearnerStage;
  courseId: string;
  nextLesson: { id: string; title: string } | null;
  onComplete: () => void;
  onTryQuestion: (() => void) | null;
  returnLink: { label: string; onSelect: () => void } | null;
}) {
  switch (stage.type) {
    case "explainer":
      return (
        <ExplainerStageView onContinue={onComplete} onTryQuestion={onTryQuestion} stage={stage} />
      );
    case "interactive_visual":
      return <InteractiveVisualStageView onContinue={onComplete} stage={stage} />;
    case "quiz":
      return <QuizStageView onContinue={onComplete} returnLink={returnLink} stage={stage} />;
    case "essay":
      return <EssayStageView onContinue={onComplete} stage={stage} />;
    case "review":
      return <ReviewStageView onContinue={onComplete} stage={stage} />;
    case "completion":
      return <CompletionStageView courseId={courseId} nextLesson={nextLesson} stage={stage} />;
    default:
      return null;
  }
}
