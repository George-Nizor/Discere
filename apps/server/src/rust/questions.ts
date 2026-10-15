import type { Question, RustTaskRun } from "@discere/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ContentRepository } from "../content.js";
import { HttpError } from "../errors.js";
import { type GradedTask, mark, present, runCases } from "./grading.js";
import type { RustRuntime } from "./runtime.js";

/** The task behind a lesson question answered by writing code, or undefined for any other. */
export function codeTask(question: Question): GradedTask | undefined {
  if (!question.code || !question.codeCases) return undefined;
  return { kind: question.code.kind, call: question.code.call, cases: question.codeCases };
}

export interface CodeAssessment {
  correct: boolean;
  feedback: string;
  run: RustTaskRun;
}

/** Marks a lesson code answer by running it against every case. */
export async function assessCode(
  runtime: RustRuntime,
  task: GradedTask,
  code: string,
): Promise<CodeAssessment> {
  const marked = await mark(runtime, task, code);
  const { run } = marked;
  const others = task.cases.length - 1;
  const feedback = marked.correct
    ? task.cases.length === 1
      ? "It prints exactly what was asked."
      : "It passes all " + task.cases.length + " tests."
    : run.status === "compile_error"
      ? (run.message ?? "It doesn't compile yet.") + " rustc's message is in the console."
      : run.status === "runtime_error"
        ? "It compiled, then stopped with an error. The console shows where."
        : run.status === "limit"
          ? (run.message ?? "It stopped at a practice limit.")
          : marked.examplePassed
            ? "It works for the example but fails " +
              (task.cases.length - marked.passed) +
              " of the " +
              others +
              " other tests. Check that nothing depends on the example's values."
            : task.kind === "function"
              ? "For the example it returned " +
                (run.returned ?? "nothing") +
                ", not " +
                task.cases[0]!.expected +
                "."
              : "What it printed differs from the expected output. Compare them line by line.";
  return { correct: marked.correct, feedback, run };
}

/**
 * Run, without marking: the visible example only, so a learner can see what their code does
 * before checking it. Nothing is recorded.
 */
export async function registerCodeQuestionRoutes(
  app: FastifyInstance,
  { content, runtime }: { content: ContentRepository; runtime: RustRuntime },
) {
  app.post("/api/questions/:questionId/run", async (request) => {
    const { questionId } = z.object({ questionId: z.string().min(1) }).parse(request.params);
    const { code } = z.object({ code: z.string().min(1).max(16000) }).strict().parse(request.body);
    const question = content.getQuestion(questionId);
    const task = question ? codeTask(question) : undefined;
    if (!task)
      throw new HttpError(404, "This question is not answered with code.", "CODE_QUESTION_NOT_FOUND");
    const [visible] = await runCases(runtime, task, code, 1);
    return present(task, visible!);
  });
}
