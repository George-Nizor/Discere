import type {
  CourseCheckDefinition,
  LanguageModel,
} from "../../../packages/contracts/src/index.js";
import { arc, clause, clauses, compress, passage, texts, toulmin, voice } from "./definition.js";
import { languageLessons } from "./lessons.js";
import { scansions } from "./poetry.js";

type Item = CourseCheckDefinition["items"][number];
function base(id: string, lessonIndex: number, prompt: string, model: LanguageModel) {
  const lesson = languageLessons[lessonIndex]!;
  return {
    lessonId: lesson.id,
    visual: { type: "language" as const, model },
    question: {
      id: "lang-check-" + id,
      conceptIds: ["lang-" + lesson.id],
      sourceIds: lesson.sourceIds,
      prompt,
      difficulty: 1,
      hints: [] as never[],
    },
  };
}
function count(
  id: string,
  lessonIndex: number,
  prompt: string,
  model: LanguageModel,
  value: number,
  workedAnswer: string,
): Item {
  const item = base(id, lessonIndex, prompt, model);
  return {
    ...item,
    question: {
      ...item.question,
      responseType: "numeric",
      answerAuthority: {
        kind: "numeric",
        value,
        unit: "",
        absoluteTolerance: 1e-6,
        relativeTolerance: 0,
        workedAnswer,
      },
    },
  };
}
function pick(
  id: string,
  lessonIndex: number,
  prompt: string,
  model: LanguageModel,
  labels: string[],
  correct: number,
  reason: string,
): Item {
  const item = base(id, lessonIndex, prompt, model);
  return {
    ...item,
    question: {
      ...item.question,
      responseType: "short_text",
      choices: labels.map((label, i) => ({ id: String(i + 1), label })),
      answerAuthority: {
        kind: "text",
        acceptedIdeas: [labels[correct]!],
        rejectedIdeas: [],
        exampleAnswer: reason,
      },
    },
  };
}

const ironies = ["Verbal irony", "Dramatic irony", "Situational irony"];
const figures = ["Chiasmus", "Anaphora", "Antithesis"];
const required = languageLessons.map((l) => l.id);

export const languageChecks: CourseCheckDefinition[] = [
  {
    id: "starting-point",
    kind: "placement",
    title: "Find your starting point",
    description:
      "Twelve problems on sentences, argument, poetry and narrative. Find which ideas you already command and which need a lesson.",
    requiredLessonIds: [],
    items: [
      count(
        "placement-verbs",
        0,
        "How many finite verbs are in Wordsworth's 'I wandered lonely as a Cloud / That floats on high o'er Vales and Hills'?",
        clauses(
          [
            clause("I", "[s I] [v wandered] [m lonely] [m as a Cloud]"),
            clause("D", "[x That] [v floats] [m on high o'er Vales and Hills]"),
          ],
          { source: "Wordsworth, 1807" },
        ),
        2,
        "Two: 'wandered' and 'floats'. 'That floats' is a relative clause describing the cloud.",
      ),
      pick(
        "placement-splice",
        1,
        "'The lecture ended, the students left.' What is wrong with this sentence in edited prose?",
        clauses(
          [clause("I", "[s The lecture] [v ended]"), clause("I", "[s the students] [v left.]")],
          { join: { mark: "comma", conjunction: "and", relation: "adds" } },
        ),
        ["It is a comma splice", "It is a sentence fragment", "Nothing: the comma is standard"],
        0,
        "A comma splice: two independent clauses joined by a comma alone.",
      ),
      count(
        "placement-voice",
        2,
        "'The results were checked by two reviewers.' How many words does the active version have?",
        voice("two reviewers", "checked", "were checked", "the results", "passive"),
        5,
        "Five: 'Two reviewers checked the results.'",
      ),
      pick(
        "placement-warrant",
        3,
        "Statements: 'Most commuters reach the station before eight.' 'The station café should open at seven.' 'A café should open when its customers arrive.' Which statement is the warrant?",
        toulmin(
          ["grounds", "Most commuters reach the station before eight."],
          ["claim", "The station café should open at seven."],
          ["warrant", "A café should open when its customers arrive."],
        ),
        [
          "Most commuters reach the station before eight.",
          "The station café should open at seven.",
          "A café should open when its customers arrive.",
        ],
        2,
        "The general rule 'A café should open when its customers arrive' links the commuting fact to the claim about opening hours.",
      ),
      count(
        "placement-score",
        4,
        "A speaker in 1856 wants to refer to 1776 in Lincoln's manner. How many score years ago is that?",
        passage(
          "Lincoln, Gettysburg, 19 November 1863",
          "appeal",
          "{kairos Four score and seven years ago} our fathers brought forth on this continent, a new nation,",
        ),
        4,
        "1856 − 1776 = 80 years, and 80 ÷ 20 = 4 score.",
      ),
      pick(
        "placement-figure",
        5,
        "'Never let a fool kiss you or a kiss fool you.' Which figure is this?",
        passage(
          "Proverb",
          "figure",
          "Never let a {chiasmus:a fool} {chiasmus:b kiss} you or a {chiasmus:b kiss} {chiasmus:a fool} you.",
        ),
        figures,
        0,
        "Chiasmus: fool, kiss / kiss, fool. The same words return in reverse order.",
      ),
      count(
        "placement-syllables",
        6,
        "How many syllables are in Keats's 'Season of mists and mellow fruitfulness'?",
        scansions.mists,
        10,
        "Ten: sea / son / of / mists / and / mel / low / fruit / ful / ness.",
      ),
      pick(
        "placement-simile",
        7,
        "Wordsworth writes 'I wandered lonely as a Cloud'. Which figure is this?",
        passage(
          "Wordsworth, 'I wandered lonely as a Cloud'",
          "image",
          "I wandered lonely {simile as a Cloud}",
        ),
        ["Simile", "Metaphor", "Alliteration"],
        0,
        "A simile: 'as' makes the comparison explicit.",
      ),
      count(
        "placement-octave",
        8,
        "A Petrarchan octave rhymes ABBAABBA. How many of its eight lines end on the A rhyme?",
        texts.milton,
        4,
        "Four: lines 1, 4, 5 and 8.",
      ),
      pick(
        "placement-person",
        9,
        "Poe's narrator begins 'True!—nervous—very, very dreadfully nervous I had been and am'. In which grammatical person is the story told?",
        passage(
          "Poe, 'The Tell-Tale Heart'",
          "narration",
          "{narration True!—nervous—very, very dreadfully nervous I had been and am;}",
        ),
        ["First person", "Second person", "Third person"],
        0,
        "First person: the narrator is a character who says 'I'.",
      ),
      pick(
        "placement-irony",
        10,
        "Looking out at a downpour, a friend says, 'Lovely weather for a picnic.' Which kind of irony is this?",
        passage("An everyday remark", "irony", "{irony Lovely weather for a picnic.}"),
        ironies,
        0,
        "Verbal irony: the speaker says the opposite of what is meant.",
      ),
      count(
        "placement-turns",
        11,
        "Five scenes open and close with these values for the hero: + to −, − to −, − to +, + to +, + to −. How many scenes turn?",
        arc("A five-scene story", [
          ["Scene 1", 3, "+", "-"],
          ["Scene 2", 5, "-", "-"],
          ["Scene 3", 8, "-", "+"],
          ["Scene 4", 6, "+", "+"],
          ["Scene 5", 2, "+", "-"],
        ]),
        3,
        "Three: scenes 1, 3 and 5 change their value; scenes 2 and 4 hold it.",
      ),
    ],
  },
  {
    id: "mixed-challenge",
    kind: "checkpoint",
    title: "Use every idea together",
    description:
      "Twelve fresh problems after all twelve lessons. Each one asks you to count, label or choose from a text you have not answered before.",
    requiredLessonIds: required,
    items: [
      pick(
        "mixed-vocative",
        0,
        "Keats opens 'To Autumn' with 'Season of mists and mellow fruitfulness, / Close bosom-friend of the maturing sun;'. What do these two lines lack that a clause needs?",
        passage(
          "Keats, 'To Autumn', lines 1 and 2",
          "image",
          "Season of mists and mellow fruitfulness,",
          "Close bosom-friend of the maturing sun;",
        ),
        ["A finite verb", "A noun", "An adjective"],
        0,
        "A finite verb: the lines address autumn in noun phrases, and no subject is paired with a finite verb.",
      ),
      count(
        "mixed-clauses",
        1,
        "How many independent clauses are in 'Lincoln spoke briefly; the previous speaker had spoken for two hours, and the crowd was tired.'?",
        clauses([
          clause("I", "[s Lincoln] [v spoke] [m briefly;]"),
          clause("I", "[s the previous speaker] [v had spoken] [m for two hours,]"),
          clause("I", "[j and] [s the crowd] [v was] [c tired.]"),
        ]),
        3,
        "Three: each has its own subject and finite verb, joined by a semicolon and then by ', and'.",
      ),
      count(
        "mixed-nominal",
        2,
        "Revise 'The team carried out an analysis of the data' to 'The team analysed the data'. How many words are saved?",
        compress("The team", ["carried out an analysis of", "analysed"], "the data."),
        4,
        "Nine words become five; four are saved.",
      ),
      count(
        "mixed-claim",
        3,
        "Statements: (1) Unless the survey sample was biased. (2) The library should extend its evening hours. (3) Seventy per cent of surveyed members asked for evening opening. (4) A public service should open when its users can come. Give the number of the statement that is the claim.",
        toulmin(
          ["rebuttal", "Unless the survey sample was biased."],
          ["claim", "The library should extend its evening hours."],
          ["grounds", "Seventy per cent of surveyed members asked for evening opening."],
          ["warrant", "A public service should open when its users can come."],
        ),
        2,
        "Statement 2 is the claim; 3 is the grounds, 4 the warrant and 1 the rebuttal.",
      ),
      pick(
        "mixed-kairos",
        4,
        "A campaigner for flood defences gives her speech in the town square the morning after a flood. Which appeal does her timing exploit?",
        passage(
          "An original example",
          "appeal",
          "{kairos This morning, with the water still in your cellars,} I ask you to fund the new embankment.",
        ),
        ["Kairos", "Logos", "Ethos"],
        0,
        "Kairos: the speech uses the moment, when the danger is fresh and visible.",
      ),
      count(
        "mixed-anaphora",
        5,
        "How many clauses open with 'your' in Douglass's 'To him, your celebration is a sham; your boasted liberty, an unholy license; your national greatness, swelling vanity; your sounds of rejoicing are empty and heartless'?",
        passage(
          "Douglass, Rochester, 5 July 1852",
          "figure",
          "To him, {anaphora:a your} celebration is a sham; {anaphora:a your} boasted liberty, an unholy license;",
          "{anaphora:a your} national greatness, swelling vanity; {anaphora:a your} sounds of rejoicing are empty and heartless;",
        ),
        4,
        "Four: celebration, liberty, greatness and sounds each follow 'your'.",
      ),
      count(
        "mixed-feminine",
        6,
        "How many syllables are in Hamlet's 'To be, or not to be, that is the question'?",
        scansions.question,
        11,
        "Eleven: five iambs and an extra unstressed '-tion', a feminine ending.",
      ),
      count(
        "mixed-alliteration",
        7,
        "In Sonnet 30's 'And with old woes new wail my dear time's waste', how many words begin with the w sound?",
        passage(
          "Shakespeare, Sonnet 30, line 4",
          "sound",
          "And {alliteration:a with} old {alliteration:a woes} new {alliteration:a wail} my dear time's {alliteration:a waste}:",
        ),
        4,
        "Four: 'with', 'woes', 'wail' and 'waste'.",
      ),
      count(
        "mixed-couplet",
        8,
        "Sonnet 130 rhymes ABAB CDCD EFEF GG. On which line does the G rhyme first appear?",
        texts.sonnet130,
        13,
        "Line 13: the twelve lines of the three quatrains come first, and the couplet starts at line 13.",
      ),
      pick(
        "mixed-free-indirect",
        9,
        "Which sentence is free indirect discourse?",
        passage(
          "Three versions of one thought",
          "narration",
          "{free_indirect She was never going back to that house!}",
          "{direct_speech “I am never going back,” she said.}",
          "{narration She said that she would not go back.}",
        ),
        [
          "She was never going back to that house!",
          "“I am never going back,” she said.",
          "She said that she would not go back.",
        ],
        0,
        "The first: the character's own exclamation in the third person and past tense, without a reporting verb.",
      ),
      pick(
        "mixed-situational",
        10,
        "A fire station burns down because its own alarm had been switched off for maintenance. Which kind of irony is this?",
        passage(
          "An original example",
          "irony",
          "The fire station burned down; {irony its own alarm had been switched off for maintenance.}",
        ),
        ironies,
        2,
        "Situational irony: the outcome reverses what the building exists to prevent.",
      ),
      count(
        "mixed-climax",
        11,
        "Six numbered scenes reach these heights on Freytag's pyramid: 3, 5, 9, 6, 4, 2. Which scene is the climax?",
        arc("A six-scene tragedy", [
          ["Scene 1", 3, "-", "+"],
          ["Scene 2", 5, "+", "+"],
          ["Scene 3", 9, "+", "-"],
          ["Scene 4", 6, "-", "-"],
          ["Scene 5", 4, "-", "+"],
          ["Scene 6", 2, "+", "-"],
        ]),
        3,
        "Scene 3, the highest point.",
      ),
    ],
  },
  {
    id: "later-applications",
    kind: "transfer",
    title: "Use it a week later",
    description:
      "Twelve new texts and arguments, a week after the mixed check. Read each one cold and apply the idea without the lesson beside you.",
    requiredLessonIds: required,
    afterCheckId: "mixed-challenge",
    delayDays: 7,
    items: [
      pick(
        "later-subject",
        0,
        "Lincoln: 'The brave men, living and dead, who struggled here, have consecrated it.' What is the subject of 'have consecrated'?",
        clauses([
          clause("I", "[s The brave men,] [m living and dead,]"),
          clause("D", "[x who] [v struggled] [m here,]"),
          clause("I", "[v have consecrated] [o it.]"),
        ]),
        ["The brave men", "who", "it"],
        0,
        "'The brave men' is the subject; 'who struggled here' is a relative clause describing them, and 'it' is the object.",
      ),
      pick(
        "later-repair",
        1,
        "Which repair of the comma splice 'The bridge was closed, traffic backed up for miles' states the cause?",
        clauses(
          [
            clause("I", "[s The bridge] [v was closed]"),
            clause("I", "[s traffic] [v backed up] [m for miles.]"),
          ],
          { join: { mark: "comma", conjunction: "so", relation: "cause" } },
        ),
        [
          "The bridge was closed, so traffic backed up for miles.",
          "The bridge was closed, traffic, backed up for miles.",
          "The bridge was closed: and traffic backed up for miles.",
        ],
        0,
        "', so' names the result and makes the sentence standard.",
      ),
      count(
        "later-active",
        2,
        "'The decision was taken by the board.' How many words does the active version have?",
        voice("the board", "took", "was taken", "the decision", "passive"),
        5,
        "Five: 'The board took the decision.'",
      ),
      pick(
        "later-rebuttal",
        3,
        "'The reservoir will probably run dry by August, unless the drought ends.' What role does 'unless the drought ends' play in Toulmin's model?",
        toulmin(
          ["claim", "The reservoir will run dry by August."],
          ["qualifier", "Probably."],
          ["rebuttal", "Unless the drought ends."],
        ),
        ["Rebuttal", "Grounds", "Warrant"],
        0,
        "Rebuttal: it names the condition under which the claim would fail.",
      ),
      pick(
        "later-pathos",
        4,
        "A fundraising appeal opens: 'Picture a child walking four miles for water every morning.' Which appeal does it make first?",
        passage(
          "An original example",
          "appeal",
          "{pathos Picture a child walking four miles for water every morning.}",
        ),
        ["Pathos", "Ethos", "Logos"],
        0,
        "Pathos: the image is meant to move the reader before any argument is made.",
      ),
      pick(
        "later-antithesis",
        5,
        "Douglass: 'You may rejoice, I must mourn.' Which figure sets the two clauses against each other?",
        passage(
          "Douglass, Rochester, 5 July 1852",
          "figure",
          "{antithesis:a You may rejoice,} {antithesis:a I must mourn.}",
        ),
        figures,
        2,
        "Antithesis: opposed ideas, rejoicing and mourning, you and I, in parallel clauses.",
      ),
      count(
        "later-beats",
        6,
        "How many beats are in 'Double, double, toil and trouble'?",
        scansions.double,
        4,
        "Four: DOU-ble DOU-ble TOIL and TROU-ble, trochaic tetrameter.",
      ),
      pick(
        "later-metaphor",
        7,
        "Sonnet 18 calls the sun 'the eye of heaven'. Which figure is this?",
        passage(
          "Shakespeare, Sonnet 18, line 5",
          "image",
          "Sometime too hot {metaphor the eye of heaven} shines,",
        ),
        ["Metaphor", "Simile", "Assonance"],
        0,
        "A metaphor: the sun is named as heaven's eye, with no 'like' or 'as'.",
      ),
      count(
        "later-quatrains",
        8,
        "How many lines do the three quatrains of a Shakespearean sonnet contain together?",
        texts.sonnet18,
        12,
        "Twelve: three quatrains of four lines, before the couplet.",
      ),
      count(
        "later-free-indirect",
        9,
        "(1) “I will not go,” said Clara. (2) Clara folded the letter and set it aside. (3) Go to the ball, with him watching? Never! Give the number of the sentence that is free indirect discourse.",
        passage(
          "An original example",
          "narration",
          "{direct_speech (1) “I will not go,” said Clara.}",
          "{narration (2) Clara folded the letter and set it aside.}",
          "{free_indirect (3) Go to the ball, with him watching? Never!}",
        ),
        3,
        "Sentence 3 carries Clara's own question and exclamation without quotation marks or a reporting verb.",
      ),
      pick(
        "later-unreliable",
        10,
        "A narrator insists 'I never lie' and contradicts his own account twice in the first chapter. Which term fits him?",
        passage(
          "An original example",
          "irony",
          "{irony I never lie.} I was at home all evening. When I left the inn at ten, the street was empty.",
        ),
        ["Unreliable narrator", "Omniscient narrator", "Free indirect narrator"],
        0,
        "An unreliable narrator: the account itself gives the reader reason to distrust it.",
      ),
      pick(
        "later-falling",
        11,
        "In a heist story the alarm sounds at the high point and the crew flees. Where on Freytag's pyramid does the chase that follows belong?",
        arc("A heist in six scenes", [
          ["The plan", 2, "-", "+"],
          ["The crew", 4, "+", "+"],
          ["Inside the vault", 7, "+", "+"],
          ["The alarm", 10, "+", "-"],
          ["The chase", 6, "-", "-"],
          ["The split", 3, "-", "+"],
        ]),
        ["Falling action", "Rising action", "Exposition"],
        0,
        "Falling action: it comes after the climax and carries the story down to its end.",
      ),
    ],
  },
];
