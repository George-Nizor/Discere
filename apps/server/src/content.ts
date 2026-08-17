import path from "node:path";
import type { CourseBundle, LearnerQuestion, LessonResponse, Question } from "@discere/contracts";
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

  getQuestion(id: string): Question | undefined {
    return this.bundle.questions.find((item) => item.id === id);
  }
}
