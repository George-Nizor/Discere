#!/usr/bin/env node
/**
 * Discere's Model Context Protocol server. It speaks stdio and does nothing but forward calls
 * to Discere's local HTTP API, so an assistant reads the same courses, progress and feedback the
 * learner sees in the app. It holds no state and touches no files, which is why it is safe to
 * import from any working directory.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { type ApiResult, baseUrl, getJson, postJson, segment } from "./api.js";

const SERVER_NAME = "discere";
const SERVER_VERSION = "0.1.0";

const INSTRUCTIONS = [
  "Discere is a local learning workspace. Read before you act.",
  "Start with list_courses to see the library, then get_course for its lessons and concepts,",
  "then get_lesson_journey for the stages of one lesson. get_progress and list_due_reviews",
  "describe where the learner stands. Only then use ask_tutor to discuss a lesson question, or",
  "get_attempt_feedback to submit an answer and have it marked.",
  "This server never exposes review card backs or worked answers; do not ask the learner for",
  "them and do not guess them on their behalf.",
  "Every tool talks to a running Discere instance. If a call reports that Discere is not",
  "reachable, say so and stop, rather than describing courses or progress you have not read.",
].join(" ");

/** Read tools only look at Discere. Nothing they do changes the learner's record. */
const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

/** The tutor and attempt tools write: they record assistance and attempts against the learner. */
const WRITES = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const;

type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

function ok(value: unknown): ToolResult {
  return {
    structuredContent: value as Record<string, unknown>,
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}

/**
 * Failures are returned, not thrown, so the caller sees the reason as a tool result instead of a
 * protocol error. An error result never carries structured content: there is nothing to report.
 */
function fail(message: string): ToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}

function unexpectedShape(what: string, issues: string): ToolResult {
  return fail(
    `Discere answered ${what} with a body this tool did not recognise (${issues}). ` +
      `The server at ${baseUrl()} may be a different version. No data is being reported.`,
  );
}

function result(response: ApiResult): ToolResult {
  return response.ok ? ok(response.value) : fail(response.message);
}

const CourseSummaryShape = {
  id: z.string(),
  title: z.string(),
  description: z.string(),
  lessonCount: z.number(),
  availableLessonIds: z.array(z.string()),
  lastActiveAt: z.string().nullable(),
};

/**
 * Exam mode is missing on purpose. Discere answers a tutoring request made during an exam with
 * 403 EXAM_GUARDRAIL, so the tool refuses it here and says why, rather than sending a request
 * that exists only to be rejected.
 */
const TutoringMode = z.enum(["coach", "assisted", "direct"], {
  error:
    'The tutoring mode must be "coach", "assisted" or "direct". Exam mode is refused: Discere ' +
    "blocks tutoring while the learner is sitting an exam.",
});

/** Attempts are markable in every mode, including exam. */
const AttemptMode = z.enum(["coach", "assisted", "direct", "exam"]);

export function createServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} }, instructions: INSTRUCTIONS },
  );

  server.registerTool(
    "list_courses",
    {
      title: "List courses",
      description:
        "List every course in the local Discere library with its lesson count, the lessons that " +
        "are available to open, and when the learner last worked on it. Start here: the course " +
        "ids returned are what every other course tool needs.",
      inputSchema: {},
      outputSchema: { courses: z.array(z.object(CourseSummaryShape)) },
      annotations: READ_ONLY,
    },
    async () => result(await getJson("/api/courses")),
  );

  server.registerTool(
    "get_course",
    {
      title: "Get course",
      description:
        "Read one course: its summary, the lessons it contains with their orientation text and " +
        "stage counts, and the concepts it teaches. Use the lesson ids it returns with " +
        "get_lesson_journey.",
      inputSchema: {
        courseId: z.string().min(1).describe("A course id from list_courses."),
      },
      outputSchema: {
        course: z.object(CourseSummaryShape),
        lessons: z.array(z.unknown()),
        concepts: z.array(z.unknown()),
      },
      annotations: READ_ONLY,
    },
    async ({ courseId }) => result(await getJson(`/api/courses/${segment(courseId)}`)),
  );

  server.registerTool(
    "get_lesson_journey",
    {
      title: "Get lesson journey",
      description:
        "Read the full learner-facing journey for one lesson: every stage in order, with its " +
        "body. This is the material the learner sees, so it is returned unabridged and can be " +
        "long. It never contains worked answers or review card backs.",
      inputSchema: {
        courseId: z.string().min(1).describe("A course id from list_courses."),
        lessonId: z.string().min(1).describe("A lesson id from get_course."),
      },
      outputSchema: {
        id: z.string(),
        courseId: z.string(),
        lessonId: z.string(),
        title: z.string(),
        estimatedMinutes: z.number(),
        conceptIds: z.array(z.string()),
        stageOrder: z.array(z.string()),
        stages: z.array(z.unknown()),
        sources: z.array(z.unknown()),
      },
      annotations: READ_ONLY,
    },
    async ({ courseId, lessonId }) =>
      result(
        await getJson(`/api/courses/${segment(courseId)}/lessons/${segment(lessonId)}/journey`),
      ),
  );

  const HomeSchema = z.looseObject({
    learnerName: z.string(),
    xp: z.number(),
    streakDays: z.number(),
    currentMission: z.unknown(),
    progress: z.array(z.unknown()),
  });

  server.registerTool(
    "get_progress",
    {
      title: "Get learner progress",
      description:
        "Read where the learner stands: their name, experience points, streak, the mission they " +
        "are on now, and one mastery row per concept they have worked. Use this before " +
        "suggesting what to study next.",
      inputSchema: {},
      outputSchema: {
        learnerName: z.string(),
        xp: z.number(),
        streakDays: z.number(),
        currentMission: z.unknown(),
        progress: z.array(z.unknown()),
      },
      annotations: READ_ONLY,
    },
    async () => {
      const response = await getJson("/api/home");
      if (!response.ok) return fail(response.message);
      const parsed = HomeSchema.safeParse(response.value);
      if (!parsed.success) {
        return unexpectedShape("GET /api/home", z.prettifyError(parsed.error));
      }
      return ok({
        learnerName: parsed.data.learnerName,
        xp: parsed.data.xp,
        streakDays: parsed.data.streakDays,
        currentMission: parsed.data.currentMission ?? null,
        progress: parsed.data.progress,
      });
    },
  );

  server.registerTool(
    "list_due_reviews",
    {
      title: "List due reviews",
      description:
        "Count the spaced repetition cards that are due, with an estimate of how long the " +
        "session would take and a per-course breakdown. Card fronts and backs are deliberately " +
        "not available through this server: reviewing happens in Discere, where the reveal is " +
        "recorded.",
      inputSchema: {},
      outputSchema: {
        dueCount: z.number(),
        estimatedMinutes: z.number(),
        courses: z.array(
          z.object({
            courseId: z.string(),
            title: z.string(),
            dueCount: z.number(),
            cardCount: z.number(),
            nextDueAt: z.string().nullable(),
          }),
        ),
      },
      annotations: READ_ONLY,
    },
    async () => result(await getJson("/api/review")),
  );

  server.registerTool(
    "ask_tutor",
    {
      title: "Ask the tutor",
      description:
        "Ask a question about a lesson and get a tutored reply. The reply is recorded as " +
        "assistance against the learner's work, so it is not a free lookup. Two outcomes are " +
        'possible and both are reported honestly: status "answered" carries the reply along ' +
        "with whether Discere accepted it and any issues it raised, while status " +
        '"packet_required" means the configured provider cannot answer in place and instead ' +
        "returns packet.text for the learner to paste into ChatGPT. Exam mode is not accepted " +
        "here: Discere refuses tutoring during an exam, and this tool will not ask on your " +
        "behalf.",
      inputSchema: {
        lessonId: z.string().min(1).describe("A lesson id from get_course."),
        question: z.string().min(2).describe("The learner's question, in their own words."),
        mode: TutoringMode.describe(
          'The tutoring mode. "coach" hints, "assisted" explains, "direct" answers. ' +
            '"exam" is refused.',
        ),
        conceptIds: z
          .array(z.string().min(1))
          .optional()
          .describe("Narrows the reply to these concepts, from get_course."),
        sessionId: z
          .string()
          .min(1)
          .optional()
          .describe("The sessionId from an earlier answered reply, to continue that conversation."),
      },
      outputSchema: {
        status: z.enum(["answered", "packet_required"]),
        provider: z.string(),
        operation: z.string(),
        requestId: z.string(),
        accepted: z.boolean().optional(),
        issues: z.array(z.unknown()).optional(),
        reply: z.unknown().optional(),
        sessionId: z.string().nullable().optional(),
        packet: z.object({ filename: z.string(), text: z.string() }).optional(),
        message: z.string().optional(),
      },
      annotations: WRITES,
    },
    async ({ lessonId, question, mode, conceptIds, sessionId }) =>
      result(
        await postJson("/api/tutor/ask", {
          lessonId,
          question,
          mode,
          ...(conceptIds === undefined ? {} : { conceptIds }),
          ...(sessionId === undefined ? {} : { sessionId }),
        }),
      ),
  );

  server.registerTool(
    "get_attempt_feedback",
    {
      title: "Submit an answer and get the marked feedback",
      description:
        "Submit an answer to a lesson question and get back Discere's marking: whether it is " +
        "correct, the feedback text, the experience awarded, the resulting concept mastery, and " +
        "whether the answer counted as independent. This records an attempt against the " +
        "learner, so submit their answer, not one you wrote. Pass attemptId to add another try " +
        "to an open attempt; the mode cannot change once an attempt has started.",
      inputSchema: {
        questionId: z.string().min(1).describe("The question id from the lesson journey."),
        response: z.string().describe("The learner's answer."),
        mode: AttemptMode.describe("The tutoring mode the attempt is being made under."),
        attemptId: z
          .string()
          .min(1)
          .optional()
          .describe("The attemptId of an open attempt, to record a further try against it."),
      },
      outputSchema: {
        attemptId: z.string(),
        correct: z.boolean(),
        feedback: z.string(),
        xpAwarded: z.number(),
        mastery: z.number(),
        independent: z.boolean(),
      },
      annotations: WRITES,
    },
    async ({ questionId, response, mode, attemptId }) =>
      result(
        await postJson("/api/attempts", {
          questionId,
          response,
          mode,
          ...(attemptId === undefined ? {} : { attemptId }),
        }),
      ),
  );

  return server;
}

export async function main(): Promise<void> {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}

// The hub imports this file rather than spawning it, so the transport starts on load. There is
// no cwd-relative work here, which is why being loaded from the repository root is fine.
await main();
