import type {
  CourseCheckDefinition,
  CourseCheckVisual,
} from "../../packages/contracts/src/index.js";
export type LessonAuthority = { id: string; conceptIds: string[]; sourceIds: string[] };
type Item = CourseCheckDefinition["items"][number];
type Draft = Omit<Item, "question"> & { question: Omit<Item["question"], "id"> };
export const statements = (
  title: string,
  lines: string[],
  conclusion?: string,
): CourseCheckVisual => ({
  type: "statements",
  title,
  statements: lines.map((text, i) => ({ label: String.fromCharCode(65 + i), text })),
  ...(conclusion ? { conclusion } : {}),
});
export const table = (columns: string[], rows: string[][]): CourseCheckVisual => ({
  type: "table",
  columns,
  rows,
});
export const program = (code: string): CourseCheckVisual => ({
  type: "program",
  language: "python",
  code,
});
export const series = (
  label: string,
  ...entries: Array<[string, number[]]>
): CourseCheckVisual => ({
  type: "data_series",
  label,
  series: entries.map(([label, values]) => ({ label, values })),
});
export function authors(courseId: string, lessons: LessonAuthority[]) {
  function numeric(
    lesson: number,
    prompt: string,
    visual: CourseCheckVisual,
    value: number,
    explanation: string,
    unit = "",
  ): Draft {
    const authority = lessons[lesson];
    if (!authority) throw Error("Missing lesson authority");
    return {
      lessonId: authority.id,
      visual,
      question: {
        conceptIds: authority.conceptIds,
        sourceIds: authority.sourceIds,
        prompt,
        responseType: "numeric",
        difficulty: 1,
        hints: [],
        answerAuthority: {
          kind: "numeric",
          value,
          unit,
          absoluteTolerance: 1e-9,
          relativeTolerance: 0,
          workedAnswer: explanation,
        },
      },
    };
  }
  function choice(
    lesson: number,
    prompt: string,
    visual: CourseCheckVisual,
    choices: string[],
    correct: number,
    explanation: string,
  ): Draft {
    if (!choices[correct]) throw Error("Missing correct choice");
    const item = numeric(lesson, prompt, visual, 0, explanation);
    return {
      ...item,
      question: {
        ...item.question,
        responseType: "short_text",
        choices: choices.map((label, i) => ({ id: String(i + 1), label })),
        answerAuthority: {
          kind: "text",
          acceptedIdeas: [choices[correct]!],
          rejectedIdeas: [],
          exampleAnswer: explanation,
        },
      },
    };
  }
  function sets(
    placement: Draft[],
    checkpoint: Draft[],
    transfer: Draft[],
    descriptions: [string, string, string],
  ): CourseCheckDefinition[] {
    const definitions = [
      {
        id: "starting-point",
        kind: "placement" as const,
        title: "Find your starting point",
        items: placement,
      },
      {
        id: "bring-it-together",
        kind: "checkpoint" as const,
        title: "Bring it together",
        items: checkpoint,
      },
      {
        id: "use-it-a-week-later",
        kind: "transfer" as const,
        title: "Use it a week later",
        items: transfer,
      },
    ];
    return definitions.map((d, set) => ({
      ...d,
      description: descriptions[set]!,
      requiredLessonIds: set === 0 ? [] : lessons.map((l) => l.id),
      ...(set === 2 ? { afterCheckId: "bring-it-together", delayDays: 7 } : {}),
      items: d.items.map((i, index) => ({
        ...i,
        question: { ...i.question, id: courseId + "-check-" + d.kind + "-" + (index + 1) },
      })),
    }));
  }
  return { numeric, choice, sets };
}
