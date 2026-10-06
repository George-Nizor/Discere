/**
 * Remembers the lesson answer box the learner last used, so the calculator can put a result
 * into it. React owns those inputs, so the value is set through the native setter and an input
 * event, exactly as typing would.
 */
let target: HTMLInputElement | HTMLTextAreaElement | null = null;

function isAnswerField(element: EventTarget | null): element is HTMLInputElement | HTMLTextAreaElement {
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return false;
  if (element instanceof HTMLInputElement && !["text", "search", ""].includes(element.type)) return false;
  return Boolean(element.closest(".stage-canvas, .player-footer, .flashcard-screen, .check-screen"));
}

if (typeof document !== "undefined")
  document.addEventListener("focusin", (event) => {
    if (isAnswerField(event.target)) target = event.target;
  });

export function lastAnswerField() {
  return target?.isConnected && !target.disabled && !target.readOnly ? target : null;
}

export function insertIntoAnswer(value: string): boolean {
  const field = lastAnswerField();
  if (!field) return false;
  const prototype = field instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(field, value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.focus();
  return true;
}
