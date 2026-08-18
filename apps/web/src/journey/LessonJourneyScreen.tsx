import type { LearnerStage } from "@discere/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircleQuestion } from "lucide-react";
import { useCallback, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
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
  const queryClient = useQueryClient();
  const { mode } = useTutoringMode();
  const journey = useJourney(courseId, lessonId);
  const progress = useJourneyProgress(courseId, lessonId);
  const course = useCourse(courseId);
  const [tutorOpen, setTutorOpen] = useState(false);

  const goToStage = useCallback(
    (nextStageId: string) => {
      void navigate(paths.stage(courseId, lessonId, nextStageId));
    },
    [courseId, lessonId, navigate],
  );

  const complete = useCallback(
    async (view: StageView) => {
      const saved = await saveJourneyProgress(courseId, lessonId, {
        stageId: view.stage.id,
        state: "completed",
        interactionState: {},
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.journeyProgress(courseId, lessonId),
      });
      goToStage(saved.activeStageId);
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
          mode === "exam" ? (
            <span className="stage-exam-note">Tutor closed in Exam mode</span>
          ) : (
            <button
              className="button button-quiet"
              onClick={() => setTutorOpen(true)}
              type="button"
            >
              <MessageCircleQuestion aria-hidden="true" size={16} strokeWidth={1.8} />
              Ask the tutor
            </button>
          )
        }
      />

      <main className="stage-canvas" id="stage">
        <StageCanvas
          courseId={courseId}
          nextLesson={upcoming ? { id: upcoming.id, title: upcoming.title } : null}
          onComplete={() => void complete(current)}
          onTryQuestion={
            quiz && quiz.index !== current.index ? () => goToStage(quiz.stage.id) : null
          }
          returnLink={
            quiz && quiz.index === current.index && current.state === "locked"
              ? {
                  label: "Back to the explanation",
                  onSelect: () => goToStage(views[0]?.stage.id ?? ""),
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
