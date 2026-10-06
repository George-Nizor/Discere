import { authors, statements, table } from "../../_authoring/course-checks.js";
const {
  numeric: n,
  choice: c,
  sets,
} = authors("logic-and-reasoning", [
  {
    id: "what-logic-operates-on",
    conceptIds: ["statement"],
    sourceIds: ["forallx-ch1", "forallx-ch5"],
  },
  {
    id: "if-then-claims",
    conceptIds: ["conditional", "truth-table"],
    sourceIds: ["forallx-ch5", "forallx-ch9"],
  },
  {
    id: "converse-and-contrapositive",
    conceptIds: ["conditional", "negation-and-converse"],
    sourceIds: ["forallx-ch5", "forallx-ch12"],
  },
  {
    id: "knights-and-knaves",
    conceptIds: ["statement", "truth-table"],
    sourceIds: ["forallx-ch9", "forallx-ch12"],
  },
  {
    id: "building-a-truth-table",
    conceptIds: ["truth-table", "conditional"],
    sourceIds: ["forallx-ch11", "forallx-ch9", "forallx-ch12"],
  },
  {
    id: "finding-the-conclusion",
    conceptIds: ["premise-and-conclusion"],
    sourceIds: ["forallx-ch1", "forallx-ch2"],
  },
  {
    id: "valid-but-untrue",
    conceptIds: ["validity-and-soundness", "premise-and-conclusion"],
    sourceIds: ["forallx-ch2", "forallx-ch12"],
  },
  {
    id: "naming-the-fallacies",
    conceptIds: ["fallacy", "conditional", "validity-and-soundness"],
    sourceIds: ["forallx-ch2", "forallx-ch12", "forallx-ch5"],
  },
]);
const truthRows = table(
  ["p", "q"],
  [
    ["true", "true"],
    ["true", "false"],
    ["false", "true"],
    ["false", "false"],
  ],
);
export const logicCourseChecks = sets(
  [
    c(
      0,
      "Which notice can be true or false?",
      statements("Three notices", [
        "The last train left at 8 pm.",
        "Please stand back.",
        "Has the last train left?",
      ]),
      ["Notice A", "Notice B", "Notice C"],
      0,
      "Notice A asserts that an event happened at a stated time. B directs an action; C asks a question.",
    ),
    c(
      1,
      "The rule says every reserved seat has a card. Which observation breaks it?",
      table(
        ["Seat", "Reserved?", "Card?"],
        [
          ["A", "yes", "yes"],
          ["B", "yes", "no"],
          ["C", "no", "yes"],
          ["D", "no", "no"],
        ],
      ),
      ["Seat C", "Seat A", "Seat B", "Seat D"],
      2,
      "Seat B has a true starting condition and a false required result: it is reserved but has no card.",
    ),
    c(
      2,
      "Which statement is the contrapositive of the backup rule?",
      statements("Rule", ["If the backup completed, a log was recorded."]),
      [
        "If a log was recorded, the backup completed.",
        "If no log was recorded, the backup did not complete.",
        "If the backup did not complete, no log was recorded.",
      ],
      1,
      "Reverse the direction and negate both claims: no recorded log implies no completed backup, assuming the original rule.",
    ),
    c(
      3,
      "Knights always tell the truth and knaves always lie. Which types fit both speakers?",
      statements("Two speakers", ["Nia: Omar is a knight.", "Omar: We are the same type."]),
      [
        "Both are knaves",
        "Nia is a knight; Omar is a knave",
        "Both are knights",
        "Nia is a knave; Omar is a knight",
      ],
      2,
      "Nia's statement requires the same type for both. Omar's statement is therefore true, so Omar is a knight and Nia is too.",
    ),
    n(
      4,
      "How many rows make (p OR q) AND NOT p true? OR is inclusive.",
      truthRows,
      1,
      "NOT p excludes the two rows with p true. Of the remaining rows, p OR q is true only when q is true: one row.",
    ),
    c(
      5,
      "Which claim is this passage trying to establish?",
      statements("Passage", [
        "The museum is closed, because today is Monday and the museum closes every Monday.",
      ]),
      ["Today is Monday.", "The museum closes every Monday.", "The museum is closed."],
      2,
      "The two claims after 'because' are offered as support for the claim that the museum is closed.",
    ),
    c(
      6,
      "How should this argument be classified?",
      statements(
        "Argument",
        ["If 9 is even, 9 is divisible by 2.", "9 is even."],
        "9 is divisible by 2.",
      ),
      ["Valid and sound", "Valid but unsound", "Invalid because the conclusion is false"],
      1,
      "Its form is p implies q; p; therefore q, which is valid. The premise that 9 is even is false, so the argument is unsound.",
    ),
    c(
      7,
      "What is the gap in this argument?",
      statements(
        "Network claim",
        ["If the router is offline, the page fails to load.", "The router is online."],
        "The page loads.",
      ),
      [
        "An online router guarantees every page loads.",
        "A different fault could still prevent loading.",
        "The first premise says the router is offline.",
      ],
      1,
      "This denies the antecedent. A true conditional allows an online router and a failed page; another fault can prevent loading.",
    ),
  ],
  [
    c(
      2,
      "Assume the rule is true. A certificate was not issued. What follows?",
      statements("Registration", [
        "If a project passed the audit, it received a certificate.",
        "This project received no certificate.",
      ]),
      [
        "It passed the audit.",
        "It did not pass the audit.",
        "Every uncertified project was never audited.",
      ],
      1,
      "If it had passed, it would have received a certificate. The missing certificate therefore rules out passing, but says nothing about whether an audit happened.",
    ),
    n(
      4,
      "Across all four rows, how many make NOT (p AND q) true?",
      truthRows,
      3,
      "The conjunction is true only in the true–true row. Negating it makes each of the other three rows true.",
    ),
    c(
      0,
      "A sealed envelope contains a number. You have not opened it. How should you treat notice A?",
      statements("Envelope", ["The number inside is greater than 20."]),
      [
        "It is a claim whose truth is currently unknown to you.",
        "It has no truth value until someone opens the envelope.",
        "It is a command to choose a larger number.",
      ],
      0,
      "The notice asserts something about a fixed number. Not knowing whether it is true does not turn it into a command or remove its classical truth value.",
    ),
    c(
      7,
      "Which change repairs the inference while keeping its first premise?",
      statements(
        "Access rule",
        ["If a badge is active, the gate opens.", "The gate opens."],
        "The badge is active.",
      ),
      [
        "Keep the second premise; all effects have one cause.",
        "Replace the second premise with 'The gate does not open' and conclude 'The badge is not active'.",
        "Replace the second premise with 'The badge is not active' and conclude 'The gate does not open'.",
      ],
      1,
      "With the gate closed, an active badge would contradict the first premise. That repair uses the contrapositive; the other proposed patterns do not rule out other causes.",
    ),
    n(
      3,
      "Knights tell the truth and knaves lie. How many type assignments satisfy both statements?",
      statements("Different reports", ["Ivo: Mara is a knave.", "Mara: Ivo is a knave."]),
      2,
      "Exactly one speaker must be a knight. Ivo knight with Mara knave works, and the reverse works. Both-knight and both-knave assignments contradict their statements.",
    ),
    c(
      6,
      "Which assignment is a counterexample to this argument?",
      statements("Test the guarantee", ["p implies q.", "q is true."], "p is true."),
      ["p true, q true", "p true, q false", "p false, q true", "p false, q false"],
      2,
      "When p is false and q is true, both premises are true and the conclusion p is false. One such assignment refutes validity.",
    ),
    c(
      5,
      "Which sentence supplies the conclusion, even though it appears first?",
      statements("Explanation", [
        "The sample is in cabinet 4: it is either in cabinet 4 or cabinet 9, and cabinet 9 is empty.",
      ]),
      [
        "Cabinet 4 contains the sample.",
        "The sample is in one of the two cabinets.",
        "Cabinet 9 is empty.",
      ],
      0,
      "The alternatives and the empty cabinet support the first claim, that the sample is in cabinet 4. Position alone does not identify a premise.",
    ),
    c(
      1,
      "Which inspected package violates the stated implication?",
      statements("Shipping rule", ["If a package contains glass, it is marked G."]),
      [
        "A wooden package marked G",
        "A glass package marked G",
        "A wooden package without G",
        "A glass package without G",
      ],
      3,
      "The implication requires G for glass packages. It does not forbid G on other packages, so only glass without G violates it.",
    ),
  ],
  [
    c(
      5,
      "Which claim is the conclusion of this maintenance report?",
      statements("Report", [
        "Either valve A or valve B is leaking. Inspection ruled out A. That is why we will repair B: valve B is leaking.",
      ]),
      ["Valve A was inspected.", "Valve B is leaking.", "At least one valve is leaking."],
      1,
      "The alternatives and the inspection result are used to establish that B leaks. The proposed repair is motivated by that conclusion.",
    ),
    c(
      0,
      "Which version makes the instruction into a claim?",
      statements("Original instruction", ["Record the room temperature."]),
      [
        "What is the room temperature?",
        "Record it before noon.",
        "The room temperature was recorded.",
      ],
      2,
      "The last version asserts that recording occurred. It can be true or false; the alternatives remain a question and an instruction.",
    ),
    c(
      6,
      "Both listed premises are true. What else is needed before calling the argument sound?",
      statements("Review note", [
        "Premise A has been checked and is true.",
        "Premise B has been checked and is true.",
      ]),
      [
        "The conclusion must be popular.",
        "There must be no case with both premises true and the conclusion false.",
        "The conclusion must be written after the premises.",
      ],
      1,
      "Soundness requires true premises and a valid inference. Validity excludes every true-premise, false-conclusion case.",
    ),
    c(
      1,
      "A safety rule says: if the door is open, the warning lamp is on. The door is closed and the lamp is on. What does this show?",
      table(
        ["Case", "Door", "Lamp"],
        [
          ["Rule applies", "open", "on"],
          ["Observed", "closed", "on"],
        ],
      ),
      [
        "The observation respects the rule; it does not establish what caused the light.",
        "The observation disproves the rule.",
        "The lamp proves the door is actually open.",
      ],
      0,
      "The rule constrains cases with an open door. A closed door with a lit lamp does not violate it or identify the cause of the light.",
    ),
    c(
      7,
      "Which review directly tests the reasoning?",
      statements("Disagreement", [
        "Lena says a forecast follows from the measurements.",
        "A colleague objects that Lena is usually impatient.",
      ]),
      [
        "Count how many people dislike Lena.",
        "Check whether the measurements support the forecast.",
        "Reject the forecast because impatience is undesirable.",
      ],
      1,
      "Inspect the link between the measurements and forecast. A remark about Lena's temperament supplies no counterexample or faulty calculation.",
    ),
    c(
      2,
      "Assume every published report passed review. A report did not pass review. Which conclusion follows?",
      statements("Publication rule", [
        "Published implies passed review.",
        "This report did not pass review.",
      ]),
      [
        "The report was published.",
        "The report has never been drafted.",
        "The report was not published.",
      ],
      2,
      "This uses the contrapositive. Publishing would require a passed review; the rule says nothing about whether drafting happened.",
    ),
    n(
      4,
      "How many assignments make p AND (q OR NOT q) true? Use the four rows shown.",
      truthRows,
      2,
      "q OR NOT q is true in every classical row. The whole expression is therefore true exactly in the two rows where p is true.",
    ),
    c(
      3,
      "Each witness either always tells the truth or always lies. Which types fit these reports?",
      statements("Witness reports", ["Rui: We are different types.", "Sol: Rui tells the truth."]),
      [
        "Both tell the truth",
        "Both always lie",
        "Rui tells the truth; Sol lies",
        "Rui lies; Sol tells the truth",
      ],
      1,
      "Sol's report requires the same truth-telling status for both. Then Rui's claim that their types differ is false. Rui lies, and Sol's report is false too.",
    ),
  ],
  [
    "Eight problems about claims, rules and arguments. See which ideas are ready and which lessons will help.",
    "Use all eight lessons to test arguments and repair a mistaken inference. Results appear after the final response.",
    "Apply the ideas to new reports and decisions after a week. Each problem uses a fresh case.",
  ],
);
