import type {
  CapabilitiesResponse,
  ActivityResponse,
  CourseDetailResponse,
  CourseListResponse,
  EssayDraftResponse,
  HomeResponse,
  JourneyProgress,
  JourneyResponse,
  ReviewHomeResponse,
  RomanReferenceProgress,
  TutorStatus,
  StudyStatisticsPeriod,
} from "@discere/contracts";
import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import {
  getCapabilities,
  getActivity,
  getCourseDetail,
  getCourses,
  getEssayDraft,
  getHome,
  getJourney,
  getJourneyProgress,
  getReviewHome,
  getRomanReferenceProgress,
  getTutorStatus,
  getStudy,
  getStudyStatistics,
  getStudyPreferences,
} from "./endpoints.js";

export const queryKeys = {
  home: ["home"] as const,
  courses: ["courses"] as const,
  course: (courseId: string) => ["course", courseId] as const,
  journey: (courseId: string, lessonId: string) => ["journey", courseId, lessonId] as const,
  journeyProgress: (courseId: string, lessonId: string) =>
    ["journey-progress", courseId, lessonId] as const,
  romanReferenceProgress: (courseId: string, lessonId: string) =>
    ["roman-reference-progress", courseId, lessonId] as const,
  essay: (essayId: string) => ["essay", essayId] as const,
  essayAssessment: (essayId: string) => ["essay-assessment", essayId] as const,
  notebook: (lessonId: string) => ["notebook", lessonId] as const,
  reviewHome: ["review-home"] as const,
  reviewSession: (sessionId: string) => ["review-session", sessionId] as const,
  capabilities: ["capabilities"] as const,
  tutorStatus: ["tutor-status"] as const,
  activity: ["progress-activity"] as const,
  study: ["study"] as const,
  studyStatistics: (period: StudyStatisticsPeriod) => ["study-statistics", period] as const,
  studyPreferences: ["study-preferences"] as const,
  lessonResult: (courseId: string, lessonId: string) =>
    ["lesson-result", courseId, lessonId] as const,
};

export function useStudy() {
  return useQuery({
    queryKey: queryKeys.study,
    queryFn: getStudy,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
export function useStudyStatistics(period: StudyStatisticsPeriod) {
  return useQuery({
    queryKey: queryKeys.studyStatistics(period),
    queryFn: () => getStudyStatistics(period),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}
export function useStudyPreferences() {
  return useQuery({
    queryKey: queryKeys.studyPreferences,
    queryFn: getStudyPreferences,
    staleTime: 60_000,
  });
}

export function useHome(): UseQueryResult<HomeResponse> {
  return useQuery({ queryKey: queryKeys.home, queryFn: getHome });
}

/** Cheap and file-backed on the server, so the settings screen may re-read it freely. */
/**
 * What this installation can generate. Asked once and cached for the session: it changes when the
 * owner installs or signs into the CLI, not while a learner is working.
 */
export function useCapabilities(): UseQueryResult<CapabilitiesResponse> {
  return useQuery({
    queryKey: queryKeys.capabilities,
    queryFn: getCapabilities,
    staleTime: 5 * 60_000,
  });
}

export function useTutorStatus(): UseQueryResult<TutorStatus> {
  return useQuery({ queryKey: queryKeys.tutorStatus, queryFn: getTutorStatus, staleTime: 5_000 });
}

export function useActivity(): UseQueryResult<ActivityResponse> {
  return useQuery({ queryKey: queryKeys.activity, queryFn: getActivity });
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

export function useRomanReferenceProgress(
  courseId: string,
  lessonId: string,
): UseQueryResult<RomanReferenceProgress> {
  return useQuery({
    queryKey: queryKeys.romanReferenceProgress(courseId, lessonId),
    queryFn: () => getRomanReferenceProgress(courseId, lessonId),
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
