import { readdir } from "node:fs/promises";
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
} from "@discere/contracts";
import { courseAssetDirectory, loadCourseBundle } from "@discere/curriculum";

/** The interactive canvas each activity type asks for. */
const ACTIVITY_VISUAL_KIND = {
  ohms_law_explorer: "circuit",
  series_circuit_explorer: "circuit",
  parallel_circuit_explorer: "circuit",
  timeline_explorer: "timeline",
} as const satisfies Record<Activity["type"], "circuit" | "graph" | "timeline" | "map">;

export interface CourseActivity {
  /** ISO timestamp of the most recent stage progress in the course, when there is any. */
  lastActiveAt: string | null;
  lessonId: string | null;
}

interface LoadedCourse {
  bundle: CourseBundle;
  assetDirectory: string;
}

function stageIds(lesson: LessonBeat, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `${lesson.id}:quiz-${index + 1}`);
}

/**
 * Resolves each authored step's references into the payload the learner receives. An inline
 * check carries its question with the answer authority and transfer task removed, exactly as a
 * quiz stage does — a step is a different way of asking, not a different way of grading, and it
 * submits through the same attempts endpoint.
 */
function learnerSteps(lesson: LessonBeat, bundle: CourseBundle): LearnerStep[] {
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
    const learnerQuestion = question
      ? (({ answerAuthority: _authority, transfer: _transfer, ...rest }) => rest)(question)
      : undefined;
    return {
      id: step.id,
      kind: step.kind,
      blocks: step.blocks,
      visualStateId: step.visualStateId,
      ...(learnerQuestion ? { question: learnerQuestion as LearnerQuestion } : {}),
      ...(activity ? { activity } : {}),
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
    const entries = await readdir(contentRoot, { withFileTypes: true });
    const directories = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
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

  get concepts(): Concept[] {
    return this.courses.flatMap((course) => course.bundle.concepts);
  }

  get flashcards(): Array<{ courseId: string; card: FlashcardRecord }> {
    return this.courses.flatMap((course) =>
      course.bundle.flashcards.map((card) => ({ courseId: course.bundle.course.id, card })),
    );
  }

  get defaultCourseId(): string {
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
        ? `/api/content/${encodeURIComponent(bundle.course.id)}/assets/${encodeURIComponent(bundle.course.coverAsset)}`
        : "",
      status: bundle.course.status,
      completedLessonCount: Math.min(completedLessonCount, bundle.lessons.length),
    };
  }

  courseSummaries(
    activity: Map<string, CourseActivity> = new Map(),
    completedLessons: Map<string, number> = new Map(),
  ): CourseSummary[] {
    return this.courses.flatMap((course) => {
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
      .filter(([courseId, record]) => this.has(courseId) && record.lastActiveAt !== null)
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
    if (!activity || !question) {
      throw new Error(`Lesson '${lessonId}' references missing content.`);
    }
    const sources = lesson.sourceIds.map((sourceId) => {
      const source = bundle.sources.find((item) => item.id === sourceId);
      if (!source) throw new Error(`Lesson references missing source '${sourceId}'.`);
      return source;
    });
    const { answerAuthority: _authority, transfer: _transfer, ...learnerQuestion } = question;
    return { lesson, activity, question: learnerQuestion as LearnerQuestion, sources };
  }

  getJourney(courseId: string, lessonId: string): LessonJourney | undefined {
    const bundle = this.bundle(courseId);
    const lesson = bundle?.lessons.find((item) => item.id === lessonId);
    if (!bundle || !lesson) return undefined;
    const activity = bundle.activities.find((item) => item.id === lesson.activityId);
    if (!activity) throw new Error(`Lesson '${lessonId}' references missing activity.`);

    const questions = lesson.questionIds.map((id) => {
      const question = bundle.questions.find((item) => item.id === id);
      if (!question) throw new Error(`Lesson '${lessonId}' references missing question '${id}'.`);
      const { answerAuthority: _authority, transfer: _transfer, ...learner } = question;
      return learner as LearnerQuestion;
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

    const quizIds = stageIds(lesson, questions.length);
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
        visual: {
          kind: lesson.visualKind,
          ...(lesson.visualKind === "none" ? {} : { briefId: lesson.visualBrief.id }),
          alt: lesson.visualBrief.altTextDraft,
          ...(lesson.visualKind === "circuit" && lesson.circuitSpec
            ? { src: `/api/visuals/circuit.svg?lessonId=${encodeURIComponent(lesson.id)}` }
            : {}),
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
      {
        id: `${lesson.id}:visual`,
        type: "interactive_visual",
        title: activity.title,
        conceptIds: activity.conceptIds,
        sourceIds: lesson.sourceIds,
        optional: false,
        completionPolicy: "interaction",
        activity,
        prompt: activity.predictionPrompt,
        visualKind: ACTIVITY_VISUAL_KIND[activity.type],
      },
      ...questions.map(
        (question, index): LearnerStage => ({
          id: quizIds[index] ?? `${lesson.id}:quiz-${index + 1}`,
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
      },
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

  getQuestion(id: string): Question | undefined {
    for (const course of this.courses) {
      const question = course.bundle.questions.find((item) => item.id === id);
      if (question) return question;
    }
    return undefined;
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
  visualBriefs(): Array<LessonBeat["visualBrief"]> {
    return this.courses.flatMap((course) =>
      course.bundle.lessons.map((lesson) => lesson.visualBrief),
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
  const words = [
    lesson.orientation,
    ...lesson.steps.flatMap((step) =>
      step.blocks.map((block) => (block.kind === "equation" ? "" : block.text ?? "")),
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
