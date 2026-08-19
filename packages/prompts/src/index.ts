import { readFileSync } from "node:fs";
import path from "node:path";
import { resolvePromptsDirectory } from "@discere/paths";

/**
 * Prompts are application assets (spec v0.2 section 24), not multi-line strings scattered
 * through source files. This loader reads them from `prompts/` at the repository root so a
 * prompt edit reaches the runtime without a code change.
 */
export const PROMPT_NAMES = [
  "assessor",
  "image-generation",
  "lesson-writer",
  "style-editor",
  "tutor-system",
  "visual-director",
  "visual-reviewer",
] as const;

export type PromptName = (typeof PROMPT_NAMES)[number];

export interface PromptSection {
  /** Heading text without the leading hashes. */
  heading: string;
  /** Heading depth: 2 for `##`, 3 for `###`. */
  level: number;
  body: string;
}

export interface Prompt {
  name: PromptName;
  /** Absolute path of the source file. */
  file: string;
  /** The level-one heading, without the leading hash. */
  title: string;
  /** The whole file, exactly as written on disk. */
  text: string;
  /** Everything after the level-one heading. */
  body: string;
  sections: PromptSection[];
}

const HEADING = /^(#{1,6})\s+(.*)$/;

function parsePrompt(name: PromptName, file: string, text: string): Prompt {
  const lines = text.split(/\r?\n/);
  const firstIndex = lines.findIndex((line) => line.trim().length > 0);
  const firstHeading = firstIndex >= 0 ? HEADING.exec(lines[firstIndex] ?? "") : null;
  const hasTitle = firstHeading?.[1] === "#";
  const title = hasTitle ? (firstHeading?.[2] ?? "").trim() : name;
  const body = lines.slice(hasTitle ? firstIndex + 1 : 0);

  const sections: PromptSection[] = [];
  let heading: string | null = null;
  let level = 2;
  let collected: string[] = [];
  function flush(): void {
    if (heading === null) return;
    sections.push({ heading, level, body: collected.join("\n").trim() });
  }
  for (const line of body) {
    const match = HEADING.exec(line);
    if (match && (match[1]?.length ?? 0) >= 2) {
      flush();
      heading = (match[2] ?? "").trim();
      level = match[1]?.length ?? 2;
      collected = [];
      continue;
    }
    collected.push(line);
  }
  flush();

  return { name, file, title, text: text.trim(), body: body.join("\n").trim(), sections };
}

const cache = new Map<PromptName, Prompt>();

export function promptPath(name: PromptName): string {
  return path.join(resolvePromptsDirectory(), `${name}.md`);
}

export function loadPrompt(name: PromptName): Prompt {
  const cached = cache.get(name);
  if (cached) return cached;
  const file = promptPath(name);
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    throw new Error(
      `The Discere prompt '${name}' could not be read from '${file}'. Prompts ship with the repository; restore 'prompts/${name}.md'. Cause: ${cause}`,
    );
  }
  const prompt = parsePrompt(name, file, text);
  cache.set(name, prompt);
  return prompt;
}

export function loadPrompts(): Record<PromptName, Prompt> {
  return Object.fromEntries(PROMPT_NAMES.map((name) => [name, loadPrompt(name)])) as Record<
    PromptName,
    Prompt
  >;
}

export function promptSection(name: PromptName, heading: string): PromptSection {
  const wanted = heading.trim().toLowerCase();
  const section = loadPrompt(name).sections.find(
    (candidate) => candidate.heading.toLowerCase() === wanted,
  );
  if (!section) throw new Error(`The prompt '${name}' has no '${heading}' section.`);
  return section;
}

/** Clears the in-process cache so a changed prompt file is read again. */
export function clearPromptCache(): void {
  cache.clear();
}
