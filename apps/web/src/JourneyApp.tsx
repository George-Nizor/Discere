import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { JourneyProgress, LearnerStage, LessonJourney, StageState } from "@discere/contracts";
import { getJourney, getJourneyProgress, saveJourneyProgress } from "./api";

const COURSE_ID = "electronics-foundations";
const LESSON_ID = "current-in-one-loop";

function stagePath(stageId: string): string {
  return `/courses/${COURSE_ID}/lessons/${LESSON_ID}/stages/${stageId}`;
}

function readStageId(): string | null {
  const match = window.location.pathname.match(/\/stages\/([^/]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function navigate(path: string): void {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function stageState(progress: JourneyProgress | undefined, stageId: string): StageState {
  return progress?.stages.find((stage) => stage.stageId === stageId)?.state ?? "locked";
}

function StagePlaceholder({ stage, onComplete }: { stage: LearnerStage; onComplete: () => void }) {
  return (
    <section className="story-stage-placeholder" aria-labelledby="story-placeholder-title">
      <p className="story-kicker">{stage.type.replace("_", " ")}</p>
      <h2 id="story-placeholder-title">{stage.title}</h2>
      <p>This stage is ready for its focused learning interaction.</p>
      <button className="story-primary" type="button" onClick={onComplete}>
        Mark stage complete
      </button>
    </section>
  );
}

export function JourneyApp() {
  const [pathStageId, setPathStageId] = useState<string | null>(readStageId());
  const journey = useQuery({ queryKey: ["journey", COURSE_ID, LESSON_ID], queryFn: () => getJourney(COURSE_ID, LESSON_ID) });
  const progress = useQuery({ queryKey: ["journey-progress", COURSE_ID, LESSON_ID], queryFn: () => getJourneyProgress(COURSE_ID, LESSON_ID) });

  useEffect(() => {
    const onPopState = () => setPathStageId(readStageId());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!journey.data) return;
    const desired = pathStageId && journey.data.stageOrder.includes(pathStageId)
      ? pathStageId
      : progress.data?.activeStageId ?? journey.data.stageOrder[0];
    if (desired && desired !== pathStageId) navigate(stagePath(desired));
  }, [journey.data, pathStageId, progress.data?.activeStageId]);

  const activeStage = useMemo<LearnerStage | undefined>(() => {
    if (!journey.data) return undefined;
    return journey.data.stages.find((stage) => stage.id === (pathStageId ?? progress.data?.activeStageId)) ?? journey.data.stages[0];
  }, [journey.data, pathStageId, progress.data?.activeStageId]);

  if (journey.isLoading || progress.isLoading) return <main className="story-loading">Preparing your lesson…</main>;
  if (journey.error || progress.error || !journey.data || !progress.data || !activeStage) {
    return <main className="story-loading"><h1>Discere could not load this lesson.</h1><p>{String(journey.error ?? progress.error ?? "Missing lesson data")}</p></main>;
  }

  const journeyData = journey.data;
  const progressData = progress.data;
  const selectedStage = activeStage;

  const currentIndex = journeyData.stageOrder.indexOf(selectedStage.id);
  const previous = journeyData.stages[currentIndex - 1];
  const next = journeyData.stages[currentIndex + 1];
  const completed = stageState(progressData, selectedStage.id) === "completed";

  async function completeStage(): Promise<void> {
    const nextProgress = await saveJourneyProgress(COURSE_ID, LESSON_ID, {
      stageId: selectedStage.id,
      state: "completed",
      interactionState: {},
    });
    await progress.refetch();
    const nextStage = next ?? journeyData.stages.find((stage) => stage.id === nextProgress.activeStageId);
    if (nextStage) navigate(stagePath(nextStage.id));
  }

  return (
    <div className="story-app">
      <aside className="story-rail" aria-label="Discere navigation">
        <a className="story-mark" href="/" aria-label="Discere home">D</a>
        <nav>
          <a className="story-rail-link active" href={stagePath(selectedStage.id)} aria-label="Current lesson">⌂</a>
          <a className="story-rail-link" href="/review" aria-label="Review">▣</a>
          <a className="story-rail-link" href="/notebook" aria-label="Notebook">□</a>
        </nav>
        <button className="story-profile" type="button" aria-label="Learner profile">L</button>
      </aside>

      <main className="story-main">
        <header className="story-header">
          <div>
            <a className="story-breadcrumb" href={`/courses/${COURSE_ID}`}>Electronics Foundations</a>
            <p className="story-stage-label">{selectedStage.type.replace("_", " ")}</p>
          </div>
          <div className="story-progress" aria-label={`Stage ${currentIndex + 1} of ${journeyData.stageOrder.length}`}>
            <span>{currentIndex + 1} / {journeyData.stageOrder.length}</span>
            <span className="story-progress-line"><i style={{ width: `${((currentIndex + 1) / journeyData.stageOrder.length) * 100}%` }} /></span>
          </div>
          <a className="story-exit" href={`/courses/${COURSE_ID}`}>Exit lesson</a>
        </header>

        <section className="story-content">
          <div className="story-content-header">
            <p className="story-kicker">{journeyData.title}</p>
            <h1>{selectedStage.title}</h1>
          </div>
          <StagePlaceholder stage={selectedStage} onComplete={() => void completeStage()} />
        </section>

        <footer className="story-navigator">
          <button type="button" disabled={!previous} onClick={() => previous && navigate(stagePath(previous.id))}>
            <span>←</span><small>Previous</small><strong>{previous?.title ?? "Lesson start"}</strong>
          </button>
          <div className="story-dots" aria-label="Lesson stages">
            {journeyData.stages.map((stage, index) => <button key={stage.id} type="button" aria-label={`Go to ${stage.title}`} className={index === currentIndex ? "active" : stageState(progressData, stage.id) === "completed" ? "completed" : ""} disabled={stageState(progressData, stage.id) === "locked"} onClick={() => navigate(stagePath(stage.id))} />)}
          </div>
          <button type="button" disabled={!next && !completed} onClick={() => next && navigate(stagePath(next.id))}>
            <small>{next ? "Next" : "Complete"}</small><strong>{next?.title ?? "Lesson complete"}</strong><span>→</span>
          </button>
        </footer>
      </main>
    </div>
  );
}
