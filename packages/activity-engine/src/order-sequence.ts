import type { OrderSequenceActivity } from "@discere/contracts";

export interface OrderSequenceOutcome {
  correct: boolean;
  /**
   * The first item that is not where it belongs. Naming one place to look is more useful than
   * marking every position that shifted because of a single mistake.
   */
  firstMisplacedId: string;
  explanation: string;
}

export function evaluateOrderSequence(
  activity: OrderSequenceActivity,
  order: readonly string[],
): OrderSequenceOutcome {
  const expected = activity.correctOrder;
  const firstMisplacedIndex = expected.findIndex((id, index) => order[index] !== id);
  const correct = firstMisplacedIndex === -1 && order.length === expected.length;
  const misplaced = correct ? "" : (order[firstMisplacedIndex] ?? expected[firstMisplacedIndex] ?? "");
  if (correct) {
    return { correct: true, firstMisplacedId: "", explanation: activity.feedback.correct };
  }
  const label = activity.items.find((item) => item.id === misplaced)?.label;
  return {
    correct: false,
    firstMisplacedId: misplaced,
    explanation: label
      ? `${activity.feedback.incorrect} Start by looking at "${label}".`
      : activity.feedback.incorrect,
  };
}

/** Moves one item by `delta` places, clamped so an item never falls off either end. */
export function moveInOrder(
  order: readonly string[],
  itemId: string,
  delta: number,
): string[] {
  const from = order.indexOf(itemId);
  if (from === -1) return [...order];
  const to = Math.max(0, Math.min(order.length - 1, from + delta));
  if (to === from) return [...order];
  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, itemId);
  return next;
}

export function orderSequenceIssues(activity: OrderSequenceActivity): string[] {
  const issues: string[] = [];
  const itemIds = new Set(activity.items.map((item) => item.id));
  if (itemIds.size !== activity.items.length) issues.push("Two items share an identifier.");
  if (activity.correctOrder.length !== activity.items.length) {
    issues.push("The correct order must list every item exactly once.");
  }
  for (const id of activity.correctOrder) {
    if (!itemIds.has(id)) issues.push(`The correct order names '${id}', which is not an item.`);
  }
  if (new Set(activity.correctOrder).size !== activity.correctOrder.length) {
    issues.push("The correct order lists an item more than once.");
  }
  return issues;
}
