import { describe, expect, it } from "vitest";
import { smallTalkReply } from "../src/small-talk.js";

describe("small talk", () => {
  it("answers a greeting or a thank-you without the model", () => {
    for (const text of [
      "hi",
      "Hello",
      "hey there!",
      "G'day",
      "good morning",
      "thanks",
      "Thank you so much!",
      "ok",
    ])
      expect(smallTalkReply(text), text).not.toBeNull();
  });

  it("leaves anything with a question in it to the tutor", () => {
    for (const text of [
      "hi, what does x mean?",
      "hello why is it 4",
      "thanks but I still don't get step 2",
      "x",
    ])
      expect(smallTalkReply(text), text).toBeNull();
  });
});
