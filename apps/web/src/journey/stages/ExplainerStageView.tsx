import type { ExplainerStage } from "@discere/contracts";
import { ArrowRight, Sparkle } from "lucide-react";
import { ReadAloudButton } from "../../ui/ReadAloud.js";
import { InlineRichText, splitParagraphs } from "../../ui/RichText.js";
import { resolveStageVisual } from "../visual-source.js";

export function ExplainerStageView({
  stage,
  onContinue,
  onTryQuestion,
}: {
  stage: ExplainerStage;
  onContinue: () => void;
  onTryQuestion: (() => void) | null;
}) {
  const paragraphs = splitParagraphs(stage.body);
  const [deck, ...rest] = paragraphs;
  const visual = resolveStageVisual(stage.visual);

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
          <ReadAloudButton text={`${stage.title}. ${paragraphs.join(" ")}`} />
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
          <figcaption>
            {visual.kind === "image" && visual.image ? visual.image.caption : stage.visual.alt}
            {visual.kind === "image" && visual.image ? (
              <span className="visual-credit">
                {visual.image.attribution},{" "}
                {visual.image.licenceUrl ? (
                  <a href={visual.image.licenceUrl} rel="noreferrer" target="_blank">
                    {visual.image.licence}
                  </a>
                ) : (
                  visual.image.licence
                )}
                {" · "}
                <a href={visual.image.landingPageUrl} rel="noreferrer" target="_blank">
                  Source
                </a>
              </span>
            ) : null}
          </figcaption>
        </figure>
      ) : null}
    </div>
  );
}
