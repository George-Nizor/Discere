import path from "node:path";
import type { CourseBundle, CourseDetailResponse, CourseSummary, LearnerQuestion, LessonJourney, LessonResponse, Question } from "@discere/contracts";
import { loadCourseBundle } from "@discere/curriculum";

export class ContentRepository {
  private constructor(readonly bundle: CourseBundle) {}

  static async load(bundlePath: string): Promise<ContentRepository> {
    return new ContentRepository(await loadCourseBundle(bundlePath));
  }

  static defaultPath(): string {
    return path.resolve(import.meta.dirname, "../../../content/electronics-foundations/bundle.json");
  }

  get currentLesson(): LessonResponse {
    const lesson = this.bundle.lessons[0];
    if (!lesson) throw new Error("Course contains no lessons.");
    const response = this.getLesson(lesson.id);
    if (!response) throw new Error("Current lesson references missing content.");
    return response;
  }

  get courseSummary(): CourseSummary {
    return {
      id: this.bundle.course.id,
      title: this.bundle.course.title,
      description: this.bundle.course.description,
      lessonCount: this.bundle.lessons.length,
      availableLessonIds: this.bundle.lessons.slice(0, 1).map((lesson) => lesson.id),
    };
  }

  get courseDetail(): CourseDetailResponse {
    const availableLessonIds = new Set(this.courseSummary.availableLessonIds);
    return {
      course: this.courseSummary,
      lessons: this.bundle.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        orientation: lesson.orientation,
        conceptIds: lesson.conceptIds,
        available: availableLessonIds.has(lesson.id),
        stageCount: availableLessonIds.has(lesson.id) ? 6 : 0,
      })),
    };
  }

  getLesson(id: string): LessonResponse | undefined {
    const lesson = this.bundle.lessons.find((item) => item.id === id);
    if (!lesson) return undefined;
    const activity = this.bundle.activities.find((item) => item.id === lesson.activityId);
    const question = this.bundle.questions.find((item) => item.id === lesson.questionId);
    if (activity?.type !== "ohms_law_explorer" || !question) {
      throw new Error(`Lesson '${id}' references unsupported or missing content.`);
    }
    const sources = lesson.sourceIds.map((sourceId) => {
      const source = this.bundle.sources.find((item) => item.id === sourceId);
      if (!source) throw new Error(`Lesson references missing source '${sourceId}'.`);
      return source;
    });
    const { answerAuthority: _hidden, ...learnerQuestion } = question;
    return { lesson, activity, question: learnerQuestion as LearnerQuestion, sources };
  }

  getJourney(id: string): LessonJourney | undefined {
    const response = this.getLesson(id);
    if (!response) return undefined;
    const { lesson, activity, question, sources } = response;
    const prefix = `${lesson.id}:`;
    const stages: LessonJourney["stages"] = [
      {
        id: `${prefix}explainer`,
        type: "explainer",
        title: "Build the idea",
        conceptIds: lesson.conceptIds,
        sourceIds: lesson.sourceIds,
        optional: false,
        completionPolicy: "view",
        body: `${lesson.orientation}\n\n${lesson.explanation}`,
        takeaway: "Current is the rate of charge flow. Voltage provides the push, and resistance limits the flow.",
        visual: {
          kind: "circuit",
          briefId: lesson.visualBrief.id,
          alt: "A battery and resistor connected in one closed loop.",
        },
      },
      {
        id: `${prefix}visual`,
        type: "interactive_visual",
        title: activity.title,
        conceptIds: activity.conceptIds,
        sourceIds: lesson.sourceIds,
        optional: false,
        completionPolicy: "interaction",
        activity,
        prompt: activity.predictionPrompt,
        visualKind: "circuit",
      },
      {
        id: `${prefix}quiz`,
        type: "quiz",
        title: "Check your understanding",
        conceptIds: question.conceptIds,
        sourceIds: question.sourceIds,
        optional: false,
        completionPolicy: "assessment",
        questionId: question.id,
        question,
        questionCount: 1,
      },
      {
        id: `${prefix}essay`,
        type: "essay",
        title: "Explain it in your own words",
        conceptIds: lesson.conceptIds,
        sourceIds: lesson.sourceIds,
        optional: true,
        completionPolicy: "submission",
        essayId: `${lesson.id}:teach-back`,
        prompt: "Explain how voltage, resistance, and current are related in this circuit. Use the equation and one example from the experiment.",
        expectedScope: "A short teach-back of two to four sentences.",
        successCriteria: [
          "Names the relationship between voltage, resistance, and current.",
          "Uses I = V / R accurately.",
          "Includes a concrete circuit example.",
        ],
        minWords: 20,
      },
      {
        id: `${prefix}review`,
        type: "review",
        title: "Return through review",
        conceptIds: lesson.conceptIds,
        sourceIds: lesson.sourceIds,
        optional: false,
        completionPolicy: "assessment",
        reviewLabel: "Current, voltage, and resistance",
        itemCount: 1,
        concepts: lesson.conceptIds,
      },
      {
        id: `${prefix}completion`,
        type: "completion",
        title: "Lesson complete",
        conceptIds: lesson.conceptIds,
        sourceIds: lesson.sourceIds,
        optional: false,
        completionPolicy: "view",
        concepts: lesson.conceptIds,
        nextAction: "Continue to the next lesson when you are ready.",
      },
    ];
    return {
      id: `${lesson.courseId}:${lesson.id}`,
      courseId: lesson.courseId,
      lessonId: lesson.id,
      title: lesson.title,
      estimatedMinutes: 12,
      conceptIds: lesson.conceptIds,
      stageOrder: stages.map((stage) => stage.id),
      stages,
      sources,
    };
  }

  getQuestion(id: string): Question | undefined {
    return this.bundle.questions.find((item) => item.id === id);
  }
}
