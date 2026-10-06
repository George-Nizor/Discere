import type { QueryClient } from "@tanstack/react-query";
import type { createBrowserRouter, RouteObject } from "react-router";
import {
  StudyStatisticsPeriodSchema,
  type JourneyResponse,
  type JourneyProgress,
} from "@discere/contracts";
import { redirect } from "react-router";
import { paths } from "../lib/paths.js";
import { resolveStageId } from "../journey/stage-machine.js";
import {
  getHome,
  getCourses,
  getCourseDetail,
  getJourney,
  getJourneyProgress,
  getStudy,
  getStudyStatistics,
  getStudyPreferences,
  getReviewHome,
  getCapabilities,
  getTutorStatus,
} from "../api/endpoints.js";
import { queryKeys } from "../api/queries.js";
import { reducedMotionEnabled } from "../study/experience.js";

const scrollPositions: Record<string, number> = {};
export const savedNavigationScroll = (key: string): number => scrollPositions[key] ?? 0;

export type NavigationScene = "page" | "course" | "period" | "filter" | "lesson";

export function navigationScene(from: URL, to: URL): NavigationScene {
  if (from.pathname === to.pathname) {
    if (to.pathname === "/" && from.searchParams.get("course") !== to.searchParams.get("course"))
      return "course";
    if (to.pathname === "/you") return "period";
    if (to.pathname === "/courses") return "filter";
  }
  const lesson = /^\/courses\/[^/]+\/lessons\/[^/]+/;
  if (
    from.pathname.match(lesson)?.[0] === to.pathname.match(lesson)?.[0] &&
    lesson.test(to.pathname)
  )
    return "lesson";
  return "page";
}

/** Fetch the destination's reading data before replacing its predecessor. No attempts or saves. */
export async function prepareNavigation(client: QueryClient, url: URL): Promise<void> {
  const ensure = <T>(queryKey: readonly string[], queryFn: () => Promise<T>) =>
    client.ensureQueryData({ queryKey, queryFn, retry: false });
  const tasks: Promise<unknown>[] = [];
  const pathname = url.pathname;
  if (pathname === "/") {
    tasks.push(
      (async () => {
        const [home, catalogue] = await Promise.all([
          ensure(queryKeys.home, getHome),
          ensure(queryKeys.courses, getCourses),
        ]);
        const courses = catalogue.courses
          .filter((course) => course.status === "available")
          .sort((left, right) => (right.lastActiveAt ?? "").localeCompare(left.lastActiveAt ?? ""));
        const selected =
          courses.find((course) => course.id === url.searchParams.get("course")) ??
          courses.find((course) => course.id === home.currentMission.courseId) ??
          courses[0];
        if (!selected) return;
        const detail = await ensure(queryKeys.course(selected.id), () =>
          getCourseDetail(selected.id),
        );
        const lesson =
          detail.lessons.find((item) => item.id === detail.resumeLessonId) ??
          detail.lessons.find(
            (item) => item.id === home.currentMission.lessonBeatId && item.available,
          ) ??
          detail.lessons.find((item) => item.available && !item.completed) ??
          detail.lessons.find((item) => item.available);
        if (lesson)
          await ensure(queryKeys.journeyProgress(selected.id, lesson.id), () =>
            getJourneyProgress(selected.id, lesson.id),
          );
      })(),
      ensure(queryKeys.study, getStudy),
    );
  } else if (pathname === "/courses") {
    tasks.push(ensure(queryKeys.courses, getCourses));
  } else if (pathname === "/you") {
    const parsed = StudyStatisticsPeriodSchema.safeParse(url.searchParams.get("period") ?? "all");
    const period = parsed.success ? parsed.data : "all";
    tasks.push(
      ensure(queryKeys.home, getHome),
      ensure(queryKeys.courses, getCourses),
      ensure(queryKeys.study, getStudy),
      ensure(queryKeys.studyStatistics(period), () => getStudyStatistics(period)),
    );
  } else if (pathname === "/settings") {
    tasks.push(
      ensure(queryKeys.studyPreferences, getStudyPreferences),
      ensure(queryKeys.capabilities, getCapabilities),
      ensure(queryKeys.tutorStatus, getTutorStatus),
    );
  } else if (pathname === "/review") {
    tasks.push(ensure(queryKeys.reviewHome, getReviewHome));
  } else {
    const match = pathname.match(/^\/courses\/([^/]+)(?:\/lessons\/([^/]+)(?:\/stages\/[^/]+)?)?$/);
    if (match?.[1] && match[1] !== "roman-empire") {
      const courseId = decodeURIComponent(match[1]);
      tasks.push(ensure(queryKeys.course(courseId), () => getCourseDetail(courseId)));
      if (match[2]) {
        const lessonId = decodeURIComponent(match[2]);
        tasks.push(
          ensure(queryKeys.journey(courseId, lessonId), () => getJourney(courseId, lessonId)),
          ensure(queryKeys.journeyProgress(courseId, lessonId), () =>
            getJourneyProgress(courseId, lessonId),
          ),
        );
      }
    }
  }
  // Screens own failure/retry UI. A stalled service cannot hold navigation indefinitely.
  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.allSettled(tasks),
      new Promise<void>((resolve) => {
        deadline = setTimeout(resolve, 1_000);
      }),
    ]);
  } finally {
    clearTimeout(deadline);
  }
}

export function withNavigationData(routes: RouteObject[], client: QueryClient): RouteObject[] {
  return routes.map(
    (route): RouteObject =>
      route.children
        ? { ...route, children: withNavigationData(route.children, client) }
        : route.loader
          ? route // A route with its own loader (a redirect) needs no destination data.
          : {
              ...route,
              shouldRevalidate: ({ currentUrl, nextUrl, defaultShouldRevalidate }) =>
                currentUrl.pathname === "/courses" && nextUrl.pathname === "/courses"
                  ? false
                  : defaultShouldRevalidate,
              loader: async ({ request }) => {
                const url = new URL(request.url);
                await prepareNavigation(client, url);
                const lesson = url.pathname.match(
                  /^\/courses\/([^/]+)\/lessons\/([^/]+)(?:\/stages\/([^/]+))?$/,
                );
                if (lesson?.[1] && lesson[2] && lesson[1] !== "roman-empire") {
                  const courseId = decodeURIComponent(lesson[1]),
                    lessonId = decodeURIComponent(lesson[2]);
                  const journey = client.getQueryData<JourneyResponse>(
                    queryKeys.journey(courseId, lessonId),
                  );
                  const progress = client.getQueryData<JourneyProgress>(
                    queryKeys.journeyProgress(courseId, lessonId),
                  );
                  const requested = lesson[3] ? decodeURIComponent(lesson[3]) : undefined;
                  if (journey && progress) {
                    const stageId = resolveStageId(journey, progress, requested);
                    if (stageId && stageId !== requested)
                      return redirect(
                        paths.stage(courseId, lessonId, stageId) + url.search + url.hash,
                      );
                  }
                }
                return null;
              },
            },
  );
}

/** One policy for links, shortcuts, programmatic moves and Router's recorded back/forward transitions. */
export function installNavigationMotion(router: ReturnType<typeof createBrowserRouter>): void {
  const navigate = router.navigate.bind(router);
  window.history.scrollRestoration = "manual";
  // Save before the old DOM is replaced, rather than capturing a clamped scroll event afterwards.
  router.enableScrollRestoration(scrollPositions, () => window.scrollY);
  router.navigate = (
    to: Parameters<typeof navigate>[0] | number,
    options?: Parameters<typeof navigate>[1],
  ) => {
    if (typeof to === "number") return navigate(to);
    const current = new URL(
      router.state.location.pathname + router.state.location.search,
      location.origin,
    );
    const target =
      typeof to === "string"
        ? new URL(to, current)
        : new URL((to?.pathname ?? current.pathname) + (to?.search ?? ""), current);
    const scene = navigationScene(current, target);
    document.documentElement.dataset["navigation"] = scene;
    // Search typing stays synchronous; filtering animates its results, never the text caret.
    const typing =
      target.pathname === "/courses" &&
      current.pathname === target.pathname &&
      current.searchParams.get("q") !== target.searchParams.get("q");
    return navigate(to, {
      ...options,
      // Query-only controls commit immediately; filter results animate locally so a
      // pending native snapshot cannot overwrite a newer controlled input.
      flushSync: true,
      viewTransition:
        typeof document.startViewTransition === "function" &&
        scene !== "filter" &&
        !typing &&
        !reducedMotionEnabled(),
    });
  };
  router.subscribe((state) => {
    if (state.navigation.location) {
      const from = new URL(state.location.pathname + state.location.search, location.origin);
      const to = new URL(
        state.navigation.location.pathname + state.navigation.location.search,
        location.origin,
      );
      document.documentElement.dataset["navigation"] = navigationScene(from, to);
    }
  });
  document.documentElement.dataset["viewTransitions"] =
    typeof document.startViewTransition === "function" ? "native" : "fallback";
}
