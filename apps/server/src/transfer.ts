import { randomUUID } from "node:crypto";
import { assessNumericAnswer } from "@discere/assessment-engine";
import type { Question, TransferChallenge, TransferSubmitResponse } from "@discere/contracts";
import { scoreAttempt, updateMastery } from "@discere/progression-engine";
import type Database from "better-sqlite3";
import type { DiscereStore } from "./db/store.js";

const LOCAL_USER_ID = "local-user";

/** The changed case a question carries, presented as the learner-safe challenge record. */
export function transferChallengeFor(question: Question): TransferChallenge | null {
  const transfer = question.transfer;
  if (!transfer) return null;
  return {
    id: transfer.id,
    prompt: transfer.prompt,
    responseType: "numeric",
    expectedUnit: transfer.expectedUnit,
  };
}

interface TransferRow {
  attemptId: string;
  transferId: string;
  response: string;
  correct: number;
  feedback: string;
  xpAwarded: number;
  mastery: number;
  createdAt: string;
  updatedAt: string;
}

export interface TransferRecord {
  attemptId: string;
  transferId: string;
  response: string;
  correct: boolean;
  feedback: string;
  xpAwarded: number;
  mastery: number;
  createdAt: string;
  updatedAt: string;
}

export function getTransferRecord(
  database: Database.Database,
  attemptId: string,
): TransferRecord | null {
  const row = database
    .prepare(
      "SELECT attempt_id AS attemptId, transfer_id AS transferId, response, correct, feedback, xp_awarded AS xpAwarded, mastery, created_at AS createdAt, updated_at AS updatedAt FROM transfer_attempts WHERE attempt_id = ?",
    )
    .get(attemptId) as TransferRow | undefined;
  if (!row) return null;
  return { ...row, correct: row.correct === 1 };
}

function feedbackFor(response: string, question: Question): { correct: boolean; feedback: string } {
  const transfer = question.transfer;
  if (!transfer) throw new Error(`Question '${question.id}' has no transfer challenge.`);
  const assessment = assessNumericAnswer(response, {
    value: transfer.value,
    unit: transfer.expectedUnit,
    absoluteTolerance: transfer.absoluteTolerance,
    relativeTolerance: transfer.relativeTolerance,
  });
  if (assessment.correct) {
    return {
      correct: true,
      feedback:
        "The transfer calculation is correct. You applied the same relationship to new values.",
    };
  }
  if (assessment.error === "unreadable") {
    return {
      correct: false,
      feedback: `Enter one numerical value with its unit, in ${transfer.expectedUnit}.`,
    };
  }
  if (assessment.error === "unit_mismatch") {
    return {
      correct: false,
      feedback: `The unit does not match the quantity asked for. Answer in ${transfer.expectedUnit}.`,
    };
  }
  return {
    correct: false,
    feedback: "Apply the same relationship to the new values, then check the arithmetic.",
  };
}

function minimumMastery(store: DiscereStore, conceptIds: string[]): number {
  if (conceptIds.length === 0) return 0;
  return Math.min(...conceptIds.map((conceptId) => store.getMastery(conceptId)));
}

export function saveTransferResponse(input: {
  store: DiscereStore;
  attemptId: string;
  response: string;
  question: Question;
}): TransferSubmitResponse {
  const { store, attemptId, response, question } = input;
  const attempt = store.getAttempt(attemptId);
  if (!attempt) throw new Error("Attempt not found.");
  const existing = getTransferRecord(store.database, attemptId);
  if (existing?.correct) throw new Error("Transfer challenge is already complete.");

  const assessment = feedbackFor(response, question);
  const timestamp = new Date().toISOString();
  let xpAwarded = 0;
  let mastery = minimumMastery(store, question.conceptIds);
  let conceptMastery: Record<string, number> = {};

  if (assessment.correct) {
    const evidence = scoreAttempt({
      correct: true,
      mode: attempt.mode,
      hintsUsed: attempt.hintCount,
      answerRevealed: true,
      transferCorrect: true,
      difficulty: 1,
    });
    xpAwarded = Math.max(5, Math.round(evidence.xp * 0.5));
    conceptMastery = Object.fromEntries(
      question.conceptIds.map((conceptId) => [
        conceptId,
        updateMastery(store.getMastery(conceptId), evidence.masteryEvidence, 0.22),
      ]),
    );
    const values = Object.values(conceptMastery);
    mastery = values.length === 0 ? 0 : Math.min(...values);
  }

  const transferId = question.transfer?.id ?? "";
  const transaction = store.database.transaction(() => {
    store.database
      .prepare(`
        INSERT INTO transfer_attempts (
          attempt_id, transfer_id, response, correct, feedback, xp_awarded, mastery, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(attempt_id) DO UPDATE SET
          transfer_id = excluded.transfer_id,
          response = excluded.response,
          correct = excluded.correct,
          feedback = excluded.feedback,
          xp_awarded = excluded.xp_awarded,
          mastery = excluded.mastery,
          updated_at = excluded.updated_at
      `)
      .run(
        attemptId,
        transferId,
        response,
        assessment.correct ? 1 : 0,
        assessment.feedback,
        xpAwarded,
        mastery,
        existing?.createdAt ?? timestamp,
        timestamp,
      );

    if (!assessment.correct) return;
    store.database
      .prepare("UPDATE user_profiles SET xp = xp + ?, updated_at = ? WHERE id = ?")
      .run(xpAwarded, timestamp, LOCAL_USER_ID);
    for (const conceptId of question.conceptIds) {
      const nextMastery = conceptMastery[conceptId];
      if (nextMastery === undefined) {
        throw new Error(`Missing transfer mastery for concept '${conceptId}'.`);
      }
      store.database
        .prepare(`
          UPDATE concept_progress
          SET mastery = ?,
              state = CASE
                WHEN ? >= 0.85 THEN 'mastered'
                WHEN ? >= 0.55 THEN 'practised'
                ELSE 'discovered'
              END,
              assisted_attempts = assisted_attempts + 1,
              updated_at = ?
          WHERE user_id = ? AND concept_id = ?
        `)
        .run(nextMastery, nextMastery, nextMastery, timestamp, LOCAL_USER_ID, conceptId);
    }
    store.database
      .prepare(
        "INSERT INTO assistance_events (id, attempt_id, type, detail, created_at) VALUES (?, ?, 'transfer_recovery', ?, ?)",
      )
      .run(randomUUID(), attemptId, transferId, timestamp);
  });
  transaction();

  return {
    correct: assessment.correct,
    feedback: assessment.feedback,
    xpAwarded,
    mastery,
    completed: assessment.correct,
  };
}
