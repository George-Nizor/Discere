import { describe, expect, it } from "vitest";
import {
  decodeOrderResponse,
  decodeSortResponse,
  encodeOrderResponse,
  encodeSortResponse,
  extractAttribution,
  LearnerQuestionSchema,
  learnerQuestion,
  ORDER_ANSWER_IDEA,
  orderAnswerIds,
  QuestionSchema,
  questionAnswerText,
  questionPlainText,
  SORT_ANSWER_IDEA,
  sortAnswerItems,
  structuredAnswerResponse,
} from "../src/index.js";

describe("permission-safe learner questions", () => {
  it("delivers an available hint count without any hint text or marking authority", () => {
    const original = QuestionSchema.parse({
      id: "q",
      conceptIds: ["counting"],
      prompt: "Find the value.",
      responseType: "numeric",
      difficulty: 1,
      hints: ["Secret first hint", "Secret later hint"],
      answerAuthority: {
        kind: "numeric",
        value: 42,
        unit: "",
        absoluteTolerance: 0,
        relativeTolerance: 0,
        workedAnswer: "The worked result is 42.",
      },
      sourceIds: [],
    });
    const delivered = learnerQuestion(original);
    expect(delivered).toMatchObject({ hintCount: 2, expectedUnit: "" });
    expect(delivered).not.toHaveProperty("hints");
    expect(delivered).not.toHaveProperty("answerAuthority");
    expect(delivered).not.toHaveProperty("transfer");
    expect(JSON.stringify(delivered)).not.toContain("Secret");
    expect(LearnerQuestionSchema.parse(delivered)).toEqual(delivered);
    expect(LearnerQuestionSchema.safeParse({ ...delivered, hints: original.hints }).success).toBe(
      false,
    );
  });
});

it("presents probability as a unitless learner input without disclosing its value", () => {
  const original = QuestionSchema.parse({
    id: "prob",
    conceptIds: ["probability"],
    prompt: "What is the probability?",
    responseType: "numeric",
    difficulty: 1,
    hints: [],
    sourceIds: [],
    answerAuthority: {
      kind: "numeric",
      value: 0.25,
      unit: "probability",
      absoluteTolerance: 1e-6,
      relativeTolerance: 0,
      workedAnswer: "One in four.",
    },
  });
  const delivered = learnerQuestion(original);
  expect(delivered.expectedUnit).toBe("");
  expect(delivered).not.toHaveProperty("answerAuthority");
  expect(JSON.stringify(delivered)).not.toContain("0.25");
});

describe("order questions, sort questions and extracts", () => {
  const base = {
    conceptIds: ["sequence"],
    difficulty: 1,
    hints: ["Which came first?"],
    sourceIds: ["s"],
  };
  const order = QuestionSchema.parse({
    ...base,
    id: "q-order",
    prompt: "In what order did these happen?",
    responseType: "order",
    order: { items: ["Alpha happens", "Beta happens", "Gamma happens", "Delta happens"] },
    answerAuthority: {
      kind: "text",
      acceptedIdeas: [ORDER_ANSWER_IDEA],
      rejectedIdeas: [],
      exampleAnswer: "Alpha comes before Beta because of the secret reason.",
    },
  });
  const sort = QuestionSchema.parse({
    ...base,
    id: "q-sort",
    prompt: "Which group does each belong in?",
    responseType: "sort",
    sort: {
      bins: [
        { id: "scalar", label: "Scalar" },
        { id: "vector", label: "Vector" },
      ],
      items: [
        { label: "Mass", bin: "scalar", explanation: "Mass has size only." },
        { label: "Speed", bin: "scalar" },
        { label: "Velocity", bin: "vector", explanation: "Velocity has a direction." },
        { label: "Force", bin: "vector" },
      ],
    },
    answerAuthority: {
      kind: "text",
      acceptedIdeas: [SORT_ANSWER_IDEA],
      rejectedIdeas: [],
      exampleAnswer: "Mass and speed are scalars, velocity and force are vectors.",
    },
  });

  it("delivers the items to order under ids and in an arrangement that tell nothing", () => {
    const delivered = learnerQuestion(order);
    expect(LearnerQuestionSchema.parse(delivered)).toEqual(delivered);
    const items = delivered.order?.items ?? [];
    expect(items.map((item) => item.label).sort()).toEqual([...order.order!.items].sort());
    // The arrangement is by id, and the ids come from the words, not from the places.
    expect(items.map((item) => item.id)).toEqual(items.map((item) => item.id).sort());
    expect(items.map((item) => item.label)).not.toEqual(order.order!.items);
    expect(JSON.stringify(delivered)).not.toContain("secret reason");
    expect(new Set(items.map((item) => item.id)).size).toBe(4);
    // The same question always travels under the same ids, so a saved answer still reads.
    expect(learnerQuestion(order)).toEqual(delivered);
    expect(orderAnswerIds(order).map((id) => items.find((item) => item.id === id)?.label)).toEqual(
      order.order!.items,
    );
  });

  it("delivers the items to sort without their bins or explanations", () => {
    const delivered = learnerQuestion(sort);
    expect(LearnerQuestionSchema.parse(delivered)).toEqual(delivered);
    expect(delivered.sort?.bins).toEqual(sort.sort!.bins);
    for (const item of delivered.sort?.items ?? [])
      expect(Object.keys(item).sort()).toEqual(["id", "label"]);
    expect(JSON.stringify(delivered)).not.toContain("direction");
    expect(JSON.stringify(delivered)).not.toContain("scalars");
    expect(
      LearnerQuestionSchema.safeParse({
        ...delivered,
        sort: { ...delivered.sort, items: sortAnswerItems(sort) },
      }).success,
    ).toBe(false);
  });

  it("reads an answer back from the string it was sent as", () => {
    const ids = orderAnswerIds(order);
    expect(decodeOrderResponse(encodeOrderResponse(ids))).toEqual(ids);
    expect(structuredAnswerResponse(order)).toBe(ids.join(","));
    const placed = Object.fromEntries(sortAnswerItems(sort).map((item) => [item.id, item.bin]));
    expect(decodeSortResponse(encodeSortResponse(placed))).toEqual(placed);
    expect(structuredAnswerResponse(sort)).toBe(encodeSortResponse(placed));
    expect(structuredAnswerResponse({ id: "plain" })).toBeUndefined();
  });

  it("keeps the old question shapes valid and bounds the new ones", () => {
    const { order: _order, ...withoutItems } = order;
    expect(QuestionSchema.safeParse({ ...withoutItems, responseType: "short_text" }).success).toBe(
      true,
    );
    expect(QuestionSchema.safeParse({ ...order, order: { items: ["One", "Two"] } }).success).toBe(
      false,
    );
    expect(
      QuestionSchema.safeParse({ ...sort, sort: { ...sort.sort, bins: [sort.sort!.bins[0]] } })
        .success,
    ).toBe(false);
    expect(
      QuestionSchema.safeParse({ ...order, extracts: [{ text: "Words", who: "A", when: "1" }] })
        .success,
    ).toBe(false);
  });

  it("writes a question out as plain text, with each extract under its attribution", () => {
    const pair = QuestionSchema.parse({
      ...base,
      id: "q-pair",
      prompt: "Two accounts of one day. Which account was written first?",
      responseType: "short_text",
      extracts: [
        { text: "I saw it happen.", who: "A soldier, letter", when: "1815", kind: "A private letter" },
        { text: "It is said to have happened.", who: "A monk, chronicle", when: "1850", kind: "A chronicle." },
      ],
      choices: [
        { id: "a", label: "Source A" },
        { id: "b", label: "Source B" },
      ],
      answerAuthority: {
        kind: "text",
        acceptedIdeas: ["Source A"],
        rejectedIdeas: [],
        exampleAnswer: "Source A",
      },
    });
    expect(extractAttribution(pair.extracts![0]!)).toBe("A soldier, letter, 1815. A private letter.");
    expect(extractAttribution(pair.extracts![1]!)).toBe("A monk, chronicle, 1850. A chronicle.");
    expect(questionPlainText(learnerQuestion(pair))).toBe(
      [
        "Two accounts of one day.",
        "Source A. A soldier, letter, 1815. A private letter.\nI saw it happen.",
        "Source B. A monk, chronicle, 1850. A chronicle.\nIt is said to have happened.",
        "Which account was written first?",
      ].join("\n\n"),
    );
    const spoken = questionPlainText(learnerQuestion(sort));
    expect(spoken).toContain("Groups: Scalar, Vector.");
    expect(spoken).toContain("Items to sort:");
    expect(spoken).not.toContain("direction");
    expect(questionPlainText(learnerQuestion(order))).toContain("Items to put in order:");
    // An older prompt keeps its quoted paragraph, read without the marks.
    expect(
      questionPlainText(
        learnerQuestion({ ...pair, extracts: undefined, prompt: "A line.\n\n> Quoted words.\n\nWhat is it?" }),
      ),
    ).toBe("A line.\n\nQuoted words.\n\nWhat is it?");
  });

  it("writes the answer out in words for a card's back and a requested reveal", () => {
    expect(questionAnswerText(order)).toBe(
      "1. Alpha happens\n2. Beta happens\n3. Gamma happens\n4. Delta happens\nAlpha comes before Beta because of the secret reason.",
    );
    expect(questionAnswerText(sort)).toBe(
      "Scalar: Mass; Speed\nVector: Velocity; Force\nMass and speed are scalars, velocity and force are vectors.",
    );
  });
});
