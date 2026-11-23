import type { TutorReplyDraft } from "@discere/contracts";

/**
 * A greeting or a thank-you is answered here, without the model.
 *
 * Given "hi", a small local model tends to solve the lesson's question instead, and the answer
 * check then withholds the reply: the learner says hello and gets an error. A larger model wastes
 * a call on it. Only a message that is nothing but small talk is caught; anything with a question
 * in it goes to the tutor as usual.
 */
const GREETING =
  /^(hi|hello|hey|hiya|howdy|g'?day|good (morning|afternoon|evening)|yo)\b[\s,!.]*(there|tutor)?[\s!.]*$/i;
const THANKS =
  /^(thanks|thank you|thx|cheers|ta|great|ok|okay|cool|got it|nice)\b[\s,!.]*(so much|a lot|tutor)?[\s!.]*$/i;

export function smallTalkReply(question: string): TutorReplyDraft | null {
  const text = question.trim();
  if (GREETING.test(text))
    return {
      answer:
        "Hello. Ask me about anything on this screen, such as a step that doesn't make sense.",
      followUpQuestion: "What would you like to look at first?",
      sourceIds: [],
      uncertainty: [],
    };
  if (THANKS.test(text))
    return {
      answer: "You're welcome.",
      followUpQuestion: "Is there anything else on this screen you'd like to go over?",
      sourceIds: [],
      uncertainty: [],
    };
  return null;
}
