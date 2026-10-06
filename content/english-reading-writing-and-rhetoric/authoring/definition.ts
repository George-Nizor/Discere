import type {
  CourseBundle,
  LanguageDiagram,
  LanguageModel,
  LanguageRole,
  Question,
} from "../../../packages/contracts/src/index.js";

export type DraftQuestion = Omit<Question, "id" | "conceptIds" | "sourceIds">;
export interface TeachingLesson {
  id: string;
  title: string;
  summary: string;
  moduleId: string;
  sourceIds: string[];
  beats: Array<{ title: string; text: string; diagram: LanguageDiagram }>;
  questions: DraftQuestion[];
  cards: Array<{ front: string; back: string; answerAuthority: Question["answerAuthority"] }>;
}

// ---------------------------------------------------------------- questions and cards

export function numeric(
  prompt: string,
  value: number,
  workedAnswer: string,
  hints: [string, string, string],
): DraftQuestion {
  return {
    prompt,
    responseType: "numeric",
    difficulty: 1,
    hints,
    answerAuthority: {
      kind: "numeric",
      value,
      unit: "",
      absoluteTolerance: 1e-6,
      relativeTolerance: 0,
      workedAnswer,
    },
  };
}
/** A short written answer: one canonical word or phrase, with optional equivalent terms. */
export function word(
  prompt: string,
  accepted: [string, ...string[]],
  exampleAnswer: string,
  hint: string,
): DraftQuestion {
  return {
    prompt,
    responseType: "short_text",
    difficulty: 1,
    hints: [hint],
    answerAuthority: {
      kind: "text",
      acceptedIdeas: [accepted[0]],
      ...(accepted.length > 1 ? { acceptedAlternatives: accepted.slice(1) } : {}),
      rejectedIdeas: [],
      exampleAnswer,
    },
  };
}
export function choose(
  prompt: string,
  labels: string[],
  correct: number,
  reason: string,
  hint: string,
): DraftQuestion {
  return {
    prompt,
    responseType: "short_text",
    difficulty: 1,
    hints: [hint],
    choices: labels.map((label, i) => ({ id: String(i + 1), label })),
    answerAuthority: {
      kind: "text",
      acceptedIdeas: [labels[correct]!],
      rejectedIdeas: [],
      exampleAnswer: reason,
    },
  };
}
export function card(front: string, value: number, back: string) {
  return {
    front,
    back,
    answerAuthority: {
      kind: "numeric" as const,
      value,
      unit: "",
      absoluteTolerance: 1e-6,
      relativeTolerance: 0,
      workedAnswer: back,
    },
  };
}
export function term(front: string, accepted: [string, ...string[]], back: string) {
  return {
    front,
    back,
    answerAuthority: {
      kind: "text" as const,
      acceptedIdeas: [accepted[0]],
      ...(accepted.length > 1 ? { acceptedAlternatives: accepted.slice(1) } : {}),
      rejectedIdeas: [],
      exampleAnswer: back,
    },
  };
}
export function beat(
  title: string,
  text: string,
  ...cases: Array<[string, LanguageModel]>
): TeachingLesson["beats"][number] {
  const ids = ["first", "second", "third"];
  return {
    title,
    text,
    diagram: {
      type: "language_explorer",
      cases: cases.map(([label, model], i) => ({ id: ids[i]!, label, model })),
      initialCaseId: "first",
    },
  };
}

// ---------------------------------------------------------------- model shorthand

const roleCodes: Record<string, LanguageRole> = {
  s: "subject",
  v: "verb",
  o: "object",
  c: "complement",
  m: "modifier",
  x: "subordinator",
  j: "conjunction",
  p: "other",
};
/** `clause("I", "[s Every fair] [m from fair] [v declines]")`: I independent, D dependent. */
export function clause(kind: "I" | "D", parts: string) {
  return {
    kind: kind === "I" ? ("independent" as const) : ("dependent" as const),
    parts: [...parts.matchAll(/\[([a-z]) ([^\]]+)\]/gu)].map((m) => ({
      text: m[2]!,
      role: roleCodes[m[1]!]!,
    })),
  };
}
export function clauses(
  list: ReturnType<typeof clause>[],
  extra: { source?: string; join?: Extract<LanguageModel, { kind: "clauses" }>["join"] } = {},
): LanguageModel {
  return { kind: "clauses", clauses: list, ...extra };
}
export const voice = (
  agent: string,
  active: string,
  passive: string,
  patient: string,
  display: "active" | "passive" | "agentless",
  tail?: string,
): LanguageModel => ({
  kind: "voice",
  agent,
  active,
  passive,
  patient,
  display,
  ...(tail ? { tail } : {}),
});
/** `compress("The committee", ["made a decision", "decided"], "to", ["-In my view"])`. */
export function compress(...parts: Array<string | [string, string] | [string]>): LanguageModel {
  return {
    kind: "compress",
    segments: parts.map((p) =>
      typeof p === "string"
        ? { text: p, edit: "keep" as const }
        : p.length === 1
          ? { text: p[0], edit: "cut" as const }
          : { text: p[0], edit: "replace" as const, replacement: p[1] },
    ),
  };
}
type ToulminRole = "claim" | "grounds" | "warrant" | "backing" | "qualifier" | "rebuttal";
export const toulmin = (...statements: Array<[ToulminRole, string]>): LanguageModel => ({
  kind: "toulmin",
  statements: statements.map(([role, text]) => ({ role, text })),
});
type Lens = Extract<LanguageModel, { kind: "passage" }>["lens"];
/** Lines use `{mark:group text}` or `{mark text}` for marked spans. */
export function passage(source: string, lens: Lens, ...lines: string[]): LanguageModel {
  return {
    kind: "passage",
    source,
    lens,
    lines: lines.map((line) => {
      const spans: Array<{ text: string; mark?: never; group?: string } | Record<string, string>> =
        [];
      let at = 0;
      for (const m of line.matchAll(/\{([a-z_]+)(?::([a-z]))? ([^}]+)\}/gu)) {
        if (m.index > at) spans.push({ text: line.slice(at, m.index) });
        spans.push({ text: m[3]!, mark: m[1]!, ...(m[2] ? { group: m[2] } : {}) });
        at = m.index + m[0].length;
      }
      if (at < line.length) spans.push({ text: line.slice(at) });
      return { spans } as Extract<LanguageModel, { kind: "passage" }>["lines"][number];
    }),
  };
}
/** `scan(source, "Shall /I com-/pare thee /to a /sum-mer's /day?")`: `/` marks a beat. */
export function scan(source: string, line: string): LanguageModel {
  const syllables = line.split(/\s+/u).flatMap((w) => {
    const pieces = w.split("-");
    return pieces.map((piece, i) => ({
      text: piece.replace(/^\//u, ""),
      stress: piece.startsWith("/"),
      wordEnd: i === pieces.length - 1,
    }));
  });
  return { kind: "scansion", source, syllables };
}
export const sonnet = (
  source: string,
  turn: number,
  lines: Array<[string, string]>,
): LanguageModel => ({
  kind: "sonnet",
  source,
  turn,
  lines: lines.map(([text, sound]) => ({ text, sound })),
});
export const irony = (
  source: string,
  speaker: string,
  line: string,
  said: string,
  known: string,
  knower: "audience" | "speaker" | "reader" = "audience",
): LanguageModel => ({ kind: "irony", source, speaker, line, said, known, knower });
export const arc = (
  title: string,
  scenes: Array<[string, number, "+" | "-", "+" | "-"]>,
): LanguageModel => ({
  kind: "arc",
  title,
  scenes: scenes.map(([label, rise, opens, closes]) => ({ label, rise, opens, closes })),
});

// ---------------------------------------------------------------- shared texts

export const texts = {
  sonnet18: sonnet("Shakespeare, Sonnet 18", 9, [
    ["Shall I compare thee to a summer’s day?", "ay"],
    ["Thou art more lovely and more temperate:", "ate"],
    ["Rough winds do shake the darling buds of May,", "ay"],
    ["And summer’s lease hath all too short a date:", "ate"],
    ["Sometime too hot the eye of heaven shines,", "ines"],
    ["And often is his gold complexion dimm’d,", "immed"],
    ["And every fair from fair sometime declines,", "ines"],
    ["By chance, or nature’s changing course untrimm’d:", "immed"],
    ["But thy eternal summer shall not fade,", "ade"],
    ["Nor lose possession of that fair thou ow’st,", "owst"],
    ["Nor shall death brag thou wander’st in his shade,", "ade"],
    ["When in eternal lines to time thou grow’st,", "owst"],
    ["So long as men can breathe, or eyes can see,", "ee"],
    ["So long lives this, and this gives life to thee.", "ee"],
  ]),
  sonnet29: sonnet("Shakespeare, Sonnet 29", 9, [
    ["When in disgrace with fortune and men’s eyes", "ies"],
    ["I all alone beweep my outcast state,", "ate"],
    ["And trouble deaf heaven with my bootless cries,", "ies"],
    ["And look upon myself, and curse my fate,", "ate"],
    ["Wishing me like to one more rich in hope,", "ope"],
    ["Featur’d like him, like him with friends possess’d,", "est"],
    ["Desiring this man’s art, and that man’s scope,", "ope"],
    ["With what I most enjoy contented least;", "est"],
    ["Yet in these thoughts my self almost despising,", "ising"],
    ["Haply I think on thee, and then my state,", "ate"],
    ["Like to the lark at break of day arising", "ising"],
    ["From sullen earth, sings hymns at heaven’s gate;", "ate"],
    ["For thy sweet love remember’d such wealth brings", "ings"],
    ["That then I scorn to change my state with kings.", "ings"],
  ]),
  sonnet130: sonnet("Shakespeare, Sonnet 130", 13, [
    ["My mistress’ eyes are nothing like the sun;", "un"],
    ["Coral is far more red, than her lips red:", "ed"],
    ["If snow be white, why then her breasts are dun;", "un"],
    ["If hairs be wires, black wires grow on her head.", "ed"],
    ["I have seen roses damask’d, red and white,", "ite"],
    ["But no such roses see I in her cheeks;", "eeks"],
    ["And in some perfumes is there more delight", "ite"],
    ["Than in the breath that from my mistress reeks.", "eeks"],
    ["I love to hear her speak, yet well I know", "ow"],
    ["That music hath a far more pleasing sound:", "ound"],
    ["I grant I never saw a goddess go;", "ow"],
    ["My mistress, when she walks, treads on the ground:", "ound"],
    ["And yet by heaven, I think my love as rare,", "are"],
    ["As any she belied with false compare.", "are"],
  ]),
  milton: sonnet("Milton, ‘When I consider’", 8, [
    ["When I consider how my light is spent,", "ent"],
    ["E’re half my days, in this dark world and wide,", "ide"],
    ["And that one Talent which is death to hide,", "ide"],
    ["Lodg’d with me useless, though my Soul more bent", "ent"],
    ["To serve therewith my Maker, and present", "ent"],
    ["My true account, least he returning chide,", "ide"],
    ["Doth God exact day-labour, light deny’d,", "ide"],
    ["I fondly ask; But patience to prevent", "ent"],
    ["That murmur, soon replies, God doth not need", "eed"],
    ["Either man’s work or his own gifts, who best", "est"],
    ["Bear his milde yoak, they serve him best, his State", "ate"],
    ["Is Kingly. Thousands at his bidding speed", "eed"],
    ["And post o’re Land and Ocean without rest:", "est"],
    ["They also serve who only stand and waite.", "ate"],
  ]),
};

// ---------------------------------------------------------------- sources

const reference = "reference_only" as const;
const openstax = (
  id: string,
  section: string,
  slug: string,
  claim: string,
): CourseBundle["sources"][number] => ({
  id,
  title: "Writing Guide with Handbook, " + section,
  publisher: "OpenStax, Rice University",
  url: "https://openstax.org/books/writing-guide/pages/" + slug,
  section,
  edition: "Writing Guide with Handbook, first edition (2021), current web version",
  accessedAt: "2026-10-06",
  reuse: reference,
  licence: "CC BY-NC-SA 4.0; reference only",
  licenceUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  attribution:
    "Michelle Bachelor Robinson, Maria Jerskey and Toby Fulwiler, OpenStax, Writing Guide with Handbook, " +
    section +
    ".",
  notes:
    claim +
    " The OpenStax licence page and book metadata were checked on 2026-10-06: the book is CC BY-NC-SA 4.0, so it is used for checking only. Discere prose, examples and exercises are original.",
});
const wikipedia = (
  id: string,
  title: string,
  section: string,
  claim: string,
): CourseBundle["sources"][number] => ({
  id,
  title: "Wikipedia: " + title,
  publisher: "Wikimedia Foundation",
  url: "https://en.wikipedia.org/wiki/" + title.replaceAll(" ", "_"),
  section,
  edition: "Live article, revision current on 2026-10-06",
  accessedAt: "2026-10-06",
  reuse: reference,
  licence: "CC BY-SA 4.0; reference only",
  licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  attribution: "Wikipedia contributors, ‘" + title + "’, " + section + ".",
  notes: claim + " Used to check a definition or attribution; no article text is reproduced.",
});
const gutenberg = (
  id: string,
  title: string,
  author: string,
  ebook: number,
  section: string,
  claim: string,
): CourseBundle["sources"][number] => ({
  id,
  title,
  publisher: "Project Gutenberg",
  url: "https://www.gutenberg.org/ebooks/" + ebook,
  section,
  edition: "Project Gutenberg eBook #" + ebook,
  accessedAt: "2026-10-06",
  reuse: "adaptable",
  licence: "Public domain",
  licenceUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
  attribution: author + ", " + title + ", " + section + ".",
  notes:
    claim +
    " The work is in the public domain; short passages are quoted from the Project Gutenberg transcription and checked against it on 2026-10-06. The Project Gutenberg name, licence header and trademark are not redistributed.",
});

export const sources: CourseBundle["sources"] = [
  openstax(
    "lang-os-sentences",
    "Handbook H3, Clear and Effective Sentences",
    "handbook",
    "Main (independent) and subordinate clauses, compound sentences with semicolons, active and passive voice, wordiness.",
  ),
  openstax(
    "lang-os-errors",
    "Handbook H4, Sentence Errors",
    "handbook",
    "Comma splices and their standard repairs.",
  ),
  openstax(
    "lang-os-punctuation",
    "Handbook H9, Punctuation",
    "handbook",
    "Uses of semicolons, colons and dashes.",
  ),
  openstax(
    "lang-os-point-of-view",
    "Handbook H6, Point of View",
    "handbook",
    "First- and third-person point of view.",
  ),
  openstax(
    "lang-os-rhetoric",
    "9.3 Glance at Genre: Rhetorical Strategies",
    "9-3-glance-at-genre-rhetorical-strategies",
    "Definitions of ethos, pathos, logos and kairos.",
  ),
  wikipedia(
    "lang-wp-passive",
    "English passive voice",
    "Lead and agentless passives",
    "Passive formation with be and a past participle; optional by-phrase agent.",
  ),
  wikipedia(
    "lang-wp-nominalization",
    "Nominalization",
    "Lead",
    "Nominalisation as the use of a verb or adjective as a noun.",
  ),
  wikipedia(
    "lang-wp-toulmin",
    "Stephen Toulmin",
    "The Toulmin model of argument",
    "Claim, grounds, warrant, backing, qualifier and rebuttal, from The Uses of Argument (1958).",
  ),
  wikipedia(
    "lang-wp-persuasion",
    "Modes of persuasion",
    "Ethos, pathos and logos; Kairos",
    "Aristotle's three modes of persuasion in the Rhetoric and the added notion of kairos.",
  ),
  wikipedia(
    "lang-wp-chiasmus",
    "Chiasmus",
    "Lead and examples",
    "Chiasmus as reversed structure (ABBA); antimetabole when the same words return.",
  ),
  wikipedia(
    "lang-wp-anaphora",
    "Anaphora (rhetoric)",
    "Lead",
    "Anaphora as repetition at the start of successive clauses.",
  ),
  wikipedia(
    "lang-wp-antithesis",
    "Antithesis",
    "Lead",
    "Antithesis as opposed ideas set in parallel structure.",
  ),
  wikipedia(
    "lang-wp-isocolon",
    "Isocolon",
    "Tricolon",
    "Tricolon as a series of three parallel members.",
  ),
  wikipedia(
    "lang-wp-pentameter",
    "Iambic pentameter",
    "Lead, Metrical variation",
    "Iambs, five-foot lines, feminine endings and trochaic substitution.",
  ),
  wikipedia(
    "lang-wp-trochee",
    "Trochee",
    "Lead and examples",
    "The trochee as stressed then unstressed; trochaic tetrameter.",
  ),
  wikipedia(
    "lang-wp-alliteration",
    "Alliteration",
    "Lead",
    "Alliteration as repeated initial consonant sounds in nearby words.",
  ),
  wikipedia(
    "lang-wp-assonance",
    "Assonance",
    "Lead",
    "Assonance as repeated vowel sounds in nearby words.",
  ),
  wikipedia(
    "lang-wp-metaphor",
    "Metaphor",
    "Parts of a metaphor; Metaphor versus simile",
    "I. A. Richards's tenor and vehicle (The Philosophy of Rhetoric, 1936); metaphor implied, simile explicit with like or as.",
  ),
  wikipedia(
    "lang-wp-sonnet",
    "Sonnet",
    "Italian (Petrarchan) sonnet; Shakespearean sonnet",
    "Octave and sestet, ABBAABBA; three quatrains and a couplet, ABAB CDCD EFEF GG.",
  ),
  wikipedia(
    "lang-wp-volta",
    "Volta (literature)",
    "Lead",
    "The volta as the turn of thought in a sonnet.",
  ),
  wikipedia(
    "lang-wp-free-indirect",
    "Free indirect speech",
    "Lead and history",
    "Third-person past-tense rendering of a character's thought without a reporting verb; Austen as an early consistent user.",
  ),
  wikipedia(
    "lang-wp-unreliable",
    "Unreliable narrator",
    "Lead and classification",
    "Wayne C. Booth coined the term in The Rhetoric of Fiction (1961); Poe's first-person narrators as examples.",
  ),
  wikipedia(
    "lang-wp-irony",
    "Irony",
    "Verbal, dramatic and situational irony",
    "The three standard kinds of irony.",
  ),
  wikipedia(
    "lang-wp-structure",
    "Story structure",
    "Freytag's pyramid",
    "Freytag's five parts in Die Technik des Dramas (1863).",
  ),
  {
    id: "lang-gettysburg",
    title: "The Gettysburg Address (Bliss copy)",
    publisher: "Library of Congress, transcribed by Wikipedia and Project Gutenberg",
    url: "https://en.wikipedia.org/wiki/Gettysburg_Address",
    section: "Bliss copy, full text; compared with Project Gutenberg eBook #4",
    edition: "Bliss copy, 1864",
    accessedAt: "2026-10-06",
    reuse: "adaptable",
    licence: "Public domain",
    licenceUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
    attribution: "Abraham Lincoln, address at Gettysburg, 19 November 1863 (Bliss copy).",
    notes:
      "Lincoln's text is in the public domain. Quotations follow the Bliss copy, including its dashes and 'can not'; the Project Gutenberg transcription differs in punctuation only.",
  },
  gutenberg(
    "lang-pg-douglass-bondage",
    "My Bondage and My Freedom",
    "Frederick Douglass",
    202,
    "Appendix: What to the Slave is the Fourth of July? (Rochester, 5 July 1852)",
    "Quotations from the Fourth of July oration and its date and place.",
  ),
  gutenberg(
    "lang-pg-douglass-narrative",
    "Narrative of the Life of Frederick Douglass",
    "Frederick Douglass",
    23,
    "Chapter X",
    "The chiasmus 'You have seen how a man was made a slave; you shall see how a slave was made a man'.",
  ),
  gutenberg(
    "lang-pg-sonnets",
    "Shakespeare's Sonnets",
    "William Shakespeare",
    1041,
    "Sonnets 18, 29, 30, 116 and 130",
    "Full sonnet texts and lines quoted.",
  ),
  gutenberg(
    "lang-pg-emma",
    "Emma",
    "Jane Austen",
    158,
    "Volume I, chapters 1 and 16",
    "Opening sentence and the passage after Mr Elton's proposal.",
  ),
  gutenberg(
    "lang-pg-pride",
    "Pride and Prejudice",
    "Jane Austen",
    1342,
    "Chapter 1",
    "Opening two paragraphs.",
  ),
  gutenberg(
    "lang-pg-tale",
    "A Tale of Two Cities",
    "Charles Dickens",
    98,
    "Book I, chapter 1",
    "Opening sentence, including its ten 'it was' clauses.",
  ),
  gutenberg(
    "lang-pg-poe",
    "The Works of Edgar Allan Poe, Volume 2",
    "Edgar Allan Poe",
    2148,
    "The Tell-Tale Heart",
    "Opening paragraph.",
  ),
  gutenberg(
    "lang-pg-dickinson",
    "Poems by Emily Dickinson, Three Series",
    "Emily Dickinson",
    12242,
    "Second Series, 'Hope'",
    "First stanza and 'the little bird' of stanza two.",
  ),
  gutenberg(
    "lang-pg-romeo",
    "Romeo and Juliet",
    "William Shakespeare",
    1513,
    "2.2, 3.1, 3.2, 3.5 and 5.3",
    "Lines quoted and the order of scenes.",
  ),
  gutenberg(
    "lang-pg-caesar",
    "Julius Caesar",
    "William Shakespeare",
    1522,
    "3.2, Antony's funeral speech",
    "Lines calling Brutus 'an honourable man'.",
  ),
  gutenberg(
    "lang-pg-macbeth",
    "Macbeth",
    "William Shakespeare",
    1533,
    "1.1, 1.6 and 4.1",
    "'Fair is foul', 'This castle hath a pleasant seat', 'Double, double, toil and trouble'.",
  ),
  gutenberg(
    "lang-pg-hamlet",
    "Hamlet",
    "William Shakespeare",
    1524,
    "3.1",
    "'To be, or not to be, that is the question'.",
  ),
  gutenberg(
    "lang-pg-milton",
    "The Poetical Works of John Milton",
    "John Milton",
    1745,
    "Sonnet XVI, 'When I consider how my light is spent'",
    "Full sonnet text in the original spelling.",
  ),
  gutenberg(
    "lang-pg-wordsworth",
    "Poems in Two Volumes, Volume 2",
    "William Wordsworth",
    8824,
    "'I wandered lonely as a Cloud'",
    "Opening lines.",
  ),
  gutenberg(
    "lang-pg-keats",
    "Keats: Poems Published in 1820",
    "John Keats",
    23684,
    "'To Autumn' and 'Ode on a Grecian Urn'",
    "Opening lines.",
  ),
  gutenberg(
    "lang-pg-burns",
    "Poems and Songs of Robert Burns",
    "Robert Burns",
    1279,
    "'A Red, Red Rose'",
    "Opening lines.",
  ),
  gutenberg(
    "lang-pg-freytag",
    "Die Technik des Dramas",
    "Gustav Freytag",
    50616,
    "Chapter 2, 'Der Bau des Dramas'",
    "The five parts (Einleitung, Steigerung, Höhenpunkt, Fall oder Umkehr, Katastrophe), the exciting moment of Romeo and Juliet, its four stages of rise and its climax scene group.",
  ),
];
