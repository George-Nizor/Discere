import path from "node:path";
import type {
  Activity,
  Concept,
  CourseBundle,
  CourseDetailResponse,
  CourseSummary,
  EssayStage,
  EssayTopic,
  FlashcardRecord,
  LearnerQuestion,
  LearnerStage,
  LearnerStep,
  LessonBeat,
  LessonJourney,
  LessonResponse,
  Question,
  RichTextBlock,
} from "@discere/contracts";
import { learnerActivity, learnerQuestion as questionForLearner } from "@discere/contracts";
import { courseAssetDirectory, courseDirectories, loadCourseBundle } from "@discere/curriculum";
import { isV2Step, projectStep } from "./lesson-projection.js";

/** The interactive canvas each activity type asks for. */
const ACTIVITY_VISUAL_KIND = {
  ohms_law_explorer: "circuit",
  series_circuit_explorer: "circuit",
  parallel_circuit_explorer: "circuit",
  timeline_explorer: "timeline",
  diagram_choice: "circuit",
  order_sequence: "diagram",
  graph_plot: "graph",
} as const satisfies Record<Activity["type"], "circuit" | "graph" | "timeline" | "map" | "diagram">;

export interface CourseActivity {
  /** ISO timestamp of the most recent stage progress in the course, when there is any. */
  lastActiveAt: string | null;
  lessonId: string | null;
}

interface LoadedCourse {
  bundle: CourseBundle;
  assetDirectory: string;
}

/**
 * Skill-check stages are named by the question they ask, not by their position, so adding or
 * reordering a lesson's checks never moves saved progress onto the wrong question.
 * Migration 0011 renamed the positional `quiz-N` ids saved before this.
 */
/** The opener screen of a v2 lesson, addressed like a step by the lesson-feedback route. */
export const LESSON_OPENER_ID = "opener";

export function quizStageId(lessonId: string, questionId: string): string {
  return `${lessonId}:check:${questionId}`;
}

function findQuestion(bundle: CourseBundle, lesson: LessonBeat, id: string): Question {
  const question = bundle.questions.find((item) => item.id === id);
  if (!question) throw new Error(`Lesson '${lesson.id}' references missing question '${id}'.`);
  return question;
}

/**
 * Resolves each authored step's references into the payload the learner receives. An inline
 * check carries its question with the answer authority and transfer task removed, exactly as a
 * quiz stage does — a step is a different way of asking, not a different way of grading, and it
 * submits through the same attempts endpoint.
 *
 * Teaching is shown before the question (audit B1). A legacy step's prose is split so that only
 * the sentences that would state the answer wait for the reveal; a v2 step sends its `lead`.
 */
function learnerSteps(lesson: LessonBeat, bundle: CourseBundle): LearnerStep[] {
  const archived = bundle.course.catalogueVisibility === "archived";
  return lesson.steps.map((step) => {
    const question = step.checkQuestionId
      ? bundle.questions.find((item) => item.id === step.checkQuestionId)
      : undefined;
    if (step.checkQuestionId && !question) {
      throw new Error(
        `Lesson '${lesson.id}' step '${step.id}' references missing question '${step.checkQuestionId}'.`,
      );
    }
    const activity = step.activityId
      ? bundle.activities.find((item) => item.id === step.activityId)
      : undefined;
    if (step.activityId && !activity) {
      throw new Error(
        `Lesson '${lesson.id}' step '${step.id}' references missing activity '${step.activityId}'.`,
      );
    }
    const learnerQuestion = question ? questionForLearner(question) : undefined;
    const v2 = isV2Step(step);
    // Every v2 step plays on the focused screen; a legacy step does when it asks something.
    const questionLed = !archived && (question !== undefined || v2);
    const projection = archived ? { lead: step.blocks, reveal: [] } : projectStep(step, question);
    const workedSteps = step.workedSteps?.map((line) => ({
      text: line.text,
      ...(line.math ? { math: line.math } : {}),
      ...(line.blank
        ? { blank: questionForLearner(findQuestion(bundle, lesson, line.blank.questionId)) }
        : {}),
      ...(line.selfExplain
        ? {
            selfExplain: questionForLearner(
              findQuestion(bundle, lesson, line.selfExplain.questionId),
            ),
          }
        : {}),
    }));
    return {
      id: step.id,
      kind: step.kind,
      blocks: projection.lead,
      ...(projection.eyebrow && !archived ? { eyebrow: projection.eyebrow } : {}),
      ...(step.headline ? { headline: step.headline } : {}),
      ...(workedSteps ? { workedSteps } : {}),
      ...(step.answerVisibility ? { answerVisibility: step.answerVisibility } : {}),
      ...(step.calculator ? { calculator: step.calculator } : {}),
      ...(questionLed ? { questionLed: true } : {}),
      ...(questionLed && projection.reveal.length > 0 ? { hasReveal: true } : {}),
      visualStateId: step.visualStateId,
      ...(step.diagram ? { diagram: step.diagram } : {}),
      ...(learnerQuestion ? { question: learnerQuestion as LearnerQuestion } : {}),
      ...(activity ? { activity: learnerActivity(activity) } : {}),
    };
  });
}

/**
 * Every course bundle under `content/`, with the lookups the routes need. Nothing here knows
 * the name of a particular course: a directory holding a valid bundle becomes a course.
 */
export class ContentRepository {
  private readonly byCourseId: Map<string, LoadedCourse>;

  private constructor(private readonly courses: LoadedCourse[]) {
    this.byCourseId = new Map(courses.map((course) => [course.bundle.course.id, course]));
  }

  static async load(contentRoot: string): Promise<ContentRepository> {
    const directories = await courseDirectories(contentRoot);
    const courses: LoadedCourse[] = [];
    for (const directory of directories) {
      const bundlePath = path.join(contentRoot, directory, "bundle.json");
      const bundle = await loadCourseBundle(bundlePath);
      courses.push({ bundle, assetDirectory: courseAssetDirectory(bundlePath) });
    }
    if (courses.length === 0) throw new Error(`No course bundle was found under '${contentRoot}'.`);
    assertUniqueIdentifiers(courses);
    return new ContentRepository(courses);
  }

  static defaultContentRoot(): string {
    return path.resolve(import.meta.dirname, "../../../content");
  }

  get bundles(): CourseBundle[] {
    return this.courses.map((course) => course.bundle);
  }

  get listedBundles(): CourseBundle[] {
    return this.courses
      .filter((item) => item.bundle.course.catalogueVisibility !== "archived")
      .map((item) => item.bundle);
  }

  isListed(courseId: string): boolean {
    const course = this.bundle(courseId)?.course;
    return Boolean(course && course.catalogueVisibility !== "archived");
  }

  get concepts(): Concept[] {
    return this.courses.flatMap((item) => item.bundle.concepts);
  }

  get flashcards(): Array<{ courseId: string; card: FlashcardRecord }> {
    return this.courses.flatMap((course) =>
      course.bundle.flashcards.map((card) => ({ courseId: course.bundle.course.id, card })),
    );
  }

  get defaultCourseId(): string {
    if (this.byCourseId.has("maths-foundations")) return "maths-foundations";
    const first = this.courses[0];
    if (!first) throw new Error("Discere loaded no courses.");
    return first.bundle.course.id;
  }

  has(courseId: string): boolean {
    return this.byCourseId.has(courseId);
  }

  bundle(courseId: string): CourseBundle | undefined {
    return this.byCourseId.get(courseId)?.bundle;
  }

  /** Absolute directory holding one course's retrieved images. */
  assetDirectory(courseId: string): string | undefined {
    return this.byCourseId.get(courseId)?.assetDirectory;
  }

  courseOfLesson(lessonId: string): string | undefined {
    return this.courses.find((course) =>
      course.bundle.lessons.some((lesson) => lesson.id === lessonId),
    )?.bundle.course.id;
  }

  courseSummary(
    courseId: string,
    lastActiveAt: string | null = null,
    completedLessonCount = 0,
  ): CourseSummary | undefined {
    const bundle = this.bundle(courseId);
    if (!bundle) return undefined;
    return {
      id: bundle.course.id,
      title: bundle.course.title,
      description: bundle.course.description,
      lessonCount: bundle.lessons.length,
      availableLessonIds: bundle.lessons.map((lesson) => lesson.id),
      lastActiveAt,
      accent: bundle.course.accent,
      // Served through the existing course-asset route, which keeps its symlink containment.
      coverUrl: bundle.course.coverAsset
        ? `/api/content/${encodeURIComponent(bundle.course.id)}/assets/${encodeURIComponent(bundle.course.coverAsset)}?v=20261001-icons`
        : "",
      status: bundle.course.status,
      subjects: bundle.course.subjects ?? [],
      completedLessonCount: Math.min(completedLessonCount, bundle.lessons.length),
    };
  }

  courseSummaries(
    activity: Map<string, CourseActivity> = new Map(),
    completedLessons: Map<string, number> = new Map(),
  ): CourseSummary[] {
    return this.courses
      .filter((course) => this.isListed(course.bundle.course.id))
      .flatMap((course) => {
        const id = course.bundle.course.id;
        const summary = this.courseSummary(
          id,
          activity.get(id)?.lastActiveAt ?? null,
          completedLessons.get(id) ?? 0,
        );
        return summary ? [summary] : [];
      });
  }

  courseDetail(
    courseId: string,
    lastActiveAt: string | null = null,
    completedLessonIds: ReadonlySet<string> = new Set(),
    completedLessonCount = 0,
  ): CourseDetailResponse | undefined {
    const bundle = this.bundle(courseId);
    const course = this.courseSummary(courseId, lastActiveAt, completedLessonCount);
    if (!bundle || !course) return undefined;
    return {
      course,
      lessons: bundle.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        orientation: lesson.orientation,
        conceptIds: lesson.conceptIds,
        available: true,
        stageCount: this.getJourney(courseId, lesson.id)?.stages.length ?? 0,
        completed: completedLessonIds.has(lesson.id),
      })),
      exerciseCount: bundle.questions.length,
      modules: bundle.course.moduleIds.flatMap((id) => {
        const module = bundle.modules.find((item) => item.id === id);
        if (!module) return [];
        return [
          {
            id,
            title: module.title,
            description: module.description,
            lessonIds: bundle.lessons
              .filter((lesson) =>
                lesson.conceptIds.some((conceptId) => module.conceptIds.includes(conceptId)),
              )
              .map((lesson) => lesson.id),
          },
        ];
      }),
      concepts: bundle.concepts.map((concept) => ({
        id: concept.id,
        title: concept.title,
        summary: concept.summary,
      })),
    };
  }

  /**
   * The lesson the learner should be offered first: the most recently worked course when there
   * is one, otherwise the first course in the library.
   */
  currentLessonId(activity: Map<string, CourseActivity> = new Map()): {
    courseId: string;
    lessonId: string;
  } {
    const recent = [...activity.entries()]
      .filter(([courseId, record]) => this.isListed(courseId) && record.lastActiveAt !== null)
      .sort(([, left], [, right]) =>
        (right.lastActiveAt ?? "").localeCompare(left.lastActiveAt ?? ""),
      )[0];
    const courseId = recent?.[0] ?? this.defaultCourseId;
    const lessonId = recent?.[1].lessonId ?? this.bundle(courseId)?.lessons[0]?.id;
    if (!lessonId) throw new Error(`Course '${courseId}' contains no lessons.`);
    return { courseId, lessonId };
  }

  currentLesson(activity: Map<string, CourseActivity> = new Map()): LessonResponse {
    const { courseId, lessonId } = this.currentLessonId(activity);
    const response = this.getLesson(lessonId, courseId);
    if (!response) throw new Error("The current lesson references missing content.");
    return response;
  }

  getLesson(lessonId: string, courseId?: string): LessonResponse | undefined {
    const resolvedCourseId = courseId ?? this.courseOfLesson(lessonId);
    const bundle = resolvedCourseId === undefined ? undefined : this.bundle(resolvedCourseId);
    const lesson = bundle?.lessons.find((item) => item.id === lessonId);
    if (!bundle || !lesson) return undefined;
    const activity = bundle.activities.find((item) => item.id === lesson.activityId);
    const questionId = lesson.questionIds[0];
    const question = bundle.questions.find((item) => item.id === questionId);
    if ((lesson.activityId && !activity) || !question) {
      throw new Error(`Lesson '${lessonId}' references missing content.`);
    }
    const sources = lesson.sourceIds.map((sourceId) => {
      const source = bundle.sources.find((item) => item.id === sourceId);
      if (!source) throw new Error(`Lesson references missing source '${sourceId}'.`);
      return source;
    });
    return {
      lesson:
        bundle.course.catalogueVisibility === "archived"
          ? lesson
          : {
              ...lesson,
              // The same split as the journey: teaching first, answer-bearing prose withheld.
              steps: lesson.steps.map((step) => {
                const { reveal: _reveal, ...rest } = step;
                if (!step.checkQuestionId) return rest;
                const projection = projectStep(
                  step,
                  bundle.questions.find((item) => item.id === step.checkQuestionId),
                );
                const heading = step.blocks.find((block) => block.kind === "heading");
                return {
                  ...rest,
                  blocks: [...(heading ? [heading] : []), ...projection.lead],
                };
              }),
            },
      ...(activity ? { activity: learnerActivity(activity) } : {}),
      question: questionForLearner(question),
      sources,
    };
  }

  getJourney(courseId: string, lessonId: string): LessonJourney | undefined {
    const bundle = this.bundle(courseId);
    const lesson = bundle?.lessons.find((item) => item.id === lessonId);
    if (!bundle || !lesson) return undefined;
    // A lesson only gets an explorer stage when it names one. Since lessons became steps, an
    // interaction can live inside a step instead, and most subjects have no explorer at all.
    const activity = lesson.activityId
      ? bundle.activities.find((item) => item.id === lesson.activityId)
      : undefined;
    if (lesson.activityId && !activity) {
      throw new Error(`Lesson '${lessonId}' references missing activity.`);
    }

    const questions = lesson.questionIds.map((id) => {
      const question = bundle.questions.find((item) => item.id === id);
      if (!question) throw new Error(`Lesson '${lessonId}' references missing question '${id}'.`);
      return questionForLearner(question);
    });
    const essay =
      lesson.essayId === undefined
        ? undefined
        : bundle.essays.find((item) => item.id === lesson.essayId);
    if (lesson.essayId !== undefined && !essay) {
      throw new Error(`Lesson '${lessonId}' references missing essay '${lesson.essayId}'.`);
    }
    const sources = lesson.sourceIds.flatMap((sourceId) => {
      const source = bundle.sources.find((item) => item.id === sourceId);
      return source ? [source] : [];
    });

    const intro = lesson.intro;
    const hookQuestion = intro?.hook.questionId
      ? questionForLearner(findQuestion(bundle, lesson, intro.hook.questionId))
      : undefined;
    const stages: LearnerStage[] = [
      {
        id: `${lesson.id}:explainer`,
        type: "explainer",
        title: lesson.title,
        conceptIds: lesson.conceptIds,
        sourceIds: lesson.sourceIds,
        optional: false,
        // A lesson is finished by working through it, not by looking at it.
        completionPolicy: "interaction",
        steps: learnerSteps(lesson, bundle),
        ...(intro
          ? {
              intro: {
                hook: {
                  blocks: intro.hook.blocks,
                  ...(intro.hook.diagram ? { diagram: intro.hook.diagram } : {}),
                  ...(hookQuestion ? { question: hookQuestion } : {}),
                },
                promise: intro.promise,
                ...(intro.whyItMatters ? { whyItMatters: intro.whyItMatters } : {}),
                estimatedMinutes: intro.estimatedMinutes,
              },
            }
          : {}),
        ...(lesson.calculator ? { calculator: lesson.calculator } : {}),
        visual: {
          kind: lesson.visualKind,
          ...(lesson.visualKind === "none" || !lesson.visualBrief
            ? {}
            : { briefId: lesson.visualBrief.id }),
          alt: lesson.visualBrief?.altTextDraft || "This lesson has no diagram.",
          ...(lesson.visualKind === "circuit" && lesson.circuitSpec
            ? {
                src: `/api/visuals/circuit.svg?lessonId=${encodeURIComponent(lesson.id)}`,
                // The spec travels too, so the browser can redraw it as the lesson advances
                // instead of fetching a new image for every frame.
                circuit: lesson.circuitSpec,
              }
            : {}),
          states: lesson.visualStates,
          ...(lesson.visualKind === "image" && lesson.image
            ? {
                src: `/api/content/${encodeURIComponent(courseId)}/assets/${encodeURIComponent(lesson.image.file)}`,
              }
            : {}),
          ...(lesson.image
            ? {
                image: {
                  src: `/api/content/${encodeURIComponent(courseId)}/assets/${encodeURIComponent(lesson.image.file)}`,
                  caption: lesson.image.caption,
                  attribution: lesson.image.attribution,
                  licence: lesson.image.licence,
                  ...(lesson.image.licenceUrl === undefined
                    ? {}
                    : { licenceUrl: lesson.image.licenceUrl }),
                  landingPageUrl: lesson.image.landingPageUrl,
                },
              }
            : {}),
        },
      },
      // A lesson only gets an explorer stage when it names one.
      ...(activity
        ? [
            {
              id: `${lesson.id}:visual`,
              type: "interactive_visual" as const,
              title: activity.title,
              conceptIds: activity.conceptIds,
              sourceIds: lesson.sourceIds,
              optional: false,
              completionPolicy: "interaction" as const,
              activity: learnerActivity(activity),
              // An explorer asks the learner to predict; newer types ask their question directly.
              prompt: "predictionPrompt" in activity ? activity.predictionPrompt : activity.prompt,
              visualKind: ACTIVITY_VISUAL_KIND[activity.type],
            },
          ]
        : []),
      ...questions.map(
        (question, index): LearnerStage => ({
          id: quizStageId(lesson.id, question.id),
          type: "quiz",
          title: lesson.stageTitles.quiz,
          conceptIds: question.conceptIds,
          sourceIds: question.sourceIds,
          optional: false,
          completionPolicy: "assessment",
          questionId: question.id,
          question,
          questionIndex: index + 1,
          questionCount: questions.length,
          ...(intro ? { skillCheck: true } : {}),
          ...((question.calculator ?? lesson.calculator)
            ? { calculator: question.calculator ?? lesson.calculator }
            : {}),
        }),
      ),
      ...(essay ? [essayStage(lesson, essay)] : []),
      {
        id: `${lesson.id}:review`,
        type: "review",
        title: lesson.stageTitles.review,
        conceptIds: lesson.conceptIds,
        sourceIds: lesson.sourceIds,
        optional: false,
        completionPolicy: "assessment",
        reviewLabel: lesson.reviewLabel,
        itemCount: Math.max(1, lesson.flashcardIds.length),
        concepts: lesson.conceptIds,
        lessonId: lesson.id,
        cardIds: lesson.flashcardIds,
      },
      ...(lesson.recap
        ? [
            {
              id: `${lesson.id}:close`,
              type: "recap" as const,
              title: lesson.title,
              conceptIds: lesson.conceptIds,
              sourceIds: lesson.sourceIds,
              optional: false,
              completionPolicy: "view" as const,
              keyIdea: lesson.recap.keyIdea,
              blocks: lesson.recap.blocks ?? [],
              ...(lesson.recap.nextHook ? { nextHook: lesson.recap.nextHook } : {}),
              cardFronts: lesson.flashcardIds.flatMap((id) => {
                const card = bundle.flashcards.find((item) => item.id === id);
                return card ? [card.front] : [];
              }),
            },
          ]
        : []),
      {
        id: `${lesson.id}:completion`,
        type: "completion",
        title: lesson.stageTitles.completion,
        conceptIds: lesson.conceptIds,
        sourceIds: lesson.sourceIds,
        optional: false,
        completionPolicy: "view",
        concepts: lesson.conceptIds,
        nextAction: lesson.nextAction,
      },
    ];

    return {
      id: `${lesson.courseId}:${lesson.id}`,
      courseId: lesson.courseId,
      lessonId: lesson.id,
      title: lesson.title,
      estimatedMinutes: estimatedMinutes(lesson, questions.length, essay !== undefined),
      conceptIds: lesson.conceptIds,
      stageOrder: stages.map((stage) => stage.id),
      stages,
      sources,
    };
  }

  /**
   * The prose a step holds back until a response is recorded: a v2 step's `reveal`, or the
   * sentences of a legacy step's paragraph that would have stated the answer.
   */
  stepReveal(lesson: LessonBeat, stepId: string): RichTextBlock[] {
    const bundle = this.bundle(lesson.courseId);
    const step = lesson.steps.find((item) => item.id === stepId);
    if (!bundle || !step) return [];
    if (bundle.course.catalogueVisibility === "archived")
      return step.blocks.filter((block) => block.kind !== "heading");
    const question = bundle.questions.find((item) => item.id === step.checkQuestionId);
    return projectStep(step, question).reveal;
  }

  /** Every question a step asks: its check, and the blanks and prompts of its worked lines. */
  stepQuestionIds(lesson: LessonBeat, stepId: string): string[] {
    const step = lesson.steps.find((item) => item.id === stepId);
    if (!step) {
      // The opener's hook and warm-up are asked on a screen of their own, named by this id.
      return stepId === LESSON_OPENER_ID
        ? [lesson.intro?.hook.questionId, lesson.intro?.warmUpQuestionId].filter(
            (id): id is string => Boolean(id),
          )
        : [];
    }
    return [
      step.checkQuestionId,
      ...(step.workedSteps ?? []).flatMap((line) => [
        line.blank?.questionId,
        line.selfExplain?.questionId,
      ]),
    ].filter((id): id is string => Boolean(id));
  }

  getQuestion(id: string): Question | undefined {
    for (const course of this.courses) {
      const question = course.bundle.questions.find((item) => item.id === id);
      if (question) return question;
    }
    return undefined;
  }

  getActivity(id: string): Activity | undefined {
    return this.courses
      .flatMap((course) => course.bundle.activities)
      .find((activity) => activity.id === id);
  }

  getEssay(id: string): { courseId: string; essay: EssayTopic } | undefined {
    for (const course of this.courses) {
      const essay = course.bundle.essays.find((item) => item.id === id);
      if (essay) return { courseId: course.bundle.course.id, essay };
    }
    return undefined;
  }

  getFlashcard(id: string): { courseId: string; card: FlashcardRecord } | undefined {
    for (const course of this.courses) {
      const card = course.bundle.flashcards.find((item) => item.id === id);
      if (card) return { courseId: course.bundle.course.id, card };
    }
    return undefined;
  }

  /** Every visual brief in the library, used by the image-prompt endpoint. */
  /** Every brief a lesson actually carries. Lessons without a diagram contribute none. */
  visualBriefs(): Array<NonNullable<LessonBeat["visualBrief"]>> {
    return this.courses.flatMap((course) =>
      course.bundle.lessons.flatMap((lesson) => (lesson.visualBrief ? [lesson.visualBrief] : [])),
    );
  }
}

function essayStage(lesson: LessonBeat, essay: EssayTopic): EssayStage {
  return {
    id: `${lesson.id}:essay`,
    type: "essay",
    title: essay.title,
    conceptIds: essay.conceptIds,
    sourceIds: essay.sourceIds,
    optional: true,
    completionPolicy: "submission",
    essayId: essay.id,
    prompt: essay.prompt,
    expectedScope: essay.expectedScope,
    successCriteria: essay.successCriteria,
    minWords: essay.minWords,
  };
}

/** A rough reading and working budget, so the estimate moves with the lesson's real length. */
function estimatedMinutes(lesson: LessonBeat, questionCount: number, hasEssay: boolean): number {
  if (lesson.intro) return lesson.intro.estimatedMinutes + (hasEssay ? 6 : 0);
  const words = [
    lesson.orientation,
    ...lesson.steps.flatMap((step) =>
      [...step.blocks, ...(step.lead ?? []), ...(step.reveal ?? [])].map((block) =>
        block.kind === "equation" ? "" : (block.text ?? ""),
      ),
    ),
  ]
    .join(" ")
    .split(/\s+/u)
    .filter(Boolean).length;
  return Math.max(5, Math.round(words / 130) + 3 + questionCount * 2 + (hasEssay ? 6 : 0));
}

/**
 * Identifiers reach the API without a course prefix, so two bundles that reuse one identifier
 * would silently shadow each other. That is a content fault and is refused at start-up.
 */
function assertUniqueIdentifiers(courses: LoadedCourse[]): void {
  const seen = new Map<string, string>();
  for (const course of courses) {
    const courseId = course.bundle.course.id;
    const identifiers: Array<[string, string[]]> = [
      ["course", [courseId]],
      ["lesson", course.bundle.lessons.map((item) => item.id)],
      ["question", course.bundle.questions.map((item) => item.id)],
      ["activity", course.bundle.activities.map((item) => item.id)],
      ["concept", course.bundle.concepts.map((item) => item.id)],
      ["flashcard", course.bundle.flashcards.map((item) => item.id)],
      ["essay", course.bundle.essays.map((item) => item.id)],
    ];
    for (const [kind, ids] of identifiers) {
      for (const id of ids) {
        const key = `${kind}:${id}`;
        const owner = seen.get(key);
        if (owner !== undefined) {
          throw new Error(`Courses '${owner}' and '${courseId}' both define ${kind} '${id}'.`);
        }
        seen.set(key, courseId);
      }
    }
  }
}
