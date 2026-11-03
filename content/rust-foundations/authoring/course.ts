import {
  CODE_ANSWER_IDEA,
  type CourseBundle,
  type Question,
  type RustCall,
  type RustCase,
  type RustProjectCollection,
} from "../../../packages/contracts/src/index.js";

/**
 * Rust Foundations, authored by hand. `scripts/prepare-rust.ts` compiles every program below
 * in the sandbox, checks it against `expect`, records rustc's real output in the diagram, runs
 * every project solution against its cases, and writes bundle.json and rust-projects.json.
 */

export const courseId = "rust-foundations";

/** A lesson program before preparation: the code and what it must do. */
export type ProgramDraft = {
  type: "rust_program";
  code: string;
  expect: { stdout: string } | { error: string };
};
export const program = (code: string, expect: ProgramDraft["expect"]): ProgramDraft => ({
  type: "rust_program",
  code: code.trim(),
  expect,
});

const book = (id: string, title: string, path: string, section: string) => ({
  id,
  title,
  publisher: "The Rust Project",
  url: "https://doc.rust-lang.org/book/" + path,
  licence: "MIT OR Apache-2.0",
  licenceUrl: "https://github.com/rust-lang/book/blob/main/LICENSE-MIT",
  attribution: "Steve Klabnik, Carol Nichols and Chris Krycho, The Rust Programming Language.",
  accessedAt: "2026-10-15",
  edition: "The Rust Programming Language, Rust 2024 edition",
  section,
  reuse: "reference_only" as const,
  notes: "Facts checked against this chapter. All programs and exercises are original.",
});
const byExample = (id: string, title: string, path: string, section: string) => ({
  id,
  title,
  publisher: "The Rust Project",
  url: "https://doc.rust-lang.org/rust-by-example/" + path,
  licence: "MIT OR Apache-2.0",
  licenceUrl: "https://github.com/rust-lang/rust-by-example/blob/master/LICENSE-MIT",
  attribution: "The Rust Project, Rust by Example.",
  accessedAt: "2026-10-15",
  edition: "Rust by Example, accessed October 2026",
  section,
  reuse: "reference_only" as const,
  notes: "Used as a second reference for syntax. All programs are original.",
});

export const sources: CourseBundle["sources"] = [
  book("book-hello", "The Rust Book: Hello, World!", "ch01-02-hello-world.html", "1.2 Anatomy of a Rust program"),
  book(
    "book-variables",
    "The Rust Book: variables and mutability",
    "ch03-01-variables-and-mutability.html",
    "3.1 Variables and mutability; shadowing",
  ),
  book("book-types", "The Rust Book: data types", "ch03-02-data-types.html", "3.2 Scalar types; numeric operations"),
  book("book-functions", "The Rust Book: functions", "ch03-03-how-functions-work.html", "3.3 Parameters; statements and expressions; return values"),
  byExample("rbe-print", "Rust by Example: formatted print", "hello/print.html", "1.2 Formatted print"),
  byExample("rbe-bindings", "Rust by Example: variable bindings", "variable_bindings.html", "4 Variable bindings; 4.1 mutability; 4.3 shadowing"),
  byExample("rbe-cast", "Rust by Example: casting", "types/cast.html", "5.1 Casting with as"),
  {
    id: "rustlings",
    title: "Rustlings: variables and functions exercises",
    publisher: "The Rustlings contributors",
    url: "https://github.com/rust-lang/rustlings",
    licence: "MIT",
    licenceUrl: "https://github.com/rust-lang/rustlings/blob/main/LICENSE",
    attribution: "The Rustlings contributors, Rustlings.",
    accessedAt: "2026-10-15",
    edition: "Rustlings 6",
    section: "exercises/01_variables; exercises/02_functions",
    reuse: "reference_only",
    notes: "The project's fix-the-compiler-error style informed the try steps. No exercise is copied.",
  },
];

type Draft = Omit<Question, "conceptIds" | "sourceIds">;
const numeric = (
  id: string,
  prompt: string,
  value: number,
  workedAnswer: string,
  hints: string[],
  rest: Partial<Draft> = {},
): Draft => ({
  id,
  prompt,
  responseType: "numeric",
  difficulty: 1,
  hints,
  answerAuthority: {
    kind: "numeric",
    value,
    unit: "",
    absoluteTolerance: 1e-9,
    relativeTolerance: 0,
    workedAnswer,
  },
  calculator: "off",
  ...rest,
});
const typed = (
  id: string,
  prompt: string,
  accepted: string[],
  exampleAnswer: string,
  hints: string[],
  rest: Partial<Draft> = {},
): Draft => ({
  id,
  prompt,
  responseType: "short_text",
  difficulty: 1,
  hints,
  answerAuthority: { kind: "text", acceptedIdeas: accepted, rejectedIdeas: [], exampleAnswer },
  ...rest,
});
const choose = (
  id: string,
  prompt: string,
  labels: string[],
  hint: string,
  wrong: Record<number, string>,
  rest: Partial<Draft> = {},
): Draft => ({
  id,
  prompt,
  responseType: "short_text",
  difficulty: 1,
  hints: [hint],
  choices: labels.map((label, index) => ({ id: String.fromCharCode(97 + index), label })),
  answerAuthority: { kind: "text", acceptedIdeas: [labels[0]!], rejectedIdeas: [], exampleAnswer: labels[0]! },
  misconceptions: Object.entries(wrong).map(([index, feedback]) => ({
    match: { choiceIds: [String.fromCharCode(97 + Number(index))] },
    feedback,
  })),
  ...rest,
});

/**
 * A question answered by writing Rust. The first case is the example the learner sees; the
 * rest are hidden. The prepare script checks that `solution` passes every case and `starter`
 * fails at least one.
 */
const write = (
  id: string,
  prompt: string,
  task: { kind: "program" | "function"; starter: string; call?: RustCall },
  cases: RustCase[],
  solution: string,
  hints: string[],
  rest: Partial<Draft> = {},
): Draft => ({
  id,
  prompt,
  responseType: "code",
  difficulty: 1,
  hints,
  answerAuthority: { kind: "text", acceptedIdeas: [CODE_ANSWER_IDEA], rejectedIdeas: [], exampleAnswer: solution },
  code: { language: "rust", ...task, example: cases[0]! },
  codeCases: cases,
  ...rest,
});

/* ---------- Lesson 1: print a value, then change it ---------- */

const L1 = "print-and-bind";
const l1 = {
  concept: "rust-bindings",
  sources: ["book-hello", "book-variables", "rbe-print", "rbe-bindings", "rustlings"],
  questions: [
    numeric(L1 + "-hook", "What number does this program print?", 7, "3 + 4 is 7, and println! prints it.", [
      "apples holds 3 and pears holds 4.",
      "The program prints apples + pears.",
      "Add the two values.",
    ], { onCorrect: "7. You read a Rust program without being told any of its rules.", skill: "read-program" }),
    write(
      L1 + "-swap",
      "Change the program so that it prints 5 and 2.",
      { kind: "program", starter: 'fn main() {\n    println!("{} and {}", 2, 5);\n}\n' },
      [{ expected: "5 and 2" }],
      'fn main() {\n    println!("{} and {}", 5, 2);\n}\n',
      ["The braces fill in the order of the values after the text.", "Swap the 2 and the 5 after the comma."],
      { onCorrect: "The braces take the values in order, so swapping the values swaps the output.", skill: "use-println" },
    ),
    write(
      L1 + "-first-program",
      "Write a program that prints two lines: Hello, Rust! and then 3 + 4 = 7. Let Rust work out the 7 by putting 3 + 4 after the text.",
      { kind: "program", starter: "fn main() {\n    // Print the two lines here.\n}\n" },
      [{ expected: "Hello, Rust!\n3 + 4 = 7" }],
      'fn main() {\n    println!("Hello, Rust!");\n    println!("3 + 4 = {}", 3 + 4);\n}\n',
      ["Each println! prints one line, so you need two of them.", 'The second one is println!("3 + 4 = {}", 3 + 4);'],
      { onCorrect: "Two println! calls, two lines. The {} took the value of 3 + 4.", skill: "use-println" },
    ),
    numeric(
      L1 + "-area",
      "What number does the program print after area =?",
      24,
      "area is width * height, which is 6 * 4 = 24.",
      ["Find width and height first.", "area is width * height.", "Multiply 6 by 4."],
      {
        onCorrect: "24. Each let gave a value a name the later lines could use.",
        skill: "use-let",
        misconceptions: [{ match: { numeric: [10] }, feedback: "That adds the two sides. area multiplies them." }],
      },
    ),
    choose(
      L1 + "-reassign",
      "Does this program compile?",
      [
        "No. score was made without mut, so it cannot get a new value.",
        "Yes, and it prints 15.",
        "No. Every let needs a type such as i32.",
      ],
      "Look at how score was created, then at line 3.",
      {
        1: "It would print 15 if Rust allowed the change. Line 3 gives score a second value, and score never asked for that.",
        2: "Rust works out the type from 10, so no type is needed here. The problem is on line 3.",
      },
      { onCorrect: "rustc stops with error E0384 and suggests the fix itself: let mut score.", skill: "spot-immutable" },
    ),
    write(
      L1 + "-fix-score",
      "Fix this program so that it compiles and prints 15. You only need to change one line.",
      { kind: "program", starter: 'fn main() {\n    let score = 10;\n    score = score + 5;\n    println!("{score}");\n}\n' },
      [{ expected: "15" }],
      'fn main() {\n    let mut score = 10;\n    score = score + 5;\n    println!("{score}");\n}\n',
      ["Run it first. rustc's message ends with a suggested fix.", "score needs to be allowed to change, which is decided where it is created.", "Line 2 becomes let mut score = 10;"],
      { onCorrect: "let mut score said up front that score will change, so line 3 is allowed.", skill: "use-mut" },
    ),
    write(
      L1 + "-shadow",
      "Fix this program without using mut: turn each line that changes level into a new let. It should print 7.",
      { kind: "program", starter: 'fn main() {\n    let level = 2;\n    level = level * 3;\n    level = level + 1;\n    println!("{level}");\n}\n' },
      [{ expected: "7" }],
      'fn main() {\n    let level = 2;\n    let level = level * 3;\n    let level = level + 1;\n    println!("{level}");\n}\n',
      ["Lines 3 and 4 give level a new value, which plain let doesn't allow.", "Start each of those two lines with let.", "Line 3 becomes let level = level * 3;"],
      { onCorrect: "Each let made a new level from the one before, without any mut.", skill: "use-shadowing" },
    ),
    write(
      L1 + "-practice-1",
      "Write a program where count starts at 1 and is doubled three times with count = count * 2. Then print count = 8.",
      { kind: "program", starter: "fn main() {\n    // Create count, double it three times, then print it.\n}\n" },
      [{ expected: "count = 8" }],
      'fn main() {\n    let mut count = 1;\n    count = count * 2;\n    count = count * 2;\n    count = count * 2;\n    println!("count = {count}");\n}\n',
      ["count changes after it is created, so it needs mut.", 'Print it with println!("count = {count}");'],
      { skill: "use-mut" },
    ),
    typed(
      L1 + "-practice-2",
      "Which word do you write after let so that a variable can be given a new value later?",
      ["mut"],
      "mut: let mut count = 0;",
      ["It is short for mutable."],
      { skill: "use-mut" },
    ),
    choose(
      L1 + "-practice-3",
      'Does let x = 5; followed by let x = "five"; compile?',
      [
        "Yes. The second let makes a new x, and a new variable can have a new type.",
        "No. x is an integer, so it can never hold text.",
        "No. You need let mut x for the second line.",
      ],
      "Is the second line changing x, or making a new one?",
      {
        1: "That would be true if line 2 assigned to the same x. A second let makes a new variable.",
        2: "mut is for assigning to the same variable. A second let does not need it.",
      },
      { skill: "use-shadowing" },
    ),
  ],
  cards: [
    {
      id: L1 + "-card-1",
      front: "In Rust, what must you write to give an existing variable a new value with =?",
      back: "Create it with let mut, for example let mut count = 0;",
      answerAuthority: { kind: "text" as const, acceptedIdeas: ["mut"], rejectedIdeas: [], exampleAnswer: "let mut" },
    },
    {
      id: L1 + "-card-2",
      front: "What is it called when a second let reuses a variable's name?",
      back: "Shadowing. The new variable hides the old one and may have a different type.",
      answerAuthority: { kind: "text" as const, acceptedIdeas: ["shadow"], rejectedIdeas: [], exampleAnswer: "Shadowing" },
    },
  ],
};

const lesson1 = {
  id: L1,
  courseId,
  conceptIds: [l1.concept],
  title: "Print a value, then change it",
  steps: [
    {
      id: "main-and-println",
      kind: "explain",
      blocks: [],
      headline: "A Rust program starts at fn main and runs its lines from top to bottom.",
      lead: [
        {
          kind: "paragraph",
          text: "The code inside fn main() { } runs first. println! prints one line. Each {} in its text is replaced by the next value after the comma.",
        },
        {
          kind: "callout",
          tone: "key",
          text: "The ! marks println! as a macro. You call it like a function, but its name always ends in !.",
        },
      ],
      reveal: [],
      introducesTerms: ["fn main", "println!"],
      visualStateId: "",
      checkQuestionId: L1 + "-swap",
      activityId: "",
    },
    {
      id: "first-program",
      kind: "try",
      blocks: [],
      lead: [{ kind: "paragraph", text: "Now write a whole program yourself. Run it as often as you like before you check it." }],
      reveal: [],
      visualStateId: "",
      checkQuestionId: L1 + "-first-program",
      activityId: "",
    },
    {
      id: "let-names-a-value",
      kind: "predict",
      blocks: [],
      lead: [
        {
          kind: "paragraph",
          text: "let gives a value a name. Writing a name inside the braces, as in {area}, prints that variable.",
        },
      ],
      reveal: [
        {
          kind: "paragraph",
          text: "Each let named a value, and later lines used the names. Rust worked out from 6 and 4 that these are whole numbers.",
        },
      ],
      answerVisibility: "hidden-until-response",
      visualStateId: "",
      checkQuestionId: L1 + "-area",
      activityId: "",
      diagram: program(
        `
fn main() {
    let width = 6;
    let height = 4;
    let area = width * height;
    println!("area = {area}");
}
`,
        { stdout: "area = 24" },
      ),
    },
    {
      id: "immutable-by-default",
      kind: "try",
      blocks: [],
      lead: [
        {
          kind: "paragraph",
          text: "This program tries to add 5 to score after creating it. Decide whether rustc accepts it, then run it to see what the compiler says.",
        },
      ],
      reveal: [
        {
          kind: "paragraph",
          text: "A variable made with plain let keeps its first value. Rust makes you say up front which values will change, so a reader knows where to look.",
        },
      ],
      answerVisibility: "hidden-until-response",
      visualStateId: "",
      checkQuestionId: L1 + "-reassign",
      activityId: "",
      diagram: program(
        `
fn main() {
    let score = 10;
    score = score + 5;
    println!("{score}");
}
`,
        { error: "E0384" },
      ),
    },
    {
      id: "fix-it",
      kind: "try",
      blocks: [],
      lead: [{ kind: "paragraph", text: "Here is the same program. Make it compile. Run it first and read what rustc suggests." }],
      reveal: [
        {
          kind: "paragraph",
          text: "rustc often tells you the fix. Here it pointed at line 2 and suggested let mut score.",
        },
      ],
      visualStateId: "",
      checkQuestionId: L1 + "-fix-score",
      activityId: "",
    },
    {
      id: "shadowing",
      kind: "transfer",
      blocks: [],
      lead: [
        {
          kind: "paragraph",
          text: "A second let with the same name makes a new variable that hides the first. This is called shadowing, and it needs no mut.",
        },
      ],
      reveal: [
        {
          kind: "paragraph",
          text: "Shadowing makes a new variable each time. mut changes the same one. Shadowing also lets the new variable have a different type.",
        },
      ],
      visualStateId: "",
      checkQuestionId: L1 + "-shadow",
      activityId: "",
    },
  ],
  orientation: "Write a program that prints values, and choose which of its variables may change.",
  visualStates: [],
  visualKind: "none",
  activityId: "",
  questionIds: [1, 2, 3].map((n) => L1 + "-practice-" + n),
  flashcardIds: l1.cards.map((card) => card.id),
  reviewLabel: "Print a value, then change it",
  nextAction: "Give your values types and put a calculation in a function.",
  stageTitles: { quiz: "Skill check", review: "Recall it later", completion: "Ready for the next idea" },
  sourceIds: l1.sources,
  assuranceLevel: "source_backed",
  intro: {
    hook: {
      blocks: [{ kind: "paragraph", text: "Here is a complete Rust program. You haven't learned any Rust yet, but try reading it anyway." }],
      diagram: program(
        `
fn main() {
    let apples = 3;
    let pears = 4;
    println!("{}", apples + pears);
}
`,
        { stdout: "7" },
      ),
      questionId: L1 + "-hook",
    },
    promise: "By the end you'll write Rust that prints values, and you'll decide which variables may change.",
    estimatedMinutes: 10,
  },
  recap: {
    keyIdea: "let names a value, and that value stays fixed unless you write let mut. A second let makes a new variable instead.",
    blocks: [
      {
        kind: "paragraph",
        text: "You wrote your first two programs and fixed rustc's E0384 error twice: once with mut, once with shadowing.",
      },
    ],
    nextHook: "So far Rust guessed every type. Next you'll write the types yourself and put a calculation in a function.",
  },
  calculator: "off",
  taughtSkills: ["read-program", "use-println", "use-let", "spot-immutable", "use-mut", "use-shadowing"],
};

/* ---------- Lesson 2: types and functions ---------- */

const L2 = "types-and-functions";
const l2 = {
  concept: "rust-functions",
  sources: ["book-types", "book-functions", "rbe-cast", "rustlings"],
  questions: [
    numeric(L2 + "-hook", "What does this program print?", 3, "7 / 2 with two whole numbers gives 3. The remainder of 1 is dropped.", [
      "cookies and people are both whole numbers.",
      "Dividing two whole numbers in Rust gives a whole number.",
      "How many whole times does 2 go into 7?",
    ], {
      onCorrect: "3. Rust divided two whole numbers and dropped the remainder.",
      skill: "integer-division",
      misconceptions: [{ match: { numeric: [3.5] }, feedback: "That is the exact answer, but these are whole numbers. Rust keeps the result whole." }],
    }),
    write(
      L2 + "-exact",
      "This program prints 3. Change it so that it prints 3.5.",
      { kind: "program", starter: 'fn main() {\n    let share = 7 / 2;\n    println!("{share}");\n}\n' },
      [{ expected: "3.5" }],
      'fn main() {\n    let share = 7.0 / 2.0;\n    println!("{share}");\n}\n',
      ["7 and 2 are i32 values, so the remainder is dropped.", "Write both numbers with a decimal point."],
      { onCorrect: "7.0 / 2.0 divides two f64 values, so the .5 is kept.", skill: "choose-number-type" },
    ),
    choose(
      L2 + "-mixing",
      "Does this program compile?",
      [
        "No. Rust will not multiply an f64 by an i32 until you convert one of them.",
        "Yes, and it prints 10.",
        "Yes, and it prints 10.0.",
      ],
      "Look at the two types written after price and count.",
      {
        1: "Many languages would do that conversion for you. Rust stops and asks you to choose.",
        2: "It would, if count were an f64. Rust does not convert it on its own.",
      },
      { onCorrect: "rustc reports E0277: cannot multiply f64 by i32. Writing count as f64 fixes it.", skill: "spot-type-mismatch" },
    ),
    write(
      L2 + "-fix-as",
      "Make this program compile by converting count with as f64. It should print 10.",
      { kind: "program", starter: 'fn main() {\n    let price: f64 = 2.5;\n    let count: i32 = 4;\n    println!("{}", price * count);\n}\n' },
      [{ expected: "10" }],
      'fn main() {\n    let price: f64 = 2.5;\n    let count: i32 = 4;\n    println!("{}", price * count as f64);\n}\n',
      ["Only the multiplication needs to change.", "Write count as f64 where count is used."],
      { onCorrect: "count as f64 turned 4 into 4.0, so both sides of * are f64.", skill: "spot-type-mismatch" },
    ),
    typed(L2 + "-return-type", "In fn area(w: i32, h: i32) -> i32, what type does area return?", ["i32"], "i32, the type after the arrow.", [
      "The return type comes after the arrow.",
    ], { onCorrect: "i32. The type after -> is what the function hands back.", skill: "read-signature" }),
    write(
      L2 + "-triple",
      "Write a function triple that takes an i32 and returns three times it, also as an i32.",
      {
        kind: "function",
        starter: "fn triple(n: i32) -> i32 {\n    // Return three times n.\n}\n",
        call: { name: "triple", parameters: [{ name: "n", type: "i32" }], returns: "i32" },
      },
      [
        { arguments: ["4"], expected: "12" },
        { arguments: ["0"], expected: "0" },
        { arguments: ["-5"], expected: "-15" },
      ],
      "fn triple(n: i32) -> i32 {\n    n * 3\n}\n",
      ["The body's last line is the value the function returns.", "Write n * 3 with no semicolon after it."],
      { onCorrect: "n * 3 with no semicolon is the value triple returns.", skill: "write-function" },
    ),
    numeric(
      L2 + "-tax",
      "What does this program print?",
      77,
      "add_tax(50) is 50 + 5 = 55 and add_tax(20) is 20 + 2 = 22. 55 + 22 = 77.",
      ["Work out add_tax(50) and add_tax(20) separately.", "price / 10 is integer division: 50 / 10 is 5.", "Add 55 and 22."],
      {
        onCorrect: "77. Each call ran the body with its own price and handed back the last expression.",
        skill: "call-function",
        misconceptions: [{ match: { numeric: [70] }, feedback: "That is 50 + 20 without the tax. Each call adds a tenth of its price." }],
      },
    ),
    choose(
      L2 + "-semicolon",
      "Does this version compile?",
      [
        "No. The semicolon turns n * 2 into a statement, so the function returns nothing.",
        "Yes, and it prints 42.",
        "No. A function body must use the word return.",
      ],
      "What does a semicolon do to the last line of a function body?",
      {
        1: "Without the semicolon it would. With it, n * 2 is calculated and thrown away.",
        2: "return is allowed but not required. The last expression, with no semicolon, is the return value.",
      },
      { onCorrect: "rustc reports E0308 (mismatched types) and suggests removing the semicolon.", skill: "spot-semicolon" },
    ),
    write(
      L2 + "-average",
      "Write a function average that takes two f64 values and returns their average as an f64.",
      {
        kind: "function",
        starter: "fn average(a: f64, b: f64) -> f64 {\n    // Return the average of a and b.\n}\n",
        call: {
          name: "average",
          parameters: [
            { name: "a", type: "f64" },
            { name: "b", type: "f64" },
          ],
          returns: "f64",
        },
      },
      [
        { arguments: ["3.0", "4.0"], expected: "3.5" },
        { arguments: ["10.0", "0.0"], expected: "5.0" },
        { arguments: ["-1.0", "2.0"], expected: "0.5" },
      ],
      "fn average(a: f64, b: f64) -> f64 {\n    (a + b) / 2.0\n}\n",
      ["Add the two values, then divide by 2.0.", "Brackets make the addition happen first: (a + b) / 2.0"],
      { onCorrect: "The brackets add before the division, and f64 keeps the fraction.", skill: "write-function" },
    ),
    write(
      L2 + "-practice-1",
      "Write total_price, which takes a price as an f64 and a count as an i32, and returns price times count as an f64.",
      {
        kind: "function",
        starter: "fn total_price(price: f64, count: i32) -> f64 {\n    // Return price times count.\n}\n",
        call: {
          name: "total_price",
          parameters: [
            { name: "price", type: "f64" },
            { name: "count", type: "i32" },
          ],
          returns: "f64",
        },
      },
      [
        { arguments: ["2.5", "4"], expected: "10.0" },
        { arguments: ["0.99", "3"], expected: "2.97" },
        { arguments: ["10.0", "0"], expected: "0.0" },
      ],
      "fn total_price(price: f64, count: i32) -> f64 {\n    price * count as f64\n}\n",
      ["count is an i32, so convert it before multiplying."],
      { skill: "write-function" },
    ),
    write(
      L2 + "-practice-2",
      "Write share, which splits a whole number of sweets between people and returns how many each person gets. Leftover sweets are not shared out.",
      {
        kind: "function",
        starter: "fn share(total: i32, people: i32) -> i32 {\n    // Return how many whole sweets each person gets.\n}\n",
        call: {
          name: "share",
          parameters: [
            { name: "total", type: "i32" },
            { name: "people", type: "i32" },
          ],
          returns: "i32",
        },
      },
      [
        { arguments: ["7", "2"], expected: "3" },
        { arguments: ["10", "5"], expected: "2" },
        { arguments: ["17", "5"], expected: "3" },
      ],
      "fn share(total: i32, people: i32) -> i32 {\n    total / people\n}\n",
      ["Dividing two i32 values already drops the remainder."],
      { skill: "integer-division" },
    ),
    typed(
      L2 + "-practice-3",
      "Which type does Rust give 2.5 when nothing else in the program says otherwise?",
      ["f64"],
      "f64, Rust's default for numbers with a decimal point.",
      ["It is a 64-bit floating-point type."],
      { skill: "choose-number-type" },
    ),
  ],
  cards: [
    {
      id: L2 + "-card-1",
      front: "In Rust, what does 9 / 2 evaluate to?",
      back: "4. Dividing two integers drops the remainder.",
      answerAuthority: { kind: "numeric" as const, value: 4, unit: "", absoluteTolerance: 1e-9, relativeTolerance: 0, workedAnswer: "9 / 2 is 4 with remainder 1, which is dropped." },
    },
    {
      id: L2 + "-card-2",
      front: "A Rust function's last line is x + 1; with a semicolon. Why does the function not return x + 1?",
      back: "The semicolon makes it a statement. Only a final expression without a semicolon is returned.",
      answerAuthority: { kind: "text" as const, acceptedIdeas: ["semicolon"], rejectedIdeas: [], exampleAnswer: "The semicolon turns it into a statement." },
    },
  ],
};

const lesson2 = {
  id: L2,
  courseId,
  conceptIds: [l2.concept],
  title: "Types and functions",
  steps: [
    {
      id: "integers-and-floats",
      kind: "explain",
      blocks: [],
      headline: "Every value has a type: i32 for whole numbers, f64 for numbers with a decimal point.",
      lead: [
        {
          kind: "paragraph",
          text: "Rust works out the type from the value. 7 is an i32, a 32-bit integer, and 7.0 is an f64. Dividing two i32 values drops the remainder. Dividing two f64 values keeps it.",
        },
      ],
      reveal: [],
      introducesTerms: ["i32", "f64"],
      answerVisibility: "hidden-until-response",
      visualStateId: "",
      checkQuestionId: L2 + "-exact",
      activityId: "",
      diagram: program(
        `
fn main() {
    let whole = 9 / 4;
    let exact = 9.0 / 4.0;
    println!("{whole} and {exact}");
}
`,
        { stdout: "2 and 2.25" },
      ),
    },
    {
      id: "no-mixing",
      kind: "try",
      blocks: [],
      lead: [
        {
          kind: "paragraph",
          text: "You can write a type yourself after a colon, as in let price: f64 = 2.5. Rust never converts between number types on its own. Does this compile?",
        },
      ],
      reveal: [
        {
          kind: "paragraph",
          text: "Write price * count as f64 to convert count first. as converts one number type into another, and you choose where it happens.",
        },
      ],
      answerVisibility: "hidden-until-response",
      visualStateId: "",
      checkQuestionId: L2 + "-mixing",
      activityId: "",
      diagram: program(
        `
fn main() {
    let price: f64 = 2.5;
    let count: i32 = 4;
    println!("{}", price * count);
}
`,
        { error: "E0277" },
      ),
    },
    {
      id: "convert-with-as",
      kind: "try",
      blocks: [],
      lead: [{ kind: "paragraph", text: "as converts one number type into another, as in count as f64. Use it to fix the program you just saw." }],
      reveal: [],
      introducesTerms: ["as"],
      visualStateId: "",
      checkQuestionId: L2 + "-fix-as",
      activityId: "",
    },
    {
      id: "functions",
      kind: "explain",
      blocks: [],
      headline: "A function names a calculation. Its parameters and its return value all have types.",
      lead: [
        {
          kind: "paragraph",
          text: "fn double(n: i32) -> i32 takes an i32 called n and returns an i32. The type after -> is the return type. The last line of the body, written without a semicolon, is the value the function returns.",
        },
      ],
      reveal: [],
      introducesTerms: ["parameter", "return type"],
      answerVisibility: "hidden-until-response",
      visualStateId: "",
      checkQuestionId: L2 + "-return-type",
      activityId: "",
      diagram: program(
        `
fn double(n: i32) -> i32 {
    n * 2
}

fn main() {
    let result = double(21);
    println!("{result}");
}
`,
        { stdout: "42" },
      ),
    },
    {
      id: "write-triple",
      kind: "try",
      blocks: [],
      lead: [{ kind: "paragraph", text: "Write a function of your own. The checker calls it with several numbers, so it has to work for any i32." }],
      reveal: [],
      visualStateId: "",
      checkQuestionId: L2 + "-triple",
      activityId: "",
    },
    {
      id: "call-a-function",
      kind: "predict",
      blocks: [],
      lead: [{ kind: "paragraph", text: "add_tax adds a tenth of the price. main calls it twice and adds the results." }],
      reveal: [
        {
          kind: "paragraph",
          text: "Each call gets its own price. price / 10 is integer division, so add_tax(20) adds 2, not 2.0.",
        },
      ],
      answerVisibility: "hidden-until-response",
      visualStateId: "",
      checkQuestionId: L2 + "-tax",
      activityId: "",
      diagram: program(
        `
fn add_tax(price: i32) -> i32 {
    price + price / 10
}

fn main() {
    let total = add_tax(50) + add_tax(20);
    println!("{total}");
}
`,
        { stdout: "77" },
      ),
    },
    {
      id: "the-semicolon",
      kind: "try",
      blocks: [],
      lead: [{ kind: "paragraph", text: "This is double again, with one change: a semicolon after n * 2." }],
      reveal: [
        {
          kind: "paragraph",
          text: "A line ending in a semicolon is a statement and produces no value. The body now ends without a value, but the signature promised an i32.",
        },
      ],
      answerVisibility: "hidden-until-response",
      visualStateId: "",
      checkQuestionId: L2 + "-semicolon",
      activityId: "",
      diagram: program(
        `
fn double(n: i32) -> i32 {
    n * 2;
}

fn main() {
    println!("{}", double(21));
}
`,
        { error: "E0308" },
      ),
    },
    {
      id: "average",
      kind: "transfer",
      blocks: [],
      lead: [{ kind: "paragraph", text: "Now the parameters are f64 values. Write the function from its signature and the example." }],
      reveal: [
        {
          kind: "paragraph",
          text: "The brackets add first, then the sum is divided by 2.0. With i32 parameters the same calculation would drop the .5.",
        },
      ],
      visualStateId: "",
      checkQuestionId: L2 + "-average",
      activityId: "",
    },
  ],
  orientation: "Choose between whole and decimal numbers, and write functions that take and return typed values.",
  visualStates: [],
  visualKind: "none",
  activityId: "",
  questionIds: [1, 2, 3].map((n) => L2 + "-practice-" + n),
  flashcardIds: l2.cards.map((card) => card.id),
  reviewLabel: "Types and functions",
  nextAction: "Write your own programs in the Rust projects.",
  stageTitles: { quiz: "Skill check", review: "Recall it later", completion: "Ready to write programs" },
  sourceIds: l2.sources,
  assuranceLevel: "source_backed",
  intro: {
    hook: {
      blocks: [{ kind: "paragraph", text: "Seven cookies shared between two people is three and a half each. Here is the same sum in Rust." }],
      diagram: program(
        `
fn main() {
    let cookies = 7;
    let people = 2;
    println!("{}", cookies / people);
}
`,
        { stdout: "3" },
      ),
      questionId: L2 + "-hook",
    },
    promise: "By the end you'll write functions with typed parameters and return values, and know when division drops a remainder.",
    estimatedMinutes: 12,
  },
  recap: {
    keyIdea: "Every value has a type that Rust won't change for you, and a function returns its last expression.",
    blocks: [
      {
        kind: "paragraph",
        text: "You made 7 / 2 print 3.5, fixed E0277 with as, and wrote functions that the checker called with numbers you never saw.",
      },
    ],
    nextHook: "You can now read and fix small programs. The projects ask you to write them.",
  },
  calculator: "off",
  taughtSkills: [
    "integer-division",
    "choose-number-type",
    "spot-type-mismatch",
    "read-signature",
    "call-function",
    "spot-semicolon",
    "write-function",
  ],
};

const drafts = [
  { lesson: lesson1, ...l1 },
  { lesson: lesson2, ...l2 },
];

export function assemble() {
  const questions = drafts.flatMap((d) =>
    d.questions.map((q) => ({ ...q, conceptIds: [d.concept], sourceIds: d.sources })),
  );
  const flashcards = drafts.flatMap((d) =>
    d.cards.map((c) => ({ ...c, conceptIds: [d.concept], sourceIds: d.sources })),
  );
  return {
    course: {
      id: courseId,
      version: "0.1.0",
      title: "Rust Foundations",
      description: "Read, run and write small Rust programs, with the real compiler checking your work.",
      audience: "Someone new to Rust. Some programming in another language helps but isn't needed.",
      assuranceLevel: "source_backed",
      moduleIds: ["rust-first-programs"],
      sourceIds: sources.map((s) => s.id),
      accent: "#c2410c",
      coverAsset: "cover.svg",
      status: "available",
      subjects: ["Computer science", "Programming"],
    },
    modules: [
      {
        id: "rust-first-programs",
        title: "First programs",
        description: "Printing, variables, number types and functions.",
        conceptIds: drafts.map((d) => d.concept),
      },
    ],
    concepts: [
      {
        id: l1.concept,
        moduleId: "rust-first-programs",
        title: "Variables and printing",
        summary: "let names a value and println! prints it. Add mut when the value has to change.",
        prerequisiteIds: [],
        misconceptionIds: [],
        assuranceLevel: "source_backed",
      },
      {
        id: l2.concept,
        moduleId: "rust-first-programs",
        title: "Types and functions",
        summary: "Whole and decimal number types, and functions that return their last expression.",
        prerequisiteIds: [l1.concept],
        misconceptionIds: [],
        assuranceLevel: "source_backed",
      },
    ],
    lessons: drafts.map((d) => d.lesson),
    activities: [],
    questions,
    flashcards,
    essays: [],
    sources,
  };
}

/* ---------- Projects ---------- */

export const projects: RustProjectCollection = {
  courseId,
  projects: [
    {
      id: "first-programs",
      version: "1.0.0",
      title: "First Rust programs",
      description: "Four small programs: a greeting that reads a name, then three functions that calculate with i32 and f64 values.",
      tasks: [
        {
          id: "greet-by-name",
          title: "Greet someone by name",
          prompt:
            "The starter reads one line of input into `name` and trims the line break. Print exactly one line: `Hello, NAME! Welcome to Rust.` with the name in place of NAME.\n\nIf the input is `Ada`, the program prints `Hello, Ada! Welcome to Rust.`",
          lessonId: L1,
          conceptIds: [l1.concept],
          sourceIds: ["book-hello", "rbe-print"],
          kind: "program",
          starter:
            'use std::io;\n\nfn main() {\n    let mut name = String::new();\n    io::stdin().read_line(&mut name).unwrap();\n    let name = name.trim();\n\n    // Print the greeting here.\n}\n',
          hints: [
            "println! can print a variable by name inside the braces: `{name}`.",
            'The whole line is `println!("Hello, {name}! Welcome to Rust.");`',
          ],
          correction:
            "Compare your output with the expected line character by character. The comma, the exclamation mark and the full stop all count.",
          solution:
            'use std::io;\n\nfn main() {\n    let mut name = String::new();\n    io::stdin().read_line(&mut name).unwrap();\n    let name = name.trim();\n\n    println!("Hello, {name}! Welcome to Rust.");\n}\n',
          explanation:
            "`let name = name.trim();` shadows the original `name` with the trimmed text, so the greeting has no stray line break. `{name}` inside the braces prints it.",
          cases: [
            { stdin: "Ada\n", expected: "Hello, Ada! Welcome to Rust." },
            { stdin: "Ferris\n", expected: "Hello, Ferris! Welcome to Rust." },
            { stdin: "Grace Hopper\n", expected: "Hello, Grace Hopper! Welcome to Rust." },
          ],
        },
        {
          id: "rectangle-area",
          title: "Area of a rectangle",
          prompt:
            "Write a function `area` that returns the area of a rectangle. The width, the height and the result are all `i32` values.\n\nThe checker calls `area` for you, so this file needs no `fn main`. Run shows what your function returns for the example.",
          lessonId: L2,
          conceptIds: [l2.concept],
          sourceIds: ["book-functions"],
          kind: "function",
          call: {
            name: "area",
            parameters: [
              { name: "width", type: "i32" },
              { name: "height", type: "i32" },
            ],
            returns: "i32",
          },
          starter: "fn area(width: i32, height: i32) -> i32 {\n    // Return the area.\n}\n",
          hints: [
            "The area is width multiplied by height.",
            "Make `width * height` the last line of the body, with no semicolon.",
          ],
          correction:
            "Check that the last line of the body is `width * height` with no semicolon after it. A semicolon would make the function return nothing.",
          solution: "fn area(width: i32, height: i32) -> i32 {\n    width * height\n}\n",
          explanation:
            "The body's last expression is the return value, so `width * height` with no semicolon is returned as the `i32` the signature promises.",
          cases: [
            { arguments: ["3", "4"], expected: "12" },
            { arguments: ["10", "10"], expected: "100" },
            { arguments: ["7", "0"], expected: "0" },
          ],
        },
        {
          id: "to-fahrenheit",
          title: "Celsius to Fahrenheit",
          prompt:
            "Write `to_fahrenheit`, which takes a temperature in Celsius as an `f64` and returns it in Fahrenheit as an `f64`.\n\nTo convert, multiply by 9, divide by 5 and add 32. Every number in the calculation needs to be an `f64`, so write `9.0` rather than `9`.",
          lessonId: L2,
          conceptIds: [l2.concept],
          sourceIds: ["book-types", "book-functions"],
          kind: "function",
          call: { name: "to_fahrenheit", parameters: [{ name: "celsius", type: "f64" }], returns: "f64" },
          starter: "fn to_fahrenheit(celsius: f64) -> f64 {\n    // Convert celsius to Fahrenheit.\n}\n",
          hints: [
            "Rust won't multiply an f64 by the integer 9. Write the constants as 9.0, 5.0 and 32.0.",
            "The formula is `celsius * 9.0 / 5.0 + 32.0`.",
          ],
          correction:
            "Check the order: multiply by 9.0, divide by 5.0, then add 32.0. Then check that the result is the last expression of the body, with no semicolon.",
          solution: "fn to_fahrenheit(celsius: f64) -> f64 {\n    celsius * 9.0 / 5.0 + 32.0\n}\n",
          explanation:
            "Every value in `celsius * 9.0 / 5.0 + 32.0` is an `f64`, so Rust needs no conversion. Multiplication and division happen before the addition.",
          cases: [
            { arguments: ["100.0"], expected: "212.0" },
            { arguments: ["0.0"], expected: "32.0" },
            { arguments: ["-40.0"], expected: "-40.0" },
            { arguments: ["25.0"], expected: "77.0" },
          ],
        },
        {
          id: "average-of-three",
          title: "Average of three scores",
          prompt:
            "Write `average`, which takes three `i32` scores and returns their average as an `f64`.\n\nThe sum of three `i32` values is an `i32`. Convert it with `as f64` before dividing, or the remainder is lost.",
          lessonId: L2,
          conceptIds: [l2.concept],
          sourceIds: ["book-types", "rbe-cast"],
          kind: "function",
          call: {
            name: "average",
            parameters: [
              { name: "a", type: "i32" },
              { name: "b", type: "i32" },
              { name: "c", type: "i32" },
            ],
            returns: "f64",
          },
          starter: "fn average(a: i32, b: i32, c: i32) -> f64 {\n    // Return the average as an f64.\n}\n",
          hints: [
            "Add the three scores first. That sum is an i32.",
            "`(a + b + c) as f64` gives you an f64. Divide it by 3.0.",
          ],
          correction:
            "If you get a whole-number answer, the division happened between two i32 values. Convert the sum to f64 before dividing, and divide by 3.0.",
          solution: "fn average(a: i32, b: i32, c: i32) -> f64 {\n    (a + b + c) as f64 / 3.0\n}\n",
          explanation:
            "`(a + b + c) as f64` converts the sum, then dividing by `3.0` keeps the fraction. Dividing first, with `(a + b + c) / 3`, would drop it.",
          cases: [
            { arguments: ["1", "2", "3"], expected: "2.0" },
            { arguments: ["1", "2", "2"], expected: "1.6666666666666667" },
            { arguments: ["10", "0", "5"], expected: "5.0" },
            { arguments: ["-3", "4", "0"], expected: "0.3333333333333333" },
          ],
        },
      ],
    },
    {
      "id": "text-tools",
      "version": "1.0.0",
      "title": "Text tools",
      "description": "Four small functions that read text without copying it, using loops, slices and borrowed &str arguments: count the words, find the last one, shift letters and test for a palindrome.",
      "tasks": [
        {
          "id": "word-counter",
          "title": "Count the words in a line",
          "prompt": "Write a function `count_words` that returns how many words a line of text holds. Words are separated by spaces, and extra spaces between them do not count as words.\n\nThe method `split_whitespace` gives the words one at a time, and `count` counts the items of an iterator.",
          "lessonId": "slices-and-strings",
          "conceptIds": [
            "rust-slices"
          ],
          "sourceIds": [
            "book-slices",
            "rbe-str"
          ],
          "kind": "function",
          "call": {
            "name": "count_words",
            "parameters": [
              {
                "name": "text",
                "type": "&str"
              }
            ],
            "returns": "usize"
          },
          "starter": "fn count_words(text: &str) -> usize {\n    // Return the number of words in text.\n}\n",
          "hints": [
            "split_whitespace skips extra spaces, so you do not have to.",
            "text.split_whitespace() is an iterator, and count() consumes it and returns the number of items."
          ],
          "correction": "If a line with extra spaces gives the wrong number, check that you used split_whitespace and not split(' '), which makes an empty piece for each extra space.",
          "solution": "fn count_words(text: &str) -> usize {\n    text.split_whitespace().count()\n}\n",
          "explanation": "split_whitespace gives only the real words, and count consumes the iterator and reports how many there were. An empty line has no words, so the result is 0.",
          "cases": [
            {
              "arguments": [
                "\"the quick brown fox\""
              ],
              "expected": "4"
            },
            {
              "arguments": [
                "\"\""
              ],
              "expected": "0"
            },
            {
              "arguments": [
                "\"  one  \""
              ],
              "expected": "1"
            },
            {
              "arguments": [
                "\"a b  c   d e f\""
              ],
              "expected": "6"
            }
          ]
        },
        {
          "id": "last-word",
          "title": "The last word of a line",
          "prompt": "Write a function `last_word` that returns the last word of a line as a slice of the input, without making a new String. An empty line has no last word, so return the empty text for it.\n\nThe iterator from `split_whitespace` has a method `last`, which returns an Option, and `unwrap_or(\"\")` replaces a missing word with the empty text.",
          "lessonId": "slices-and-strings",
          "conceptIds": [
            "rust-slices"
          ],
          "sourceIds": [
            "book-slices",
            "rbe-str"
          ],
          "kind": "function",
          "call": {
            "name": "last_word",
            "parameters": [
              {
                "name": "text",
                "type": "&str"
              }
            ],
            "returns": "&str"
          },
          "starter": "fn last_word(text: &str) -> &str {\n    // Return the last word of text, or \"\" if there is none.\n}\n",
          "hints": [
            "text.split_whitespace().last() gives an Option<&str>.",
            "Use unwrap_or(\"\") on that Option for the case of an empty line."
          ],
          "correction": "If the result has a leading or trailing space, check that you split on whitespace and did not slice the text yourself with a fixed index.",
          "solution": "fn last_word(text: &str) -> &str {\n    text.split_whitespace().last().unwrap_or(\"\")\n}\n",
          "explanation": "The words are slices of the original text, so nothing is copied. last returns None for an empty line, and unwrap_or supplies the empty text for that case.",
          "cases": [
            {
              "arguments": [
                "\"rust is fun\""
              ],
              "expected": "\"fun\""
            },
            {
              "arguments": [
                "\"single\""
              ],
              "expected": "\"single\""
            },
            {
              "arguments": [
                "\"\""
              ],
              "expected": "\"\""
            },
            {
              "arguments": [
                "\"  trailing space  \""
              ],
              "expected": "\"space\""
            }
          ]
        },
        {
          "id": "caesar-shift",
          "title": "Shift the letters of a text",
          "prompt": "Write a function `shift_text` that moves every lowercase letter forward by `shift` places and wraps from z back to a. Other characters stay as they are. The shift is at most 25.\n\nA character `c` can be turned into its place in the alphabet with `c as u8 - b'a'`, and a number back into a letter with `n as char`.",
          "lessonId": "slices-and-strings",
          "conceptIds": [
            "rust-slices"
          ],
          "sourceIds": [
            "book-slices",
            "rbe-str"
          ],
          "kind": "function",
          "call": {
            "name": "shift_text",
            "parameters": [
              {
                "name": "text",
                "type": "&str"
              },
              {
                "name": "shift",
                "type": "u8"
              }
            ],
            "returns": "String"
          },
          "starter": "fn shift_text(text: &str, shift: u8) -> String {\n    // Build a new String with each lowercase letter moved forward.\n}\n",
          "hints": [
            "Loop over text.chars(), and push each result onto a String made with String::new().",
            "For a lowercase letter, the new place is (c as u8 - b'a' + shift) % 26, and adding b'a' turns it back into a byte.",
            "Test c.is_ascii_lowercase() first, and push other characters unchanged."
          ],
          "correction": "If a letter near the end of the alphabet comes out wrong, check that the remainder after dividing by 26 is taken before b'a' is added back.",
          "solution": "fn shift_text(text: &str, shift: u8) -> String {\n    let mut out = String::new();\n    for c in text.chars() {\n        if c.is_ascii_lowercase() {\n            let moved = (c as u8 - b'a' + shift) % 26 + b'a';\n            out.push(moved as char);\n        } else {\n            out.push(c);\n        }\n    }\n    out\n}\n",
          "explanation": "The place of a letter is its distance from a. Adding the shift and taking the remainder after 26 wraps z back to a, and adding b'a' returns to the byte of a letter. Characters that are not lowercase letters are copied unchanged.",
          "cases": [
            {
              "arguments": [
                "\"abc xyz\"",
                "3"
              ],
              "expected": "\"def abc\""
            },
            {
              "arguments": [
                "\"hello, world!\"",
                "13"
              ],
              "expected": "\"uryyb, jbeyq!\""
            },
            {
              "arguments": [
                "\"zebra\"",
                "1"
              ],
              "expected": "\"afcsb\""
            },
            {
              "arguments": [
                "\"Rust 2\"",
                "0"
              ],
              "expected": "\"Rust 2\""
            }
          ]
        },
        {
          "id": "palindrome",
          "title": "Does it read the same backwards",
          "prompt": "Write a function `is_palindrome` that returns true when a text reads the same forwards and backwards, ignoring upper and lower case.\n\nThe method `to_lowercase` returns a lowercase String, and `chars().rev()` walks the characters from the end.",
          "lessonId": "slices-and-strings",
          "conceptIds": [
            "rust-slices"
          ],
          "sourceIds": [
            "book-slices",
            "rbe-str"
          ],
          "kind": "function",
          "call": {
            "name": "is_palindrome",
            "parameters": [
              {
                "name": "text",
                "type": "&str"
              }
            ],
            "returns": "bool"
          },
          "starter": "fn is_palindrome(text: &str) -> bool {\n    // Return whether text is a palindrome, ignoring case.\n}\n",
          "hints": [
            "Make a lowercase copy first with text.to_lowercase().",
            "Collect the characters forwards and backwards into two Vecs: lower.chars().collect::<Vec<char>>() and lower.chars().rev().collect::<Vec<char>>().",
            "Two Vecs can be compared with ==."
          ],
          "correction": "If Level and level disagree, check that you lowercased the text before comparing the two sequences.",
          "solution": "fn is_palindrome(text: &str) -> bool {\n    let lower = text.to_lowercase();\n    let forward: Vec<char> = lower.chars().collect();\n    let backward: Vec<char> = lower.chars().rev().collect();\n    forward == backward\n}\n",
          "explanation": "Lowercasing makes the comparison ignore case. The two Vecs hold the same characters in opposite orders, and == on Vecs compares them item by item, so they are equal exactly when the text is a palindrome.",
          "cases": [
            {
              "arguments": [
                "\"Level\""
              ],
              "expected": "true"
            },
            {
              "arguments": [
                "\"rust\""
              ],
              "expected": "false"
            },
            {
              "arguments": [
                "\"\""
              ],
              "expected": "true"
            },
            {
              "arguments": [
                "\"Noon\""
              ],
              "expected": "true"
            },
            {
              "arguments": [
                "\"ab\""
              ],
              "expected": "false"
            }
          ]
        }
      ]
    },
    {
      "id": "library-catalogue",
      "version": "1.0.0",
      "title": "Library catalogue",
      "description": "A catalogue of books modelled with a struct and an enum for each book's state, an Option for lookups, a Result for checking a book out, and a HashMap for counting loans.",
      "tasks": [
        {
          "id": "model-a-book",
          "title": "Model a book",
          "prompt": "The program reads one line that says what state a book is in: `available`, `borrowed` followed by a name, or `lost`. Build a `Book` with the id 1 and the title Dune in that state, and print it with `{:?}`.\n\nThe types are written for you. Fill in `main` after the line is read.\n\nFor the input `borrowed ann` the program prints `Book { id: 1, title: \"Dune\", status: Borrowed(\"ann\") }`.",
          "lessonId": "enums-and-match",
          "conceptIds": [
            "rust-enums"
          ],
          "sourceIds": [
            "book-enums",
            "book-match"
          ],
          "kind": "program",
          "starter": "use std::io;\n\n#[derive(Debug)]\nenum Status {\n    Available,\n    Borrowed(String),\n    Lost,\n}\n\n#[derive(Debug)]\nstruct Book {\n    id: u32,\n    title: String,\n    status: Status,\n}\n\nfn main() {\n    let mut line = String::new();\n    io::stdin().read_line(&mut line).unwrap();\n    let mut words = line.split_whitespace();\n    // Build the status from the first word, then the Book, then print it.\n}\n",
          "hints": [
            "words.next() returns an Option<&str>, so you can match on it with Some(\"borrowed\") and Some(\"lost\") arms and a _ arm for the rest.",
            "For borrowed, the member's name is the next word: words.next().unwrap_or(\"nobody\").to_string().",
            "Finish with let book = Book { id: 1, title: String::from(\"Dune\"), status }; and println!(\"{:?}\", book);"
          ],
          "correction": "Compare the printed line with the expected one exactly. The derive attribute gives the format, so a difference usually means that the wrong variant was built.",
          "solution": "use std::io;\n\n#[derive(Debug)]\nenum Status {\n    Available,\n    Borrowed(String),\n    Lost,\n}\n\n#[derive(Debug)]\nstruct Book {\n    id: u32,\n    title: String,\n    status: Status,\n}\n\nfn main() {\n    let mut line = String::new();\n    io::stdin().read_line(&mut line).unwrap();\n    let mut words = line.split_whitespace();\n    let status = match words.next() {\n        Some(\"borrowed\") => Status::Borrowed(words.next().unwrap_or(\"nobody\").to_string()),\n        Some(\"lost\") => Status::Lost,\n        _ => Status::Available,\n    };\n    let book = Book { id: 1, title: String::from(\"Dune\"), status };\n    println!(\"{:?}\", book);\n}\n",
          "explanation": "The match turns the first word into a Status variant, and the Borrowed variant carries the name that follows. Debug formatting, from the derive, prints the struct and its enum field without any further code.",
          "cases": [
            {
              "stdin": "available\n",
              "expected": "Book { id: 1, title: \"Dune\", status: Available }"
            },
            {
              "stdin": "borrowed ann\n",
              "expected": "Book { id: 1, title: \"Dune\", status: Borrowed(\"ann\") }"
            },
            {
              "stdin": "lost\n",
              "expected": "Book { id: 1, title: \"Dune\", status: Lost }"
            }
          ]
        },
        {
          "id": "find-a-book",
          "title": "Find a book by its id",
          "prompt": "Write a function `title_for` that finds the title of the book with a given id. Ids start at 1, so id 1 is the first title in the slice. An id of 0, or one past the end, has no book, so return None for it.\n\nThe method `get` on a slice returns an Option<&&str>, and `copied()` turns that into an Option<&str>.",
          "lessonId": "option-and-missing-values",
          "conceptIds": [
            "rust-option"
          ],
          "sourceIds": [
            "book-option",
            "book-if-let"
          ],
          "kind": "function",
          "call": {
            "name": "title_for",
            "parameters": [
              {
                "name": "titles",
                "type": "&[&str]"
              },
              {
                "name": "id",
                "type": "usize"
              }
            ],
            "returns": "Option<&str>"
          },
          "starter": "fn title_for<'a>(titles: &[&'a str], id: usize) -> Option<&'a str> {\n    // Return the title with this id, if there is one.\n}\n",
          "hints": [
            "Id 0 has no book, and subtracting 1 from a usize 0 would panic, so test for it first.",
            "titles.get(id - 1) is an Option<&&str>. Add .copied() to get an Option<&str>."
          ],
          "correction": "If id 0 stops the program with a panic, the check for 0 has to come before the subtraction.",
          "solution": "fn title_for<'a>(titles: &[&'a str], id: usize) -> Option<&'a str> {\n    if id == 0 {\n        None\n    } else {\n        titles.get(id - 1).copied()\n    }\n}\n",
          "explanation": "get returns None for a position that does not exist, so ids past the end need no special case. Id 0 is handled first, because id - 1 would overflow, and the result is an Option, so the caller must decide what to do about a missing book.",
          "cases": [
            {
              "arguments": [
                "&[\"Dune\", \"Emma\"]",
                "2"
              ],
              "expected": "Some(\"Emma\")"
            },
            {
              "arguments": [
                "&[\"Dune\", \"Emma\"]",
                "9"
              ],
              "expected": "None"
            },
            {
              "arguments": [
                "&[\"Dune\", \"Emma\"]",
                "0"
              ],
              "expected": "None"
            },
            {
              "arguments": [
                "&[\"Dune\"]",
                "1"
              ],
              "expected": "Some(\"Dune\")"
            }
          ]
        },
        {
          "id": "check-out",
          "title": "Check out a book",
          "prompt": "Write a function `checkout` that tries to lend a book to a member. The book's state is a text: `available`, `borrowed` followed by the holder's name, or `lost`.\n\nIf it is available, return Ok with the text `NAME has it now`. If it is borrowed, return Err with `already borrowed by HOLDER`. If it is lost, return Err with `lost`. For any other state, return Err with `no such book`.\n\nThe method `strip_prefix(\"borrowed \")` returns the rest of the text as an Option when it starts that way.",
          "lessonId": "result-and-question-mark",
          "conceptIds": [
            "rust-result"
          ],
          "sourceIds": [
            "book-result",
            "book-panic-or-not"
          ],
          "kind": "function",
          "call": {
            "name": "checkout",
            "parameters": [
              {
                "name": "state",
                "type": "&str"
              },
              {
                "name": "member",
                "type": "&str"
              }
            ],
            "returns": "Result<String, String>"
          },
          "starter": "fn checkout(state: &str, member: &str) -> Result<String, String> {\n    // Lend the book if it is available, or say why not.\n}\n",
          "hints": [
            "Start with if state == \"available\", then use else if let Some(holder) = state.strip_prefix(\"borrowed \") for the second case.",
            "format!(\"{member} has it now\") builds the success text, and format!(\"already borrowed by {holder}\") the failure.",
            "Err needs a String, so write Err(String::from(\"lost\")) or \"lost\".to_string()."
          ],
          "correction": "If one state gives the wrong message, check the order of the tests and that each failure is wrapped in Err.",
          "solution": "fn checkout(state: &str, member: &str) -> Result<String, String> {\n    if state == \"available\" {\n        Ok(format!(\"{member} has it now\"))\n    } else if let Some(holder) = state.strip_prefix(\"borrowed \") {\n        Err(format!(\"already borrowed by {holder}\"))\n    } else if state == \"lost\" {\n        Err(String::from(\"lost\"))\n    } else {\n        Err(String::from(\"no such book\"))\n    }\n}\n",
          "explanation": "The function says in its type that it can fail and what a failure looks like. Each branch returns exactly one of Ok or Err, and strip_prefix both tests the state and gives the holder's name.",
          "cases": [
            {
              "arguments": [
                "\"available\"",
                "\"ann\""
              ],
              "expected": "Ok(\"ann has it now\")"
            },
            {
              "arguments": [
                "\"borrowed bo\"",
                "\"ann\""
              ],
              "expected": "Err(\"already borrowed by bo\")"
            },
            {
              "arguments": [
                "\"lost\"",
                "\"ann\""
              ],
              "expected": "Err(\"lost\")"
            },
            {
              "arguments": [
                "\"missing\"",
                "\"ann\""
              ],
              "expected": "Err(\"no such book\")"
            }
          ]
        },
        {
          "id": "loans-per-member",
          "title": "Loans per member",
          "prompt": "The input holds one member's name for every book that is out on loan, separated by whitespace. Count the loans for each member and print one line for each, in alphabetical order, in the form `NAME: COUNT`.\n\nFor the input `ann bo ann` the program prints `ann: 2` and then `bo: 1`.\n\nThe starter reads the whole input into `text`.",
          "lessonId": "collections",
          "conceptIds": [
            "rust-vec"
          ],
          "sourceIds": [
            "book-vectors",
            "book-strings"
          ],
          "kind": "program",
          "starter": "use std::collections::HashMap;\nuse std::io::{self, Read};\n\nfn main() {\n    let mut text = String::new();\n    io::stdin().read_to_string(&mut text).unwrap();\n    // Count the loans per name and print them in alphabetical order.\n}\n",
          "hints": [
            "Make a HashMap<&str, u32> and loop over text.split_whitespace().",
            "*counts.entry(name).or_insert(0) += 1; counts one loan.",
            "Collect the keys into a Vec, sort it, and print counts[*name] for each."
          ],
          "correction": "A HashMap has no fixed order, so if the lines come out in a different order from the expected one, sort the names before printing.",
          "solution": "use std::collections::HashMap;\nuse std::io::{self, Read};\n\nfn main() {\n    let mut text = String::new();\n    io::stdin().read_to_string(&mut text).unwrap();\n    let mut counts: HashMap<&str, u32> = HashMap::new();\n    for name in text.split_whitespace() {\n        *counts.entry(name).or_insert(0) += 1;\n    }\n    let mut names: Vec<&&str> = counts.keys().collect();\n    names.sort();\n    for name in names {\n        println!(\"{name}: {}\", counts[*name]);\n    }\n}\n",
          "explanation": "The entry method starts a new name at 0 and adds one for each loan. The keys of a HashMap come in no fixed order, so they are sorted before printing and the report is the same on every run.",
          "cases": [
            {
              "stdin": "ann bo ann\n",
              "expected": "ann: 2\nbo: 1"
            },
            {
              "stdin": "cy\n",
              "expected": "cy: 1"
            },
            {
              "stdin": "bo ann bo cy ann bo\n",
              "expected": "ann: 2\nbo: 3\ncy: 1"
            }
          ]
        }
      ]
    },
    {
      "id": "score-report",
      "version": "1.0.0",
      "title": "Score report",
      "description": "A wider version of the report program: parse score lines with Result, summarise entries and groups with a trait, pick the top scores with a generic function, and report averages with an iterator chain.",
      "tasks": [
        {
          "id": "parse-lines",
          "title": "Parse one line of scores",
          "prompt": "Write a function `parse_line` that turns a line such as `ann,8` into the name and the score. Spaces around either part are ignored.\n\nIf the line has no comma, return Err with `missing comma`. If the score is not a whole number, return Err with `bad score for NAME: ` followed by the message of the parse error.",
          "lessonId": "putting-it-together",
          "conceptIds": [
            "rust-program-design"
          ],
          "sourceIds": [
            "book-io-project",
            "book-modules"
          ],
          "kind": "function",
          "call": {
            "name": "parse_line",
            "parameters": [
              {
                "name": "line",
                "type": "&str"
              }
            ],
            "returns": "Result<(String, u32), String>"
          },
          "starter": "fn parse_line(line: &str) -> Result<(String, u32), String> {\n    // Split at the comma, trim both parts and parse the score.\n}\n",
          "hints": [
            "line.split_once(',') returns an Option of the two parts, and .ok_or(\"missing comma\")? turns None into an Err.",
            "score.trim().parse::<u32>() gives a Result, and .map_err(|e| format!(\"bad score for {}: {}\", name.trim(), e))? changes its error into a String.",
            "Finish with Ok((name.trim().to_string(), score))."
          ],
          "correction": "If the message for a bad score is wrong, check that the format! text matches exactly and that map_err comes before the ?.",
          "solution": "fn parse_line(line: &str) -> Result<(String, u32), String> {\n    let (name, score) = line.split_once(',').ok_or(\"missing comma\")?;\n    let score = score\n        .trim()\n        .parse::<u32>()\n        .map_err(|e| format!(\"bad score for {}: {}\", name.trim(), e))?;\n    Ok((name.trim().to_string(), score))\n}\n",
          "explanation": "Each step that can fail ends in a question mark, so the first failure leaves the function with its Err and the later steps run only for good input. map_err puts every error into the one type that the function promises.",
          "cases": [
            {
              "arguments": [
                "\"ann,8\""
              ],
              "expected": "Ok((\"ann\", 8))"
            },
            {
              "arguments": [
                "\"cy,x\""
              ],
              "expected": "Err(\"bad score for cy: invalid digit found in string\")"
            },
            {
              "arguments": [
                "\"dee\""
              ],
              "expected": "Err(\"missing comma\")"
            },
            {
              "arguments": [
                "\" bo , 7 \""
              ],
              "expected": "Ok((\"bo\", 7))"
            }
          ]
        },
        {
          "id": "a-summary-trait",
          "title": "A Summary trait",
          "prompt": "The starter defines `trait Summary` with one method, `summarise`, and two structs: `Entry` for one score and `Group` for all the scores of one name. Implement the trait for both.\n\nFor an Entry, `summarise` returns `NAME scored SCORE`. For a Group, it returns `NAME: AVERAGE (COUNT scores)`, with the average printed with one decimal place.\n\nThe program reads a line such as `ann 8 10`, and prints the summary of an Entry for the first score and then of the Group of all of them.",
          "lessonId": "traits-and-generics",
          "conceptIds": [
            "rust-traits"
          ],
          "sourceIds": [
            "book-generics",
            "book-traits"
          ],
          "kind": "program",
          "starter": "use std::io;\n\ntrait Summary {\n    fn summarise(&self) -> String;\n}\n\nstruct Entry {\n    name: String,\n    score: u32,\n}\n\nstruct Group {\n    name: String,\n    scores: Vec<u32>,\n}\n\n// Implement Summary for Entry and for Group here.\n\nfn main() {\n    let mut line = String::new();\n    io::stdin().read_line(&mut line).unwrap();\n    let mut words = line.split_whitespace();\n    let name = words.next().unwrap_or(\"nobody\").to_string();\n    let scores: Vec<u32> = words.map(|w| w.parse().unwrap_or(0)).collect();\n    let entry = Entry { name: name.clone(), score: scores[0] };\n    let group = Group { name, scores };\n    println!(\"{}\", entry.summarise());\n    println!(\"{}\", group.summarise());\n}\n",
          "hints": [
            "Write impl Summary for Entry { fn summarise(&self) -> String { ... } } and the same for Group.",
            "format!(\"{} scored {}\", self.name, self.score) builds the text for an Entry.",
            "For a Group, add the scores with self.scores.iter().sum::<u32>() as f64, divide by self.scores.len() as f64, and print the average with {:.1}."
          ],
          "correction": "If the average is printed with too many decimals, add :.1 inside the braces. If the count is wrong, use self.scores.len().",
          "solution": "use std::io;\n\ntrait Summary {\n    fn summarise(&self) -> String;\n}\n\nstruct Entry {\n    name: String,\n    score: u32,\n}\n\nstruct Group {\n    name: String,\n    scores: Vec<u32>,\n}\n\nimpl Summary for Entry {\n    fn summarise(&self) -> String {\n        format!(\"{} scored {}\", self.name, self.score)\n    }\n}\n\nimpl Summary for Group {\n    fn summarise(&self) -> String {\n        let total = self.scores.iter().sum::<u32>() as f64;\n        let average = total / self.scores.len() as f64;\n        format!(\"{}: {:.1} ({} scores)\", self.name, average, self.scores.len())\n    }\n}\n\nfn main() {\n    let mut line = String::new();\n    io::stdin().read_line(&mut line).unwrap();\n    let mut words = line.split_whitespace();\n    let name = words.next().unwrap_or(\"nobody\").to_string();\n    let scores: Vec<u32> = words.map(|w| w.parse().unwrap_or(0)).collect();\n    let entry = Entry { name: name.clone(), score: scores[0] };\n    let group = Group { name, scores };\n    println!(\"{}\", entry.summarise());\n    println!(\"{}\", group.summarise());\n}\n",
          "explanation": "The trait names one behaviour, and each type supplies its own body for it. main calls summarise in the same way on both, and each call runs the body that belongs to the value in front of the dot.",
          "cases": [
            {
              "stdin": "ann 8 10\n",
              "expected": "ann scored 8\nann: 9.0 (2 scores)"
            },
            {
              "stdin": "bo 6\n",
              "expected": "bo scored 6\nbo: 6.0 (1 scores)"
            },
            {
              "stdin": "cy 5 5 5 6\n",
              "expected": "cy scored 5\ncy: 5.2 (4 scores)"
            }
          ]
        },
        {
          "id": "generic-top-n",
          "title": "The top n of anything",
          "prompt": "Write a generic function `top_n` that returns the `n` largest items of a slice, largest first, as a new Vec. If the slice has fewer than `n` items, return all of them.\n\nIt must work for any type that can be compared and cloned, so the bounds are `T: PartialOrd + Clone`.",
          "lessonId": "traits-and-generics",
          "conceptIds": [
            "rust-traits"
          ],
          "sourceIds": [
            "book-generics",
            "book-traits"
          ],
          "kind": "function",
          "call": {
            "name": "top_n",
            "parameters": [
              {
                "name": "items",
                "type": "&[T]"
              },
              {
                "name": "n",
                "type": "usize"
              }
            ],
            "returns": "Vec<T>"
          },
          "starter": "fn top_n<T: PartialOrd + Clone>(items: &[T], n: usize) -> Vec<T> {\n    // Return the n largest items, largest first.\n}\n",
          "hints": [
            "items.to_vec() makes a Vec that you may sort, and it needs Clone.",
            "v.sort_by(|a, b| b.partial_cmp(a).unwrap()) sorts from largest to smallest.",
            "v.truncate(n) keeps at most n items, and returns nothing, so return v on the next line."
          ],
          "correction": "If the order is reversed, check that the closure compares b with a and not a with b. If the length is wrong, check truncate.",
          "solution": "fn top_n<T: PartialOrd + Clone>(items: &[T], n: usize) -> Vec<T> {\n    let mut v = items.to_vec();\n    v.sort_by(|a, b| b.partial_cmp(a).unwrap());\n    v.truncate(n);\n    v\n}\n",
          "explanation": "The bounds promise what the body uses: Clone for to_vec and PartialOrd for partial_cmp. Comparing b with a reverses the order, and truncate leaves the whole Vec alone when it holds fewer than n items.",
          "cases": [
            {
              "arguments": [
                "&[8, 6, 10, 7]",
                "2"
              ],
              "expected": "[10, 8]"
            },
            {
              "arguments": [
                "&[1.5, 0.5, 2.5]",
                "1"
              ],
              "expected": "[2.5]"
            },
            {
              "arguments": [
                "&['a', 'c', 'b']",
                "2"
              ],
              "expected": "['c', 'b']"
            },
            {
              "arguments": [
                "&[3]",
                "5"
              ],
              "expected": "[3]"
            }
          ]
        },
        {
          "id": "report-with-iterators",
          "title": "Averages with a minimum",
          "prompt": "Write a function `averages` that takes a slice of score lists, one list per person, and a minimum count. It returns the average of each list that has at least that many scores, in the same order.\n\nUse an iterator chain with `filter`, `map` and `collect`. The closure given to `filter` is where the minimum is used.",
          "lessonId": "closures-and-iterators",
          "conceptIds": [
            "rust-closures"
          ],
          "sourceIds": [
            "book-closures",
            "book-iterators"
          ],
          "kind": "function",
          "call": {
            "name": "averages",
            "parameters": [
              {
                "name": "lists",
                "type": "&[Vec<u32>]"
              },
              {
                "name": "min",
                "type": "usize"
              }
            ],
            "returns": "Vec<f64>"
          },
          "starter": "fn averages(lists: &[Vec<u32>], min: usize) -> Vec<f64> {\n    // Average each list that has at least min scores.\n}\n",
          "hints": [
            "lists.iter().filter(|l| l.len() >= min) keeps the long enough lists, and the closure captures min.",
            "map(|l| l.iter().sum::<u32>() as f64 / l.len() as f64) turns a list into its average.",
            "End with .collect(), and the return type tells it to build a Vec<f64>."
          ],
          "correction": "If a list that is too short appears in the result, check that the filter comes before the map. If a decimal is cut short, convert the sum with as f64 before dividing.",
          "solution": "fn averages(lists: &[Vec<u32>], min: usize) -> Vec<f64> {\n    lists\n        .iter()\n        .filter(|l| l.len() >= min)\n        .map(|l| l.iter().sum::<u32>() as f64 / l.len() as f64)\n        .collect()\n}\n",
          "explanation": "The filter closure captures min from the function's parameters and keeps only the lists that are long enough. The map computes each average, and collect gathers them, so no loop or intermediate Vec is written.",
          "cases": [
            {
              "arguments": [
                "&[vec![8, 10], vec![6], vec![6, 7]]",
                "2"
              ],
              "expected": "[9.0, 6.5]"
            },
            {
              "arguments": [
                "&[vec![8, 10], vec![6], vec![6, 7]]",
                "1"
              ],
              "expected": "[9.0, 6.0, 6.5]"
            },
            {
              "arguments": [
                "&[vec![8, 10], vec![6], vec![6, 7]]",
                "3"
              ],
              "expected": "[]"
            },
            {
              "arguments": [
                "&[vec![2, 3, 6]]",
                "1"
              ],
              "expected": "[3.6666666666666665]"
            }
          ]
        }
      ]
    }
  ],
};
