import type { RomanReferenceAction, RomanReferenceProgress } from "@discere/contracts";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { updateRomanReferenceProgress } from "../api/endpoints.js";
import { queryKeys, useRomanReferenceProgress } from "../api/queries.js";

export const ROMAN_REFERENCE_COURSE_ID = "roman-empire";
export const ROMAN_REFERENCE_LESSON_ID = "rise-of-the-roman-empire";

const writeQueues = new WeakMap<QueryClient, Map<string, Promise<void>>>();

function queueKey(courseId: string, lessonId: string): string {
  return `${courseId}\u0000${lessonId}`;
}

function enqueueReferenceWrite<T>(
  queryClient: QueryClient,
  key: string,
  write: () => Promise<T>,
): Promise<T> {
  let clientQueues = writeQueues.get(queryClient);
  if (!clientQueues) {
    clientQueues = new Map();
    writeQueues.set(queryClient, clientQueues);
  }

  const operation = (clientQueues.get(key) ?? Promise.resolve()).then(write);
  const tail = operation.then(
    () => undefined,
    () => undefined,
  );
  clientQueues.set(key, tail);
  void tail.then(() => {
    if (clientQueues.get(key) !== tail) return;
    clientQueues.delete(key);
    if (clientQueues.size === 0) writeQueues.delete(queryClient);
  });
  return operation;
}

/**
 * Serialises rapid keyboard and timeline writes across route mounts that share a query client. A
 * slower response can therefore never replace newer local state, while the shared query cache
 * still gives every recovered route one source.
 */
export function useReferenceProgress() {
  const queryClient = useQueryClient();
  const query = useRomanReferenceProgress(ROMAN_REFERENCE_COURSE_ID, ROMAN_REFERENCE_LESSON_ID);

  const save = useCallback(
    (action: RomanReferenceAction): Promise<RomanReferenceProgress> => {
      return enqueueReferenceWrite(
        queryClient,
        queueKey(ROMAN_REFERENCE_COURSE_ID, ROMAN_REFERENCE_LESSON_ID),
        async () => {
          try {
            const progress = await updateRomanReferenceProgress(
              ROMAN_REFERENCE_COURSE_ID,
              ROMAN_REFERENCE_LESSON_ID,
              action,
            );
            queryClient.setQueryData(
              queryKeys.romanReferenceProgress(
                ROMAN_REFERENCE_COURSE_ID,
                ROMAN_REFERENCE_LESSON_ID,
              ),
              progress,
            );
            return progress;
          } catch (error) {
            void queryClient.invalidateQueries({
              queryKey: queryKeys.romanReferenceProgress(
                ROMAN_REFERENCE_COURSE_ID,
                ROMAN_REFERENCE_LESSON_ID,
              ),
            });
            throw error;
          }
        },
      );
    },
    [queryClient],
  );

  return { ...query, save };
}
