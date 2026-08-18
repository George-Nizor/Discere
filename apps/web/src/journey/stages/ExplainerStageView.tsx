import type { ExplainerStage } from "@discere/contracts";
import { ArrowRight, Sparkle, Volume2 } from "lucide-react";
import { useState } from "react";
import { InlineRichText, splitParagraphs } from "../../ui/RichText.js";
import { resolveStageVisual } from "../visual-source.js";

function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function ExplainerStageView({
  stage,
  onContinue,
  onTryQuestion,
}: {
  stage: ExplainerStage;
  onContinue: () => void;
  onTryQuestion: (() => void) | null;
}) {
  const [speaking, setSpeaking] = useState(false);
  const paragraphs = splitParagraphs(stage.body);
  const [deck, ...rest] = paragraphs;
  const visual = resolveStageVisual(stage.visual);

  function toggleReadAloud(): void {
    if (!canSpeak()) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(`${stage.title}. ${paragraphs.join(" ")}`);
    utterance.rate = 0.95;
    utterance.addEventListener("end", () => setSpeaking(false));
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return (
    <div className={visual ? "explainer explainer-split" : "explainer"}>
      <div className="explainer-copy">
        <h1>{stage.title}</h1>
        {deck ? (
          <p className="deck">
            <InlineRichText text={deck} />
          </p>
        ) : null}
        <div className="prose">
          {rest.map((paragraph) => (
            <p key={paragraph}>
              <InlineRichText text={paragraph} />
            </p>
          ))}
        </div>

        <aside aria-label="Key takeaway" className="takeaway">
          <Sparkle aria-hidden="true" size={18} strokeWidth={1.6} />
          <div>
            <strong>Key takeaway</strong>
            <p>
              <InlineRichText text={stage.takeaway} />
            </p>
          </div>
        </aside>

        <div className="button-row explainer-actions">
          <button className="button button-primary" onClick={onContinue} type="button">
            Continue
          </button>
          {onTryQuestion ? (
            <button className="button button-quiet" onClick={onTryQuestion} type="button">
              Try a question first
              <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
            </button>
          ) : null}
          {canSpeak() ? (
            <button className="button button-quiet" onClick={toggleReadAloud} type="button">
              <Volume2 aria-hidden="true" size={16} strokeWidth={1.8} />
              {speaking ? "Stop reading" : "Read aloud"}
            </button>
          ) : null}
        </div>
      </div>

      {visual ? (
        <figure className="explainer-visual">
          {visual.kind === "image" ? (
            <img alt={visual.alt} src={visual.src} />
          ) : (
            <div className="visual-described">
              <p className="eyebrow">Described in words</p>
              <p>{visual.alt}</p>
              <p className="muted">{visual.reason}</p>
            </div>
          )}
          <figcaption>{stage.visual.alt}</figcaption>
        </figure>
      ) : null}
    </div>
  );
}
