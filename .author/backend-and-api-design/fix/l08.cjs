const { load, save, setOpener, cutLead, makeChoice, step, q } = require("./lib.cjs");
const b = load();
const L = "pagination-and-filtering";
setOpener(
  b,
  L,
  "A list of 137 orders returned in a single response grows with every new order, and sooner or later it is too large to send before the client gives up. The usual remedy is to return the list in pages and to ask for each page by the position at which it begins: with pages of 25 the first begins at position 0 and the sixth at position 125. That position is called an **offset**, and the sixth page holds only 12 orders, since 137 is not a multiple of 25.",
  "An offset is exact only while the list stays still, and a list of orders does not. When a new order arrives at the front, every later row moves down one place, so a client that counts from the start may no longer begin where it left off. Working out how many pages a collection needs, and which rows a changing list repeats, shows you where offset paging goes wrong, and gives you the reason to page by the last key the client saw instead.",
);
for (const s of ["page-count", "predict-drift", "keyset-last", "tiebreaker"]) cutLead(b, L, s);

const pd = q(b, "bacad-pagination-and-filtering-predict-drift");
makeChoice(b, {
  id: "bacad-pagination-and-filtering-drift-effect",
  conceptIds: pd.conceptIds,
  prompt:
    "Ids 50 down to 41 are listed newest first. A client fetches page 1 with limit=4 and offset=0 and receives 50, 49, 48 and 47. Then ids 51, 52 and 53 are added at the top, and the client fetches page 2 with limit=4 and offset=4. What does page 2 contain?",
  difficulty: 1.3,
  hints: [
    "Write the new list from 53 downwards, and count four places from the top to find where page 2 begins.",
    "Compare what page 2 contains with 50, 49, 48 and 47.",
  ],
  sourceIds: pd.sourceIds,
  onCorrect:
    "The three new rows push everything down three places, so page 2 is 49, 48, 47 and 46, and three of its four rows were already on page 1.",
  skill: pd.skill,
  choices: [
    {
      id: "a",
      label: "Rows 46, 45, 44 and 43, which continue where page 1 stopped",
      why: "An offset counts from the top of the list as it is now, and the three new rows have moved everything down. Four places from the top is no longer the row after 47.",
    },
    {
      id: "b",
      label: "Mostly rows the client has already seen on page 1",
      correct: true,
    },
    {
      id: "c",
      label: "Mainly the three new rows, followed by one old row",
      why: "The new rows are at the top of the list, in places 0 to 2, and an offset of 4 skips past them. Page 2 begins at the fifth row from the top.",
    },
  ],
});
step(b, L, "predict-drift").checkQuestionId = "bacad-pagination-and-filtering-drift-effect";

// The answer key of practice-2 was wrong: seven new rows at the top put page 1 at positions 7 to 11
// and page 2 covers positions 5 to 9, so three rows repeat, not five.
const p2 = q(b, "bacad-pagination-and-filtering-practice-2");
p2.hints = [
  "Each added row shifts the list down by one place.",
  "Page 1's five rows now sit at positions 7 to 11, counting from 0, and page 2 covers positions 5 to 9.",
  "Count the places in 5 to 9 that page 1's rows occupy.",
];
p2.answerAuthority.value = 3;
p2.answerAuthority.workedAnswer =
  "The seven new rows take positions 0 to 6, and page 2 covers positions 5 to 9. Positions 5 and 6 are new rows, and positions 7, 8 and 9 are the first three rows of page 1, so 3 items repeat.";
p2.onCorrect =
  "Seven new rows push page 1 down to positions 7 to 11, and page 2 covers positions 5 to 9, so its last three items are the first three rows of page 1.";
p2.misconceptions = [
  {
    match: { numeric: [5] },
    feedback:
      "Page 2 covers positions 5 to 9 of the new list. Positions 5 and 6 are still new rows, so only the three after them come from page 1.",
  },
  {
    match: { numeric: [2] },
    feedback:
      "Two of page 2's items are the new rows at positions 5 and 6, but the other three are the first three rows of page 1.",
  },
  {
    match: { numeric: [7] },
    feedback: "Page 2 holds only five items, so no more than five can repeat.",
  },
];
save(b);
