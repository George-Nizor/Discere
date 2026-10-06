import type { CalculatorPolicy, LearnerStage } from "@discere/contracts";
import { useAmbientAccent } from "../fx/ambient-accent.js";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router";
import { errorMessage } from "../api/client.js";
import { saveJourneyProgress } from "../api/endpoints.js";
import { queryKeys, useCourse, useJourney, useJourneyProgress } from "../api/queries.js";
import { paths } from "../lib/paths.js";
import { useExperience } from "../study/experience.js";
import { LessonSoundToggle } from "../study/LessonSoundToggle.js";
import { Workbench, type WorkbenchTab, workbenchTabs } from "../workbench/Workbench.js";
import { ErrorScreen, LoadingScreen } from "../ui/Feedback.js";
import { ReadAloudButton } from "../ui/ReadAloud.js";
import { LessonNavigator } from "./LessonNavigator.js";
import { ModeProvider, useTutoringMode } from "./mode-context.js";
import { PlayerFooterProvider, PlayerFooterSurface } from "./player-footer.js";
import { StageHeader } from "./StageHeader.js";
import {
  buildStageViews,
  canAdvanceFrom,
  findStageView,
  LESSON_OPENER_ID,
  resolveStageId,
  resumeScreenIndex,
  screenIdsFor,
  type StageView,
  stageTypeLabel,
} from "./stage-machine.js";
import { CompletionStageView } from "./stages/CompletionStageView.js";
import { EssayStageView } from "./stages/EssayStageView.js";
import { InteractiveVisualStageView } from "./stages/InteractiveVisualStageView.js";
import { QuizStageView } from "./stages/QuizStageView.js";
import { RecapStageView } from "./stages/RecapStageView.js";
import { ReviewStageView } from "./stages/ReviewStageView.js";
import { StoryStageView, stepReadAloudText } from "./stages/StoryStageView.js";

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
  const { prepare } = useExperience();
  const journey = useJourney(courseId, lessonId);
  const progress = useJourneyProgress(courseId, lessonId);
  const course = useCourse(courseId);
  useAmbientAccent(course.data?.course.accent);
  const [bench, setBench] = useState<WorkbenchTab | null>(null);
  const [benchVisited, setBenchVisited] = useState<ReadonlySet<WorkbenchTab>>(() => new Set());
  const openBench = (tab: WorkbenchTab | null) => {
    setBench(tab);
    if (tab) setBenchVisited((seen) => (seen.has(tab) ? seen : new Set([...seen, tab])));
  };
  const [activeStep, setActiveStep] = useState<{ stageId: string; stepId: string } | null>(null);
  const completing = useRef(false);
  const [saveFailure, setSaveFailure] = useState<string | null>(null);

  // A jump made from inside a stage records where it came from, so returning is a property of
  // the navigation rather than a guess from stage state.
  const returnToStageId = readReturnTo(location.state);

  const goToStage = useCallback(
    (nextStageId: string, returnTo?: string) => {
      void navigate(paths.stage(courseId, lessonId, nextStageId), {
        viewTransition: true,
        ...(returnTo === undefined ? {} : { state: { returnTo } }),
      });
    },
    [courseId, lessonId, navigate],
  );

  const saveStepPosition = useCallback(
    (stageId: string, stepId: string, stepIndex: number) => {
      setActiveStep({ stageId, stepId });
      // Deliberately not awaited and not invalidating: the learner is mid-lesson and a refetch
      // here would rebuild the stage under them. The position is read again on the next load.
      void saveJourneyProgress(courseId, lessonId, {
        stageId,
        state: "active",
        // The id is what resumes the learner; the index stays for older builds reading the row.
        interactionState: { stepId, stepIndex },
      }).catch((error: unknown) =>
        setSaveFailure(errorMessage(error, "Your place could not be saved. Try continuing again.")),
      );
    },
    [courseId, lessonId],
  );

  const complete = useCallback(
    async (view: StageView, followingStageId: string | null) => {
      if (completing.current) return;
      completing.current = true;
      prepare();
      setSaveFailure(null);
      try {
        const saved = await saveJourneyProgress(courseId, lessonId, {
          stageId: view.stage.id,
          state: "completed",
          interactionState: {},
        });
        const ending = journey.data?.stages.find((stage) => stage.id === followingStageId);
        const fresh =
          ending?.type === "completion" &&
          !progress.data?.stages.some(
            (entry) => entry.stageId === ending.id && entry.state === "completed",
          );
        if (ending?.type === "completion")
          await saveJourneyProgress(courseId, lessonId, {
            stageId: ending.id,
            state: "completed",
            interactionState: {},
          });
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: queryKeys.journeyProgress(courseId, lessonId),
          }),
          queryClient.invalidateQueries({ queryKey: queryKeys.home }),
          queryClient.invalidateQueries({ queryKey: queryKeys.study }),
          queryClient.invalidateQueries({ queryKey: queryKeys.course(courseId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.courses }),
          queryClient.invalidateQueries({ queryKey: queryKeys.lessonResult(courseId, lessonId) }),
        ]);
        // Finishing a stage moves to the one after it. Falling back to the server's active stage
        // only matters at the end of a journey the learner has already worked through.
        if (fresh && followingStageId)
          void navigate(paths.stage(courseId, lessonId, followingStageId), {
            state: { earnedLesson: lessonId },
            viewTransition: true,
          });
        else goToStage(followingStageId ?? saved.activeStageId);
      } catch (error) {
        setSaveFailure(
          errorMessage(error, "Your progress could not be saved. Try continuing again."),
        );
      } finally {
        completing.current = false;
      }
    },
    [courseId, lessonId, queryClient, goToStage, journey.data, progress.data, navigate, prepare],
  );

  if (journey.isPending || (progress.isPending && !progress.error)) {
    return <LoadingScreen message="Opening the lesson…" />;
  }
  // Only a lesson that never loaded is a dead end. A failed background refetch keeps the lesson
  // the learner is in and offers to try again (audit M4).
  if (!journey.data) {
    return (
      <ErrorScreen
        error={journey.error}
        message={errorMessage(journey.error, "The lesson did not load.")}
        title="This lesson could not be opened"
        onRetry={() => journey.refetch()}
        back={{ to: paths.course(courseId), label: "Back to the course" }}
      />
    );
  }
  const refreshFailed = Boolean(journey.error || progress.error);

  const views = buildStageViews(journey.data, progress.data);
  const resolvedId = resolveStageId(journey.data, progress.data, requestedStageId);
  if (resolvedId !== requestedStageId) {
    return <Navigate replace to={paths.stage(courseId, lessonId, resolvedId)} />;
  }
  const current = findStageView(views, resolvedId);
  if (!current) {
    return <ErrorScreen message="That stage is not part of this lesson." title="Stage not found" />;
  }

  const following = views[current.index + 1] ?? null;
  const savedState = progress.data?.stages.find(
    (stage) => stage.stageId === current.stage.id,
  )?.interactionState;
  // Where the learner is inside the explainer, by screen: the opener (if any), then each step.
  const screens = current.stage.type === "explainer" ? screenIdsFor(current.stage) : [];
  const screenIndex =
    current.stage.type !== "explainer"
      ? 0
      : activeStep?.stageId === current.stage.id
        ? Math.max(0, screens.indexOf(activeStep.stepId))
        : resumeScreenIndex(screens, current.stage.steps, savedState);
  const activeStepView =
    current.stage.type === "explainer"
      ? current.stage.steps.find((step) => step.id === screens[screenIndex])
      : undefined;
  const tutorQuestionId =
    current.stage.type === "quiz"
      ? current.stage.questionId
      : current.stage.type === "explainer"
        ? (activeStepView?.question?.id ??
          (screens[screenIndex] === LESSON_OPENER_ID
            ? current.stage.intro?.hook.question?.id
            : undefined))
        : undefined;
  const calculatorPolicy: CalculatorPolicy | undefined =
    current.stage.type === "quiz"
      ? current.stage.calculator
      : current.stage.type === "explainer"
        ? (activeStepView?.calculator ?? current.stage.calculator)
        : undefined;
  const readAloudText =
    current.stage.type === "quiz"
      ? [
          current.stage.question.prompt,
          ...(current.stage.question.choices ?? []).map(
            (choice, index) => `Option ${String.fromCharCode(65 + index)}: ${choice.label}.`,
          ),
        ].join(" ")
      : current.stage.type === "explainer"
        ? activeStepView
          ? stepReadAloudText(activeStepView)
          : current.stage.intro
            ? [
                current.stage.title,
                ...current.stage.intro.hook.blocks.map((block) =>
                  block.kind === "equation"
                    ? ""
                    : block.kind === "definition"
                      ? block.text
                      : block.text,
                ),
                current.stage.intro.hook.question?.prompt ?? "",
                current.stage.intro.promise,
              ].join(" ")
            : current.stage.title
        : current.stage.type === "recap"
          ? current.stage.keyIdea
          : current.stage.title;
  const returnTo = findStageView(views, returnToStageId ?? undefined);
  const lessons = course.data?.lessons ?? [];
  const lessonIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
  const upcoming = lessons.slice(lessonIndex + 1).find((lesson) => lesson.available) ?? null;
  const weight = (stage: LearnerStage) =>
    stage.type === "explainer"
      ? screenIdsFor(stage).length
      : stage.type === "review"
        ? stage.itemCount
        : stage.type === "completion"
          ? 0
          : 1;
  const totalBeats = views.reduce((sum, view) => sum + weight(view.stage), 0);
  const finishedBeats = views.reduce(
    (sum, view) =>
      sum +
      (view.state === "completed" || view.state === "skipped_optional"
        ? weight(view.stage)
        : view.stage.id === current.stage.id && view.stage.type === "explainer"
          ? screenIndex
          : 0),
    0,
  );

  const questionLed = journey.data.stages.some(
    (stage) => stage.type === "explainer" && stage.steps.some((step) => step.questionLed),
  );

  const focusedQuestion =
    questionLed &&
    (current.stage.type === "explainer" ||
      current.stage.type === "quiz" ||
      current.stage.type === "recap");
  return (
    <PlayerFooterProvider enabled={focusedQuestion}>
      <div
        className={
          "lesson-screen" +
          (bench ? " has-workbench" : "") +
          (questionLed ? " learning-player" : "") +
          (focusedQuestion ? " learning-player--question" : "")
        }
      >
        <StageHeader
          coursePath={paths.course(courseId)}
          courseTitle={course.data?.course.title ?? "Course"}
          lessonTitle={journey.data.title}
          position={current.index + 1}
          completed={
            views.filter((view) => view.state === "completed" || view.state === "skipped_optional")
              .length
          }
          earnedPercent={totalBeats ? (finishedBeats / totalBeats) * 100 : 0}
          stageLabel={stageTypeLabel(current.stage.type)}
          total={views.length}
          utility={
            <div className="lesson-tools" role="toolbar" aria-label="Lesson tools">
              <ReadAloudButton className="lesson-tool" label="Read aloud" text={readAloudText} />
              <LessonSoundToggle />
              <span className="lesson-tools-divider" aria-hidden="true" />
              {workbenchTabs
                .filter((tool) => tool.id !== "tutor" || mode !== "exam")
                // Where the arithmetic is the skill, the calculator is not offered (spec §6.3).
                .filter((tool) => tool.id !== "calculator" || calculatorPolicy !== "off")
                .map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    className="lesson-tool"
                    aria-pressed={bench === tool.id}
                    title={
                      tool.id === "calculator" && calculatorPolicy === "suggested"
                        ? "Calculator (suggested for this step)"
                        : tool.label
                    }
                    data-suggested={
                      tool.id === "calculator" && calculatorPolicy === "suggested"
                        ? "true"
                        : undefined
                    }
                    onClick={() => openBench(bench === tool.id ? null : tool.id)}
                  >
                    <tool.icon aria-hidden="true" size={22} />
                    <span className="lesson-tool-label">{tool.label}</span>
                  </button>
                ))}
              {mode === "exam" ? (
                <span className="stage-exam-note">Tutor closed in Exam mode</span>
              ) : null}
            </div>
          }
        />

        <main className="stage-canvas" id="stage">
          {saveFailure ? (
            <p role="alert" className="journey-save-error">
              {saveFailure}
            </p>
          ) : null}
          {refreshFailed ? (
            <p role="alert" className="journey-save-error journey-refresh-error">
              Your progress could not be refreshed. The lesson is still here.{" "}
              <button
                className="button button-quiet"
                type="button"
                onClick={() => {
                  void journey.refetch();
                  void progress.refetch();
                }}
              >
                Try again
              </button>
            </p>
          ) : null}
          <StageCanvas
            // Each stage owns its own working state. Keying by stage id means moving between two
            // stages of the same type starts the second one clean, rather than showing the first
            // stage's answer, hints, and result.
            key={current.stage.id}
            courseId={courseId}
            lessonId={lessonId}
            questionLed={questionLed}
            nextLesson={upcoming ? { id: upcoming.id, title: upcoming.title } : null}
            onComplete={() => void complete(current, following?.stage.id ?? null)}
            onStepChange={(stepId, stepIndex) =>
              saveStepPosition(current.stage.id, stepId, stepIndex)
            }
            savedInteractionState={
              progress.data?.stages.find((entry) => entry.stageId === current.stage.id)
                ?.interactionState
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
        {focusedQuestion ? <PlayerFooterSurface /> : null}

        <LessonNavigator
          canAdvance={canAdvanceFrom(current)}
          current={current}
          onNavigate={goToStage}
          views={views}
        />

        {bench ? (
          <Workbench
            tab={bench}
            onTab={(tab) => openBench(tab)}
            onClose={() => openBench(null)}
            accent={course.data?.course.accent ?? "#16a34a"}
            conceptIds={current.stage.conceptIds}
            lessonId={lessonId}
            {...(tutorQuestionId ? { questionId: tutorQuestionId } : {})}
            mode={mode}
            visited={benchVisited}
            {...(calculatorPolicy ? { calculator: calculatorPolicy } : {})}
            questionPrompt={
              current.stage.type === "quiz"
                ? current.stage.question.prompt
                : (activeStepView?.question?.prompt ?? activeStepView?.headline)
            }
          />
        ) : null}
      </div>
    </PlayerFooterProvider>
  );
}

function StageCanvas({
  stage,
  courseId,
  lessonId,
  questionLed,
  nextLesson,
  onComplete,
  onStepChange,
  savedInteractionState,
  returnLink,
}: {
  stage: LearnerStage;
  courseId: string;
  lessonId: string;
  questionLed: boolean;
  nextLesson: { id: string; title: string } | null;
  onComplete: () => void;
  onStepChange: (stepId: string, stepIndex: number) => void;
  savedInteractionState: Record<string, unknown> | undefined;
  returnLink: { label: string; onSelect: () => void } | null;
}) {
  switch (stage.type) {
    case "explainer":
      return (
        <StoryStageView
          courseId={courseId}
          lessonId={lessonId}
          onComplete={onComplete}
          onStepChange={onStepChange}
          savedInteractionState={savedInteractionState}
          stage={stage}
        />
      );
    case "interactive_visual":
      return <InteractiveVisualStageView onContinue={onComplete} stage={stage} />;
    case "quiz":
      return (
        <QuizStageView
          {...(questionLed ? { courseId, lessonId } : {})}
          onContinue={onComplete}
          returnLink={returnLink}
          stage={stage}
        />
      );
    case "essay":
      return <EssayStageView onContinue={onComplete} stage={stage} />;
    case "review":
      return <ReviewStageView onContinue={onComplete} stage={stage} />;
    case "recap":
      return <RecapStageView nextLesson={nextLesson} onContinue={onComplete} stage={stage} />;
    case "completion":
      return (
        <CompletionStageView
          courseId={courseId}
          lessonId={lessonId}
          nextLesson={nextLesson}
          stage={stage}
        />
      );
    default:
      return null;
  }
}
