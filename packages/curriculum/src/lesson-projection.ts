import type { LessonStep, Question, RichTextBlock } from "@discere/contracts";

/**
 * What a learner sees of a step before and after answering.
 *
 * A legacy step carries one paragraph written to be read after the question (it often restates
 * the question's own numbers). Withholding all of it, as the player once did, meant nobody who
 * answered correctly ever read the lesson (audit B1). Showing all of it would print the answer
 * above the question. So the paragraph is split by sentence: a sentence that states the key, or
 * a number the worked answer derives that the prompt does not give, is held back for the
 * reveal; everything else is teaching and is shown first.
 *
 * A v2 step needs none of this: its author wrote `lead` (before) and `reveal` (after).
 */
export interface StepProjection {
  lead: RichTextBlock[];
  reveal: RichTextBlock[];
  eyebrow?: string;
}

const NUMBER = /[−-]?\d[\d,]*(?:\.\d+)?/gu;

function numberTokens(text: string): Set<string> {
  const tokens = new Set<string>();
  for (const match of text.matchAll(NUMBER)) {
    const value = Number(match[0].replaceAll(",", "").replace("−", "-"));
    if (Number.isFinite(value)) tokens.add(String(Math.abs(value)));
  }
  return tokens;
}

function normalise(text: string): string {
  return text
    .toLocaleLowerCase()
    .replace(/[’‘]/gu, "'")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * The strings that would give a question's answer away if printed before the response.
 * Numbers are compared by value, so "1,000" and "1000" are the same leak.
 */
export function answerLeakTokens(question: Question): { numbers: Set<string>; phrases: string[] } {
  const promptNumbers = numberTokens(question.prompt);
  const numbers = new Set<string>();
  const phrases: string[] = [];
  const authority = question.answerAuthority;
  if (authority.kind === "numeric") {
    numbers.add(String(Math.abs(authority.value)));
    // A rounded key ("0.33") still leaks when the prose prints it to fewer places.
    if (!Number.isInteger(authority.value)) {
      for (const places of [1, 2, 3])
        numbers.add(String(Math.abs(Number(authority.value.toFixed(places)))));
    }
  } else {
    for (const idea of [...authority.acceptedIdeas, ...(authority.acceptedAlternatives ?? [])]) {
      const phrase = normalise(idea);
      // A one-word idea such as "same" is too common to treat as a leak in every sentence.
      if (phrase.split(" ").length >= 2 || phrase.length >= 8) phrases.push(phrase);
    }
    for (const token of numberTokens(authority.exampleAnswer))
      if (!promptNumbers.has(token)) numbers.add(token);
  }
  for (const token of promptNumbers) numbers.delete(token);
  return { numbers, phrases };
}

function leaks(text: string, tokens: ReturnType<typeof answerLeakTokens>): boolean {
  for (const token of numberTokens(text)) if (tokens.numbers.has(token)) return true;
  const plain = ` ${normalise(text)} `;
  return tokens.phrases.some((phrase) => plain.includes(` ${phrase} `));
}

/** Splits prose into sentences without breaking decimals ("2.5") or initials mid-number. */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"'$(])/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function blockText(block: RichTextBlock): string {
  if (block.kind === "equation") return block.latex;
  if (block.kind === "definition") return `${block.term} ${block.text}`;
  return block.text;
}

/** Splits a legacy step's prose into what is safe to show first and what waits for the answer. */
export function splitLegacyStep(step: LessonStep, question: Question | undefined): StepProjection {
  const heading = step.blocks.find((block) => block.kind === "heading")?.text;
  const body = step.blocks.filter((block) => block.kind !== "heading");
  if (!question) return { lead: body, reveal: [], ...(heading ? { eyebrow: heading } : {}) };
  const tokens = answerLeakTokens(question);
  const lead: RichTextBlock[] = [];
  const reveal: RichTextBlock[] = [];
  for (const block of body) {
    if (block.kind !== "paragraph") {
      (leaks(blockText(block), tokens) ? reveal : lead).push(block);
      continue;
    }
    const safe: string[] = [];
    const held: string[] = [];
    for (const sentence of sentences(block.text))
      (leaks(sentence, tokens) ? held : safe).push(sentence);
    if (safe.length) lead.push({ kind: "paragraph", text: safe.join(" ") });
    if (held.length) reveal.push({ kind: "paragraph", text: held.join(" ") });
  }
  return { lead, reveal, ...(heading ? { eyebrow: heading } : {}) };
}

/** A v2 step's own projection. */
export function projectV2Step(step: LessonStep): StepProjection {
  return {
    lead: step.lead ?? [],
    reveal: step.reveal ?? [],
    ...(step.eyebrow ? { eyebrow: step.eyebrow } : {}),
  };
}

export function isV2Step(step: LessonStep): boolean {
  return step.lead !== undefined || step.reveal !== undefined || step.headline !== undefined;
}

export function projectStep(step: LessonStep, question: Question | undefined): StepProjection {
  return isV2Step(step) ? projectV2Step(step) : splitLegacyStep(step, question);
}

/**
 * The choice a learner should see marked as right once the answer is revealed. Choices carry
 * no marking themselves; the text authority names the accepted label.
 */
export function correctChoiceId(question: Question): string | undefined {
  if (!question.choices?.length || question.answerAuthority.kind !== "text") return undefined;
  const accepted = new Set(question.answerAuthority.acceptedIdeas.map((idea) => idea.trim()));
  return question.choices.find((choice) => accepted.has(choice.label.trim()))?.id;
}
