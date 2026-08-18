import type {
  CourseDetailResponse,
  CourseListResponse,
  EssayDraftResponse,
  HomeResponse,
  JourneyProgress,
  JourneyResponse,
  ReviewHomeResponse,
} from "@discere/contracts";
import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import {
  getCourseDetail,
  getCourses,
  getEssayDraft,
  getHome,
  getJourney,
  getJourneyProgress,
  getReviewHome,
} from "./endpoints.js";

export const queryKeys = {
  home: ["home"] as const,
  courses: ["courses"] as const,
  course: (courseId: string) => ["course", courseId] as const,
  journey: (courseId: string, lessonId: string) => ["journey", courseId, lessonId] as const,
  journeyProgress: (courseId: string, lessonId: string) =>
    ["journey-progress", courseId, lessonId] as const,
  essay: (essayId: string) => ["essay", essayId] as const,
  essayAssessment: (essayId: string) => ["essay-assessment", essayId] as const,
  reviewHome: ["review-home"] as const,
  reviewSession: (sessionId: string) => ["review-session", sessionId] as const,
};

export function useHome(): UseQueryResult<HomeResponse> {
  return useQuery({ queryKey: queryKeys.home, queryFn: getHome });
}

export function useCourses(): UseQueryResult<CourseListResponse> {
  return useQuery({ queryKey: queryKeys.courses, queryFn: getCourses });
}

export function useCourse(courseId: string): UseQueryResult<CourseDetailResponse> {
  return useQuery({
    queryKey: queryKeys.course(courseId),
    queryFn: () => getCourseDetail(courseId),
  });
}

export function useJourney(courseId: string, lessonId: string): UseQueryResult<JourneyResponse> {
  return useQuery({
    queryKey: queryKeys.journey(courseId, lessonId),
    queryFn: () => getJourney(courseId, lessonId),
  });
}

export function useJourneyProgress(
  courseId: string,
  lessonId: string,
): UseQueryResult<JourneyProgress> {
  return useQuery({
    queryKey: queryKeys.journeyProgress(courseId, lessonId),
    queryFn: () => getJourneyProgress(courseId, lessonId),
  });
}

export function useReviewHome(): UseQueryResult<ReviewHomeResponse> {
  return useQuery({ queryKey: queryKeys.reviewHome, queryFn: getReviewHome });
}

export function useEssayDraft(essayId: string): UseQueryResult<EssayDraftResponse> {
  return useQuery({
    queryKey: queryKeys.essay(essayId),
    queryFn: () => getEssayDraft(essayId),
    staleTime: 0,
  });
}
