import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  childEnvironment,
  findAvailablePort,
  formatHostForUrl,
  isSupportedNode,
  minimumNodeLabel,
  resolvePackageManager,
  runPackageManager,
  spawnPackageManager,
  terminateProcessTree,
  waitForHttp,
} from "./lib/runtime.mjs";

function capture(child, label) {
  let output = "";
  for (const stream of [child.stdout, child.stderr]) {
    stream?.on("data", (chunk) => {
      output = `${output}${chunk.toString()}`.slice(-20_000);
    });
  }
  return () => (output ? `\n--- ${label} output ---\n${output.trim()}\n` : "");
}

async function requestJson(url, init) {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { "content-type": "application/json", ...init.headers } : init?.headers,
    signal: AbortSignal.timeout(5_000),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

if (!isSupportedNode()) {
  throw new Error(
    `Discere requires Node.js ${minimumNodeLabel()} or newer. Current version: ${process.versions.node}.`,
  );
}
const manager = resolvePackageManager();
if (!manager) {
  throw new Error("pnpm is unavailable; the smoke test cannot start the workspace services.");
}
if (!existsSync(resolve("apps/web/dist/index.html"))) {
  throw new Error("The production web bundle is missing. Run 'pnpm build' before 'pnpm smoke'.");
}

const host = "127.0.0.1";
const apiPort = await findAvailablePort(host, 4417);
const webPort = await findAvailablePort(host, Math.max(4418, apiPort + 1));
const tempRoot = mkdtempSync(join(tmpdir(), "discere-smoke-"));
const environment = childEnvironment({
  DISCERE_HOST: host,
  DISCERE_PORT: String(apiPort),
  DISCERE_WEB_HOST: host,
  DISCERE_WEB_PORT: String(webPort),
  DISCERE_DATABASE_PATH: join(tempRoot, "smoke.sqlite"),
  DISCERE_LEARNER_NAME: "Smoke Tester",
});
const apiUrl = `http://${formatHostForUrl(host)}:${apiPort}`;
const webUrl = `http://${formatHostForUrl(host)}:${webPort}`;

let server;
let web;
let serverOutput = () => "";
let webOutput = () => "";

try {
  runPackageManager(manager, ["--filter", "@discere/server", "db:migrate"], {
    env: environment,
    stdio: "ignore",
  });
  server = spawnPackageManager(manager, ["--filter", "@discere/server", "start"], {
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
  });
  web = spawnPackageManager(manager, ["--filter", "@discere/web", "preview"], {
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
  });
  serverOutput = capture(server, "server");
  webOutput = capture(web, "web");

  await Promise.all([
    waitForHttp(`${apiUrl}/api/health`, {
      timeoutMs: 30_000,
      predicate: async (response) => response.ok && (await response.json()).service === "discere",
    }),
    waitForHttp(webUrl, { timeoutMs: 30_000 }),
    waitForHttp(`${webUrl}/api/health`, {
      timeoutMs: 30_000,
      predicate: async (response) => response.ok && (await response.json()).status === "ok",
    }),
  ]);

  const health = await requestJson(`${webUrl}/api/health`);
  if (health.status !== "ok" || health.service !== "discere") {
    throw new Error("The proxied health response was invalid.");
  }

  const lesson = await requestJson(`${apiUrl}/api/lessons/current`);
  if (
    !lesson.lesson?.id ||
    lesson.question?.answerAuthority !== undefined ||
    !Array.isArray(lesson.sources)
  ) {
    throw new Error("The learner-safe lesson contract was invalid or leaked answer authority.");
  }

  for (const path of ["/", "/courses", "/courses/electronics-foundations", "/review", "/progress"]) {
    const page = await fetch(`${webUrl}${path}`, { signal: AbortSignal.timeout(5_000) });
    const html = await page.text();
    if (!page.ok || !html.includes("/assets/")) {
      throw new Error(`The learner route ${path} did not resolve to the built application.`);
    }
  }

  const courseList = await requestJson(`${apiUrl}/api/courses`);
  const course = courseList.courses?.[0];
  if (
    !course?.id ||
    !course.availableLessonIds?.includes(lesson.lesson.id) ||
    course.lessonCount < 2
  ) {
    throw new Error("The course catalogue did not expose the redesigned learning journey.");
  }
  const courseDetail = await requestJson(`${apiUrl}/api/courses/${encodeURIComponent(course.id)}`);
  const journey = await requestJson(
    `${apiUrl}/api/courses/${encodeURIComponent(course.id)}/lessons/${encodeURIComponent(lesson.lesson.id)}/journey`,
  );
  const stageTypes = journey.stages?.map((stage) => stage.type).join(",");
  if (
    courseDetail.lessons?.find((item) => item.id === lesson.lesson.id)?.stageCount !== 6 ||
    stageTypes !== "explainer,interactive_visual,quiz,essay,review,completion" ||
    journey.stages.some((stage) => stage.answerAuthority !== undefined)
  ) {
    throw new Error("The interactive story journey contract was incomplete or leaked answer authority.");
  }
  for (const stageId of journey.stageOrder) {
    const deepLink = `/courses/${encodeURIComponent(course.id)}/lessons/${encodeURIComponent(lesson.lesson.id)}/stages/${encodeURIComponent(stageId)}`;
    const stagePage = await fetch(`${webUrl}${deepLink}`, { signal: AbortSignal.timeout(5_000) });
    const stageHtml = await stagePage.text();
    if (!stagePage.ok || !stageHtml.includes("/assets/")) {
      throw new Error(`The stage deep link ${deepLink} did not resolve to the built application.`);
    }
  }

  const journeyBase = `${apiUrl}/api/courses/${encodeURIComponent(course.id)}/lessons/${encodeURIComponent(lesson.lesson.id)}`;
  const initialJourneyProgress = await requestJson(`${journeyBase}/progress`);
  if (initialJourneyProgress.activeStageId !== journey.stageOrder[0]) {
    throw new Error("The new learner journey did not restore its first active stage.");
  }
  const savedJourneyProgress = await requestJson(`${journeyBase}/progress`, {
    method: "PUT",
    body: JSON.stringify({ stageId: journey.stageOrder[0], state: "completed", interactionState: { smoke: true } }),
  });
  if (savedJourneyProgress.activeStageId !== journey.stageOrder[1] || savedJourneyProgress.stages[0].state !== "completed") {
    throw new Error("Journey stage completion did not activate the next stage.");
  }

  const essayStage = journey.stages.find((stage) => stage.type === "essay");
  if (!essayStage?.essayId) throw new Error("The journey did not expose an essay stage.");
  const essayContent = "Roman government changed as Augustus concentrated authority, expansion increased administrative demands, and western deposition did not end government in the east.";
  const savedEssay = await requestJson(`${apiUrl}/api/essays/${encodeURIComponent(essayStage.essayId)}`, {
    method: "PUT",
    body: JSON.stringify({ content: essayContent }),
  });
  const submittedEssay = await requestJson(`${apiUrl}/api/essays/${encodeURIComponent(essayStage.essayId)}/submit`, {
    method: "POST",
    body: JSON.stringify({ content: essayContent }),
  });
  if (savedEssay.wordCount < 20 || submittedEssay.submitted !== true) {
    throw new Error("Essay autosave or accountable submission failed its runtime check.");
  }

  const reviewHome = await requestJson(`${apiUrl}/api/review`);
  const reviewSession = await requestJson(`${apiUrl}/api/review/sessions`, { method: "POST", body: "{}" });
  if (typeof reviewHome.dueCount !== "number" || reviewSession.card.back !== undefined) {
    throw new Error("The review queue was not learner-safe before answer reveal.");
  }
  const reviewReveal = await requestJson(`${apiUrl}/api/review/sessions/${reviewSession.sessionId}/reveal`, {
    method: "POST",
    body: "{}",
  });
  const reviewRating = await requestJson(`${apiUrl}/api/review/sessions/${reviewSession.sessionId}/rate`, {
    method: "POST",
    body: JSON.stringify({ rating: "good", recalled: true }),
  });
  if (!reviewReveal.back || reviewRating.evidence !== "independent" || !reviewRating.dueAt) {
    throw new Error("Review reveal, evidence classification, or scheduling failed its runtime check.");
  }

  const circuit = await fetch(
    `${apiUrl}/api/visuals/circuit.svg?voltage=5&resistance=100&values=false`,
    { signal: AbortSignal.timeout(5_000) },
  );
  const circuitSvg = await circuit.text();
  if (
    !circuit.ok ||
    !circuit.headers.get("content-type")?.includes("image/svg+xml") ||
    circuitSvg.includes('class="current"')
  ) {
    throw new Error("The concealed deterministic circuit visual failed its runtime check.");
  }

  const writing = await requestJson(`${apiUrl}/api/writing/lint`, {
    method: "POST",
    body: JSON.stringify({
      text: "This is not a formula; it is a powerful way of thinking.",
      context: "lesson",
    }),
  });
  if (writing.passed !== false || writing.violations.length === 0) {
    throw new Error("The prose quality gate accepted a prohibited pattern.");
  }

  const tutorPacket = await requestJson(`${apiUrl}/api/tutor/companion/packets`, {
    method: "POST",
    body: JSON.stringify({
      operation: "tutor_reply",
      payload: {
        question: "Explain how resistance affects current.",
        mode: "direct",
      },
    }),
  });
  if (
    tutorPacket.operation !== "tutor_reply" ||
    typeof tutorPacket.requestId !== "string" ||
    !tutorPacket.text.includes("Return payload with this exact shape") ||
    tutorPacket.text.includes('"answerAuthority"')
  ) {
    throw new Error("The ChatGPT tutor packet failed its learner-safety or protocol check.");
  }

  const directTutorEnvelope = {
    protocolVersion: "0.2",
    operation: "tutor_reply",
    requestId: tutorPacket.requestId,
    generatedAt: new Date().toISOString(),
    payload: {
      answer:
        "At 5 V across 100 Ω, current is 0.05 A because current equals voltage divided by resistance.",
      followUpQuestion: "What current would the same voltage produce through 200 Ω?",
      sourceIds: [],
      uncertainty: [],
    },
  };
  const acceptedTutorReply = await requestJson(`${apiUrl}/api/tutor/companion/import`, {
    method: "POST",
    body: JSON.stringify({
      text: JSON.stringify(directTutorEnvelope),
      mode: "direct",
      expectedRequestId: tutorPacket.requestId,
    }),
  });
  if (
    acceptedTutorReply.accepted !== true ||
    acceptedTutorReply.requestId !== tutorPacket.requestId
  ) {
    throw new Error("The validated Direct-mode ChatGPT tutor reply was not accepted.");
  }

  const guidedTutorEnvelope = {
    ...directTutorEnvelope,
    payload: {
      answer: "The current is 0.05 A.",
      followUpQuestion: "Can you substitute the values yourself?",
      sourceIds: [],
      uncertainty: [],
    },
  };
  const rejectedTutorReply = await requestJson(`${apiUrl}/api/tutor/companion/import`, {
    method: "POST",
    body: JSON.stringify({
      text: JSON.stringify(guidedTutorEnvelope),
      mode: "coach",
      expectedRequestId: tutorPacket.requestId,
    }),
  });
  if (
    rejectedTutorReply.accepted !== false ||
    !rejectedTutorReply.issues.some((issue) => String(issue.code).startsWith("ANS"))
  ) {
    throw new Error("The guided tutor bridge did not reject final-answer leakage.");
  }

  const lessonId = encodeURIComponent(lesson.lesson.id);
  const emptyPage = await requestJson(`${apiUrl}/api/notebook/${lessonId}`);
  if (emptyPage.strokes.length !== 0 || emptyPage.updatedAt !== null) {
    throw new Error("A new notebook page was not empty.");
  }
  const notebookInput = {
    pageType: "graph",
    note: "Smoke-test working: I = V / R.",
    strokes: [
      {
        id: "smoke-stroke",
        width: 3,
        points: [
          { x: 0.1, y: 0.2 },
          { x: 0.25, y: 0.35 },
        ],
      },
    ],
  };
  await requestJson(`${apiUrl}/api/notebook/${lessonId}`, {
    method: "PUT",
    body: JSON.stringify(notebookInput),
  });
  const savedPage = await requestJson(`${apiUrl}/api/notebook/${lessonId}`);
  if (
    savedPage.pageType !== "graph" ||
    savedPage.note !== notebookInput.note ||
    savedPage.strokes.length !== 1
  ) {
    throw new Error("Notebook persistence failed its round-trip check.");
  }

  const attempt = await requestJson(`${apiUrl}/api/attempts`, {
    method: "POST",
    body: JSON.stringify({
      questionId: lesson.question.id,
      response: "50 mA",
      mode: "coach",
    }),
  });
  if (attempt.correct !== true || attempt.independent !== true) {
    throw new Error("The numeric assessment runtime check failed.");
  }

  console.log(`Discere smoke test passed at ${webUrl}.`);
  console.log(
    "Verified redesigned routes, safe journey delivery and persistence, essay submission, review scheduling, visuals, writing gate, ChatGPT tutor validation, notebook persistence, and assessment.",
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  console.error(serverOutput());
  console.error(webOutput());
  process.exitCode = 1;
} finally {
  terminateProcessTree(server?.pid);
  terminateProcessTree(web?.pid);
  rmSync(tempRoot, { recursive: true, force: true });
}
