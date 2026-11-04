const { load, save, setHook, clearLead, toChoice } = require("./lib.cjs");
const b = load();
const L = "packages-versions-and-tests";

setHook(b, L, [
  "A dependency listed in package.json as ^1.4.2 is a request for 1.4.2 or anything later in the 1.x series, so a library that publishes 1.5.0 a few days after 1.4.2 may arrive on your machine without anyone having chosen it. Whether it does depends on two small pieces of notation, the range and the lockfile, and on a promise from the library's author about what the middle number of a version means.",
  "A program that installs the wrong version fails in a way that its source code does not explain, so being able to read a version, a range and a lockfile tells you which code a program will really run, and it is the first thing to establish when a program works on one machine and fails on another. A test file, which Node can run without extra tools, then shows whether the version you got still does what you relied on.",
]);

for (const s of [
  "predict-the-newer",
  "bump-the-minor",
  "check-the-caret",
  "name-the-command",
  "count-failing-tests",
  "choose-the-bump",
])
  clearLead(b, L, s);

toChoice(b, "typn-packages-versions-and-tests-predict-newer", {
  prompt: "Two versions of a library exist, 1.9.0 and 1.10.0. Which is the newer?",
  options: [
    "1.9.0, because as text it sorts after 1.10.0.",
    "1.10.0, because 10 is greater than 9.",
    "They are the same version.",
    "It cannot be said without the release dates.",
  ],
  correct: 1,
  misconceptions: {
    0: "Sorting as text would put 1.10.0 first, since the character 1 comes before 9, but versions are compared as numbers, one part at a time.",
    2: "The minor parts differ, and the first part that differs decides which version is newer.",
    3: "The order of versions follows from their numbers, one part at a time from the left, and needs no dates.",
  },
  onCorrect: "The parts are compared as numbers from the left, and the first one that differs decides, so 10 beats 9.",
  hints: ["Compare the parts one at a time from the left.", "Compare 9 and 10 as numbers, not as text."],
});

toChoice(b, "typn-packages-versions-and-tests-count-caret", {
  prompt:
    "The range is ^1.2.3, and npm is offered 2.0.0, 1.2.3-beta.1, 1.2.2 and 1.2.9. Which of these can it install?",
  options: ["2.0.0", "1.2.3-beta.1", "1.2.2", "1.2.9"],
  correct: 3,
  misconceptions: {
    0: "The caret stops before the next major version, so 2.0.0 is the first version it excludes.",
    1: "A prerelease is older than the version it leads to, and ranges leave prereleases out unless they name one.",
    2: "The range starts at 1.2.3, so a version below it is too old.",
  },
  onCorrect:
    "It is above the lower end, below 2.0.0 and not a prerelease, which makes it the one version that the range accepts.",
  hints: ["Write the lower and upper ends of the range.", "Prereleases are left out unless the range names one."],
});

toChoice(b, "typn-packages-versions-and-tests-count-failures", {
  prompt:
    'A test file uses node:assert/strict. Which of these assertions throws?',
  options: [
    "assert.strictEqual(1 + 1, 2)",
    "assert.deepStrictEqual({ a: 1 }, { a: 1 })",
    'assert.strictEqual("5", 5)',
    "assert.strictEqual(0.5 + 0.5, 1)",
  ],
  correct: 2,
  misconceptions: {
    0: "The sum is 2 and the expected value is 2, so the comparison with === holds.",
    1: "deepStrictEqual compares the contents of the two objects, which are the same, and not whether they are the same object.",
    3: "The sum is exactly 1, so the comparison with === holds.",
  },
  onCorrect:
    "strictEqual compares with ===, which does not convert between types, so the string and the number are different values and the assertion throws.",
  hints: ["strictEqual compares with ===.", "Check each pair for a difference of type."],
});

toChoice(b, "typn-packages-versions-and-tests-check-tilde", {
  prompt: "The range is ~2.4.1. Which of these versions does it accept?",
  options: ["2.5.0", "3.0.0", "2.4.9", "2.4.0"],
  correct: 2,
  misconceptions: {
    0: "The tilde allows patch changes only, so it stops before 2.5.0.",
    1: "The tilde stops before the next minor version, which is far below the next major.",
    3: "The range starts at 2.4.1, so a version below it is too old.",
  },
  onCorrect: "The tilde accepts the stated version and later patch versions, up to but not including 2.5.0.",
  hints: ["Write the lower and upper ends of the range.", "~2.4.1 allows patch changes only."],
});

save(b);
