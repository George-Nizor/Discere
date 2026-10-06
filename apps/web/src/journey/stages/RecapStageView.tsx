import type { RecapStage } from "@discere/contracts";
import { ArrowRight } from "lucide-react";
import { RichBlocks } from "../../ui/RichBlocks.js";
import { InlineRichText } from "../../ui/RichText.js";
import { PlayerFooterSlot } from "../player-footer.js";

/**
 * The close of a v2 lesson (spec §3.6): the one idea the lesson promised, stated plainly as the
 * headline, what the learner did, the cards now waiting in review, and the bridge to the next
 * lesson. It celebrates nothing; the completion stage after it does that.
 */
export function RecapStageView({
  stage,
  nextLesson,
  onContinue,
}: {
  stage: RecapStage;
  nextLesson: { id: string; title: string } | null;
  onContinue: () => void;
}) {
  return (
    <section className="lesson-close" aria-labelledby="lesson-close-idea">
      <p className="step-eyebrow">The idea</p>
      <h1 className="close-idea" id="lesson-close-idea">
        <InlineRichText text={stage.keyIdea} />
      </h1>
      {stage.blocks.length ? (
        <div className="step-lead close-work">
          <RichBlocks blocks={stage.blocks} />
        </div>
      ) : null}
      {stage.cardFronts.length ? (
        <div className="close-cards">
          <p className="close-label">
            {stage.cardFronts.length === 1
              ? "One card added to your review"
              : `${stage.cardFronts.length} cards added to your review`}
          </p>
          <ul>
            {stage.cardFronts.map((front) => (
              <li key={front}>
                <InlineRichText text={front} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {nextLesson ? (
        <p className="close-next">
          <span className="close-label">Next: {nextLesson.title}.</span>{" "}
          {stage.nextHook ? <InlineRichText text={stage.nextHook} /> : null}
        </p>
      ) : null}
      <PlayerFooterSlot kind="actions">
        <div className="button-row story-actions">
          <button className="button button-primary" type="button" onClick={onContinue}>
            Continue
            <ArrowRight aria-hidden="true" size={16} />
          </button>
        </div>
      </PlayerFooterSlot>
    </section>
  );
}
