/**
 * One review run, carried from card to card in session storage. `total` is the cards reviewed
 * so far plus those still due when this card opened, so it grows honestly if a card the learner
 * missed comes back during the run rather than pretending the run was fixed at the start.
 */
export interface ReviewRun {
  position: number;
  total: number;
  /** Cards rated in this run, including the current one once it is rated. */
  reviewed: number;
  /** Typed recalls the server marked, and how many of those were right. */
  checked: number;
  recalled: number;
  xp: number;
  /** Card ids already rated in this run, so a returning card can say so. */
  seen: string[];
  /** Started with nothing due: the learner chose to practise a card early. */
  practice: boolean;
}

const prefix = "discere:review-run:";
const EMPTY: Omit<ReviewRun, "position" | "total"> = {
  reviewed: 0,
  checked: 0,
  recalled: 0,
  xp: 0,
  seen: [],
  practice: false,
};

const count = (value: unknown): number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100_000
    ? value
    : 0;

export function readReviewRun(sessionId: string): ReviewRun {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(prefix + sessionId) ?? "null");
    if (value && typeof value === "object" && "position" in value && "total" in value) {
      const record = value as Record<string, unknown>;
      const { position, total } = record;
      if (
        typeof position === "number" &&
        typeof total === "number" &&
        Number.isInteger(position) &&
        Number.isInteger(total) &&
        position >= 1 &&
        position <= total &&
        total <= 10000
      )
        return {
          position,
          total,
          reviewed: count(record["reviewed"]),
          checked: count(record["checked"]),
          recalled: count(record["recalled"]),
          xp: count(record["xp"]),
          seen: Array.isArray(record["seen"])
            ? record["seen"].filter((id): id is string => typeof id === "string").slice(-500)
            : [],
          practice: record["practice"] === true,
        };
    }
  } catch {
    /* Storage may be unavailable; a direct card remains a one-card practice. */
  }
  return { position: 1, total: 1, ...EMPTY };
}

export function saveReviewRun(
  sessionId: string,
  run: Pick<ReviewRun, "position" | "total"> & Partial<ReviewRun>,
): void {
  try {
    sessionStorage.setItem(prefix + sessionId, JSON.stringify({ ...EMPTY, ...run }));
  } catch {
    /* Reviewing must remain possible without browser storage. */
  }
}

/** The run after one more card was rated. A card that came back counts again; it was reviewed again. */
export function recordRated(
  run: ReviewRun,
  cardId: string,
  outcome: { recalled: boolean | null; xp: number },
): ReviewRun {
  return {
    ...run,
    reviewed: run.reviewed + 1,
    checked: run.checked + (outcome.recalled === null ? 0 : 1),
    recalled: run.recalled + (outcome.recalled === true ? 1 : 0),
    xp: run.xp + Math.max(0, outcome.xp),
    seen: run.seen.includes(cardId) ? run.seen : [...run.seen, cardId],
  };
}
