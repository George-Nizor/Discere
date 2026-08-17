import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TutoringMode } from "@discere/contracts";
import { useEffect, useState } from "react";
import {
  confirmReveal,
  createImagePrompt,
  getCurrentLesson,
  getHome,
  requestHint,
  startReveal,
  submitAttempt,
} from "./api";
import { AnswerPanel } from "./components/AnswerPanel";
import { CircuitLab } from "./components/CircuitLab";
import { KnowledgeMap } from "./components/KnowledgeMap";
import { ModeSelector } from "./components/ModeSelector";
import { NotebookWorkspace } from "./components/NotebookWorkspace";
import { ProgressStrip } from "./components/ProgressStrip";
import { SourcePanel } from "./components/SourcePanel";
import { TransferChallenge } from "./components/TransferChallenge";
import { TutorCompanion } from "./components/TutorCompanion";

export function LegacyExperience() {
  const queryClient = useQueryClient();
  const home = useQuery({ queryKey: ["home"], queryFn: getHome });
  const lesson = useQuery({ queryKey: ["lesson"], queryFn: getCurrentLesson });
  const [mode, setMode] = useState<TutoringMode>("coach");
  const [voltage, setVoltage] = useState(5);
  const [resistance, setResistance] = useState(100);
  const [response, setResponse] = useState("");
  const [attemptId, setAttemptId] = useState<string>();
  const [hint, setHint] = useState<string>();
  const [revealedAnswer, setRevealedAnswer] = useState<string>();
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    if (lesson.data) {
      setVoltage(lesson.data.activity.voltage.value);
      setResistance(lesson.data.activity.resistance.value);
    }
  }, [lesson.data]);

  const attempt = useMutation({
    mutationFn: async () => {
      if (!lesson.data) throw new Error("Lesson is still loading.");
      return submitAttempt({
        questionId: lesson.data.question.id,
        response,
        mode,
        ...(attemptId === undefined ? {} : { attemptId }),
      });
    },
    onSuccess: (result) => {
      setAttemptId(result.attemptId);
      setNotice(undefined);
      void queryClient.invalidateQueries({ queryKey: ["home"] });
    },
    onError: (error) =>
      setNotice(error instanceof Error ? error.message : "Could not check the answer."),
  });

  const hintMutation = useMutation({
    mutationFn: async () => {
      if (!attemptId) throw new Error("Submit an attempt before asking for a hint.");
      return requestHint(attemptId);
    },
    onSuccess: (result) => setHint(result.hint),
    onError: (error) =>
      setNotice(error instanceof Error ? error.message : "Could not load a hint."),
  });

  function changeMode(nextMode: TutoringMode): void {
    if (nextMode === mode) return;
    attempt.reset();
    hintMutation.reset();
    setMode(nextMode);
    setResponse("");
    setAttemptId(undefined);
    setHint(undefined);
    setRevealedAnswer(undefined);
    setNotice(undefined);
  }

  function speakLesson(): void {
    if (!lesson.data || !("speechSynthesis" in window)) {
      setNotice("Speech synthesis is unavailable in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `${lesson.data.lesson.title}. ${lesson.data.lesson.orientation} ${lesson.data.lesson.explanation}`,
    );
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  async function copyImageBrief(): Promise<void> {
    if (!lesson.data) return;
    try {
      const packet = await createImagePrompt(lesson.data.lesson.visualBrief.id);
      await navigator.clipboard.writeText(packet.prompt);
      setNotice("Reviewed image-generation brief copied.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not copy the image brief.");
    }
  }

  if (home.isLoading || lesson.isLoading) {
    return (
      <main className="loading-screen">
        <span className="loading-mark">D</span>
        <p>Preparing the workshop…</p>
      </main>
    );
  }
  if (home.error || lesson.error || !home.data || !lesson.data) {
    return (
      <main className="loading-screen">
        <h1>Discere could not start</h1>
        <p>
          {home.error?.message ??
            lesson.error?.message ??
            "The local server did not return the lesson."}
        </p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <ProgressStrip home={home.data} />
      <div className="workspace">
        <KnowledgeMap progress={home.data.progress} />
        <main className="lesson-workspace">
          <section className="lesson-intro">
            <div>
              <p className="eyebrow">
                {lesson.data.lesson.assuranceLevel.replaceAll("_", " ")}
              </p>
              <h1>{lesson.data.lesson.title}</h1>
              <p className="orientation">{lesson.data.lesson.orientation}</p>
            </div>
            <div className="utility-actions">
              <button type="button" onClick={speakLesson}>
                Read aloud
              </button>
              <button type="button" onClick={() => void copyImageBrief()}>
                Image brief
              </button>
            </div>
          </section>

          <CircuitLab
            activity={lesson.data.activity}
            voltage={voltage}
            resistance={resistance}
            onVoltage={setVoltage}
            onResistance={setResistance}
          />

          <section className="explanation">
            <p>{lesson.data.lesson.explanation}</p>
            <div
              className="equation"
              role="img"
              aria-label="Ohm's law: current equals voltage divided by resistance"
            >
              <span>I</span>
              <span>=</span>
              <span>V</span>
              <span>/</span>
              <span>R</span>
            </div>
          </section>

          <ModeSelector value={mode} onChange={changeMode} />
          <TutorCompanion
            key={`${lesson.data.lesson.id}:${mode}`}
            mode={mode}
            sources={lesson.data.sources}
          />
          <AnswerPanel
            key={`${lesson.data.lesson.id}:${mode}:answer`}
            prompt={lesson.data.question.prompt}
            mode={mode}
            response={response}
            onResponse={setResponse}
            onSubmit={() => attempt.mutate()}
            submitting={attempt.isPending}
            {...(attempt.data === undefined ? {} : { result: attempt.data })}
            {...(hint === undefined ? {} : { hint })}
            onHint={() => hintMutation.mutate()}
            hinting={hintMutation.isPending}
            onStartReveal={async (reason) => {
              if (!attemptId) throw new Error("Submit an attempt first.");
              return startReveal(attemptId, reason);
            }}
            onConfirmReveal={async (token, confirmation) => {
              if (!attemptId) throw new Error("Submit an attempt first.");
              const result = await confirmReveal(attemptId, token, confirmation);
              setRevealedAnswer(result.answer);
            }}
            {...(revealedAnswer === undefined ? {} : { revealedAnswer })}
          />
          {revealedAnswer && attemptId ? <TransferChallenge attemptId={attemptId} /> : null}
          <NotebookWorkspace
            lessonId={lesson.data.lesson.id}
            mode={mode}
            sources={lesson.data.sources}
          />
          {mode === "exam" ? null : <SourcePanel sources={lesson.data.sources} />}
          {notice ? (
            <button className="toast" type="button" onClick={() => setNotice(undefined)}>
              {notice}
              <span>Dismiss</span>
            </button>
          ) : null}
        </main>
      </div>
    </div>
  );
}

import { JourneyApp } from "./JourneyApp";
import { CourseHome } from "./CourseHome";
import { ReviewHome } from "./ReviewHome";

export default function App() {
  if (window.location.pathname === "/legacy" || window.location.pathname.startsWith("/legacy/")) {
    return <LegacyExperience />;
  }
  if (window.location.pathname === "/" || window.location.pathname === "/courses" || /^\/courses\/[^/]+$/.test(window.location.pathname)) {
    return <CourseHome />;
  }
  if (window.location.pathname === "/review") return <ReviewHome />;
  return <JourneyApp />;
}
