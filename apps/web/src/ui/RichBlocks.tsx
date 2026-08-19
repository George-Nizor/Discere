import type { RichTextBlock } from "@discere/contracts";
import katex from "katex";
import { Info, Sparkle } from "lucide-react";
import { useEffect, useRef } from "react";
import { InlineRichText } from "./RichText.js";

function DisplayMath({ latex }: { latex: string }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    katex.render(latex, element, { throwOnError: false, displayMode: true });
  }, [latex]);
  return <div className="block-equation" ref={host} />;
}

/**
 * Renders one authored block. Splitting prose into kinds is what lets a definition fold away
 * and an equation be typeset, instead of every line arriving as another paragraph the learner
 * has to weigh equally.
 */
export function RichBlock({ block }: { block: RichTextBlock }) {
  switch (block.kind) {
    case "heading":
      return <h3 className="block-heading">{block.text}</h3>;
    case "definition":
      return (
        // A definition is available rather than in the way: a learner who knows the term reads on.
        <details className="block-definition">
          <summary>{block.term}</summary>
          <p>
            <InlineRichText text={block.text} />
          </p>
        </details>
      );
    case "callout":
      return (
        <aside className={`block-callout is-${block.tone}`}>
          {block.tone === "key" ? (
            <Sparkle aria-hidden="true" size={18} strokeWidth={1.6} />
          ) : (
            <Info aria-hidden="true" size={18} strokeWidth={1.6} />
          )}
          <p>
            <InlineRichText text={block.text} />
          </p>
        </aside>
      );
    case "equation":
      return <DisplayMath latex={block.latex} />;
    default:
      return (
        <p>
          <InlineRichText text={block.text} />
        </p>
      );
  }
}

export function RichBlocks({ blocks }: { blocks: readonly RichTextBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => (
        // Blocks are authored in a fixed order and never reordered at runtime.
        // biome-ignore lint/suspicious/noArrayIndexKey: position is the block's identity here
        <RichBlock block={block} key={index} />
      ))}
    </>
  );
}

/** The plain text of a run of blocks, for read-aloud and for word counts. */
export function blocksToText(blocks: readonly RichTextBlock[]): string {
  return blocks
    .map((block) => {
      if (block.kind === "definition") return `${block.term}. ${block.text}`;
      if (block.kind === "equation") return "";
      return block.text;
    })
    .filter(Boolean)
    .join(" ");
}
