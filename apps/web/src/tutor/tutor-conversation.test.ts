import { describe, expect, it } from "vitest";
import {
  loadTutorConversation,
  saveTutorConversation,
  type TutorConversation,
  tutorConversationStorageKey,
} from "./tutor-conversation.js";

const conversation: TutorConversation = {
  exchanges: [
    {
      question: "How should I begin?",
      reply: {
        answer: "Start from the relationship.",
        followUpQuestion: "Which values are given?",
        sourceIds: [],
        uncertainty: [],
      },
      issues: [],
      accepted: true,
    },
  ],
  sessionId: "session-1",
  sessionContext: "turning-points:coach",
};

describe("tutor conversation storage", () => {
  it("round-trips validated history inside its lesson boundary", () => {
    saveTutorConversation("lesson-a", conversation);

    expect(loadTutorConversation("lesson-a")).toEqual(conversation);
    expect(loadTutorConversation("lesson-b")).toEqual({
      exchanges: [],
      sessionId: null,
      sessionContext: null,
    });
  });

  it("discards malformed browser data instead of resuming its session", () => {
    const key = tutorConversationStorageKey("lesson-a");
    window.localStorage.setItem(
      key,
      JSON.stringify({ version: 1, exchanges: [], sessionId: { unsafe: true } }),
    );

    expect(loadTutorConversation("lesson-a")).toEqual({
      exchanges: [],
      sessionId: null,
      sessionContext: null,
    });
    expect(window.localStorage.getItem(key)).toBeNull();
  });
});
