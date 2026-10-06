import {
  beat,
  card,
  choose,
  numeric,
  passage,
  term,
  toulmin,
  word,
  type TeachingLesson,
} from "./definition.js";

const bridge = toulmin(
  ["grounds", "Inspectors found cracks in two of the bridge's four main girders."],
  ["claim", "The bridge should close to lorries."],
  ["warrant", "A structure with damaged load-bearing girders should not carry heavy loads."],
);
const museum = toulmin(
  ["claim", "The museum should open late every Thursday."],
  ["grounds", "Attendance doubled on the four Thursdays it stayed open late."],
  ["warrant", "A change that doubles attendance justifies its staffing cost."],
  ["rebuttal", "The trial lasted only four weeks, so the rise may not last."],
);
const douglassSun =
  "{pathos The sunlight that brought life and healing to you, has brought stripes and death to me.}";

export const argumentLessons: TeachingLesson[] = [
  {
    id: "claim-grounds-warrant",
    title: "Claim, grounds and warrant",
    summary:
      "Take an argument apart with Toulmin's model: the claim and the grounds offered for it, the warrant that links them, the qualifiers and rebuttals that limit it.",
    moduleId: "lang-argument",
    sourceIds: ["lang-wp-toulmin"],
    beats: [
      beat(
        "Find the claim",
        "Stephen Toulmin's model of argument, from The Uses of Argument (1958), starts with the claim: the conclusion the arguer wants accepted. Grounds are the facts offered in its support, here the cracked girders. The warrant is the general rule that licenses the step from those facts to that claim: damaged girders should not carry heavy loads. Everyday arguments usually state the claim and the grounds and leave the warrant for the reader to supply.",
        ["Bridge", bridge],
        ["Museum", museum],
      ),
      beat(
        "The warrant does the work",
        "Attacking a warrant is often stronger than attacking the grounds. Nobody disputes that the prints were on the knife; a defence lawyer asks whether prints show handling at the relevant time. When the warrant itself needs support, Toulmin calls that support backing: here, forensic research on how prints transfer and how long they last. Writing the warrant out shows you exactly what an argument assumes.",
        [
          "Warrant stated",
          toulmin(
            ["grounds", "The defendant's fingerprints were on the knife."],
            ["claim", "The defendant handled the knife."],
            ["warrant", "Fingerprints on an object show that a person touched it."],
          ),
        ],
        [
          "Warrant with backing",
          toulmin(
            ["grounds", "The defendant's fingerprints were on the knife."],
            ["claim", "The defendant handled the knife."],
            ["warrant", "Fingerprints on an object show that a person touched it."],
            [
              "backing",
              "Forensic studies show that ridge patterns are individual and transfer by contact.",
            ],
          ),
        ],
      ),
      beat(
        "Qualifiers and rebuttals",
        "A qualifier states how strongly the claim is made: 'probably', 'in most cases', 'almost certainly'. A rebuttal names the conditions under which the claim would fail: 'unless rain keeps her supporters at home'. Both make an argument harder to knock down, because they concede in advance the exceptions an opponent would raise. A claim with no qualifier is asserted as certain, and a single counterexample sinks it.",
        [
          "Election",
          toulmin(
            ["grounds", "Harriet leads every poll by eight points."],
            ["qualifier", "Probably."],
            ["claim", "Harriet will win the election."],
            ["rebuttal", "Unless rain keeps her supporters at home."],
          ),
        ],
        [
          "Forecast",
          toulmin(
            ["grounds", "The air pressure is falling fast."],
            ["qualifier", "Very likely."],
            ["claim", "It will rain tomorrow."],
            ["rebuttal", "Unless the front stalls over the coast."],
          ),
        ],
      ),
      beat(
        "Label a new argument",
        "Labelling an argument means asking each statement what job it does. A particular observation is grounds. A general rule linking that observation to the conclusion is a warrant. The conclusion is the claim, and an 'unless' clause is a rebuttal. In the pricing argument the warrant is the general rule about prices, and the rebuttal allows that rising costs might justify the higher price even with fewer sales.",
        [
          "Pricing",
          toulmin(
            ["grounds", "Sales fell 20% in the month after the price rise."],
            ["warrant", "Customers buy less of a product when its price rises."],
            ["claim", "The price should return to its old level."],
            ["rebuttal", "Unless costs have risen faster than sales have fallen."],
          ),
        ],
        ["Museum", museum],
      ),
    ],
    questions: [
      choose(
        "Three statements: 'Inspectors found cracks in two of the bridge's four main girders.' 'The bridge should close to lorries.' 'A structure with damaged load-bearing girders should not carry heavy loads.' Which is the claim?",
        [
          "Inspectors found cracks in two of the bridge's four main girders.",
          "The bridge should close to lorries.",
          "A structure with damaged load-bearing girders should not carry heavy loads.",
        ],
        1,
        "'The bridge should close to lorries' is the conclusion the other two statements are offered to support.",
        "Ask which statement the others are reasons for.",
      ),
      word(
        "Grounds: 'The defendant's fingerprints were on the knife.' Claim: 'The defendant handled the knife.' What is Toulmin's name for the unstated rule 'Fingerprints on an object show that a person touched it'?",
        ["warrant"],
        "The warrant: the general principle that authorises the move from these grounds to this claim.",
        "The element authorises the step from evidence to conclusion; the same word names a document that authorises a search.",
      ),
      word(
        "In 'Harriet will probably win, unless rain keeps her supporters at home', which single word is the qualifier?",
        ["probably"],
        "'Probably' limits the force of the claim; 'unless rain keeps her supporters at home' is the rebuttal, the condition under which it fails.",
        "Find the word that measures how confident the claim is.",
      ),
      numeric(
        "Statements: (1) Sales fell 20% in the month after the price rise. (2) Customers buy less of a product when its price rises. (3) The price should return to its old level. (4) Unless costs have risen faster than sales have fallen. Give the number of the statement that is the warrant.",
        2,
        "Statement 2 is the warrant: a general rule linking the sales figure (grounds, statement 1) to the pricing claim (statement 3). Statement 4 is the rebuttal.",
        [
          "Find the claim first: the statement the others support.",
          "Find the observed fact; that is the grounds.",
          "The warrant is a general rule rather than a particular fact.",
        ],
      ),
      numeric(
        "Statements: (1) The museum should open late every Thursday. (2) Attendance doubled on the four Thursdays it stayed open late. (3) A change that doubles attendance justifies its staffing cost. (4) The trial lasted only four weeks, so the rise may not last. Give the number of the statement that supplies the grounds.",
        2,
        "Statement 2 supplies the grounds: an observed fact. Statement 1 is the claim, 3 the warrant and 4 a rebuttal.",
        [
          "Find the statement the others support.",
          "Grounds are particular observed facts, not general rules.",
          "The last statement limits the argument rather than supporting it.",
        ],
      ),
      choose(
        "A writer supports the warrant 'Damaged load-bearing girders should not carry heavy loads' by citing the national bridge inspection code. In Toulmin's model, what is that support called?",
        ["Backing", "Grounds", "Qualifier"],
        0,
        "Backing: support for the warrant itself, as opposed to grounds, which support the claim.",
        "The support is aimed at the rule, not at the conclusion.",
      ),
    ],
    cards: [
      term(
        "In Toulmin's model, which element limits the force of a claim with words such as 'probably' or 'in most cases'?",
        ["qualifier"],
        "The qualifier: it states how strongly the claim is made.",
      ),
      term(
        "Which Toulmin element states the conditions under which a claim would not hold?",
        ["rebuttal", "reservation"],
        "The rebuttal, sometimes called the reservation.",
      ),
    ],
  },
  {
    id: "appeals-and-occasion",
    title: "Ethos, pathos, logos and kairos",
    summary:
      "Trace the four appeals through Douglass's Fourth of July oration and Lincoln's Gettysburg Address, and see how each speech uses its moment.",
    moduleId: "lang-argument",
    sourceIds: [
      "lang-os-rhetoric",
      "lang-wp-persuasion",
      "lang-gettysburg",
      "lang-pg-douglass-bondage",
    ],
    beats: [
      beat(
        "Where the speaker stands",
        "Aristotle's Rhetoric names three proofs a speech can supply: ethos, the character of the speaker; pathos, the emotions of the audience; logos, the argument itself. Douglass speaks in 1852 as a man the holiday excludes, and the 'yours' and 'mine' of 'This Fourth of July is yours, not mine' draw on that standing. Lincoln builds ethos differently, with 'we': the president speaks as one of the mourners, not above them.",
        [
          "Douglass, 1852",
          passage(
            "Douglass, Rochester, 5 July 1852",
            "appeal",
            "{ethos I am not included within the pale of this glorious anniversary!}",
            "{ethos This Fourth of July is yours, not mine.} You may rejoice, I must mourn.",
          ),
        ],
        [
          "Lincoln, 1863",
          passage(
            "Lincoln, Gettysburg, 19 November 1863",
            "appeal",
            "{ethos We have come to dedicate a portion of that field,} as a final resting place for those who here gave their lives that that nation might live.",
          ),
        ],
      ),
      beat(
        "Moving the audience",
        "Pathos is persuasion through the feelings a speech arouses in its hearers. Douglass sets one sunlight against two outcomes. 'Stripes' are the marks of the whip, and placing them beside the audience's 'life and healing' makes the contrast physical. Lincoln's pathos is quieter: the dead gave 'the last full measure of devotion', and the living are asked to be worthy of it.",
        ["Douglass", passage("Douglass, Rochester, 5 July 1852", "appeal", douglassSun)],
        [
          "Lincoln",
          passage(
            "Lincoln, Gettysburg, 19 November 1863",
            "appeal",
            "that from these honored dead we take increased devotion to that cause for which they gave {pathos the last full measure of devotion}",
          ),
        ],
      ),
      beat(
        "Arguing from a premise",
        "Logos is the argument carried by the words themselves. Lincoln's opening dates the nation to 1776 and the Declaration of Independence rather than to the Constitution of 1787, and it names the founding premise: 'all men are created equal'. The war, he reasons, tests whether a nation built on that proposition 'can long endure'. The speech argues from premise to consequence before it consoles.",
        [
          "Lincoln's opening",
          passage(
            "Lincoln, Gettysburg, 19 November 1863",
            "appeal",
            "{kairos Four score and seven years ago} our fathers brought forth on this continent, a new nation, conceived in Liberty, and {logos dedicated to the proposition that all men are created equal.}",
          ),
        ],
        [
          "Lincoln's test",
          passage(
            "Lincoln, Gettysburg, 19 November 1863",
            "appeal",
            "Now we are engaged in a great civil war, {logos testing whether that nation, or any nation so conceived and so dedicated, can long endure.}",
          ),
        ],
      ),
      beat(
        "The right moment",
        "Kairos is the opportune moment: what makes an argument fit its occasion. Douglass, invited to speak at an Independence Day celebration in Rochester, turns the occasion into his subject: 'What to the American slave is your Fourth of July?' Lincoln speaks on the battlefield where the dead lie, four and a half months after the fighting, and 'We are met on a great battle-field of that war' uses the place itself as evidence.",
        [
          "Douglass's question",
          passage(
            "Douglass, Rochester, 5 July 1852",
            "appeal",
            "{kairos What to the American slave is your Fourth of July?} I answer, a day that reveals to him, more than all other days in the year, the gross injustice and cruelty to which he is the constant victim.",
          ),
        ],
        [
          "Lincoln's place",
          passage(
            "Lincoln, Gettysburg, 19 November 1863",
            "appeal",
            "{kairos We are met on a great battle-field of that war.}",
          ),
        ],
      ),
    ],
    questions: [
      word(
        "Douglass tells his Rochester audience, 'This Fourth of July is yours, not mine.' His right to say it rests on his own life as a man who had escaped slavery. Which of Aristotle's appeals works through the speaker's character and standing?",
        ["ethos"],
        "Ethos: the persuasive force of the speaker's character and credibility.",
        "The Greek word is the root of 'ethics'.",
      ),
      word(
        "'The sunlight that brought life and healing to you, has brought stripes and death to me.' The image of 'stripes and death' is aimed chiefly at the audience's feelings. Which appeal is this?",
        ["pathos"],
        "Pathos: the appeal to the audience's emotions, here pity and shame.",
        "The Greek root also gives English 'sympathy'.",
      ),
      numeric(
        "Lincoln spoke at Gettysburg in November 1863. 'Four score and seven years ago' points back to which year?",
        1776,
        "Four score and seven is 4 × 20 + 7 = 87, and 1863 − 87 = 1776, the year of the Declaration of Independence.",
        [
          "A score is twenty.",
          "Four score and seven is four twenties plus seven.",
          "Subtract that number of years from the year of the speech.",
        ],
      ),
      word(
        "Douglass delivered his attack on slavery at a celebration of American independence, the day after the Fourth of July. Which Greek term names a speaker's use of the right moment and occasion?",
        ["kairos"],
        "Kairos: the timeliness of a speech, the fit between argument and occasion.",
        "It is the term often added to Aristotle's three appeals, and it means the opportune moment.",
      ),
      word(
        "Lincoln says the war is 'testing whether that nation, or any nation so conceived and so dedicated, can long endure.' He reasons from the nation's founding premise to what the war puts at stake. Which appeal is this chiefly?",
        ["logos"],
        "Logos: an appeal through reasoning from premise to consequence.",
        "Look for the appeal named after the Greek for 'word' or 'reason'.",
      ),
      choose(
        "A charity letter opens: 'As a children's nurse for twenty years, I have seen what a missed vaccination can do.' Which appeal does the opening clause make first?",
        ["Ethos", "Pathos", "Kairos"],
        0,
        "Ethos: 'As a children's nurse for twenty years' establishes the writer's experience and credibility before anything else.",
        "Look at what the opening clause tells you about the writer.",
      ),
    ],
    cards: [
      card(
        "How many years is 'four score and seven'?",
        87,
        "Four twenties make eighty; add seven.",
      ),
      term(
        "Which of Aristotle's three appeals works through the emotions of the audience?",
        ["pathos"],
        "Pathos: persuasion through the feelings a speech arouses.",
      ),
    ],
  },
  {
    id: "figures-of-speech",
    title: "Figures of repetition and balance",
    summary:
      "Recognise anaphora, antithesis, chiasmus and tricolon in Dickens, Lincoln, Douglass and Shakespeare. Say what each figure does to an argument.",
    moduleId: "lang-argument",
    sourceIds: [
      "lang-wp-anaphora",
      "lang-wp-antithesis",
      "lang-wp-chiasmus",
      "lang-wp-isocolon",
      "lang-pg-tale",
      "lang-pg-douglass-narrative",
    ],
    beats: [
      beat(
        "Repeat the opening",
        "Anaphora repeats a word or phrase at the start of successive clauses. The repetition sets up a frame, and attention moves to what changes inside it: best, worst, wisdom, foolishness. Dickens keeps the frame going for ten clauses before the sentence breaks into 'we had everything before us'. Douglass uses the same device with 'your', and each repetition points back at his audience.",
        [
          "Dickens, 1859",
          passage(
            "Dickens, A Tale of Two Cities, opening",
            "figure",
            "{anaphora:a It was} the best of times, {anaphora:a it was} the worst of times,",
            "{anaphora:a it was} the age of wisdom, {anaphora:a it was} the age of foolishness",
          ),
        ],
        [
          "Douglass, 1852",
          passage(
            "Douglass, Rochester, 5 July 1852",
            "figure",
            "To him, {anaphora:a your} celebration is a sham;",
            "{anaphora:a your} boasted liberty, an unholy license;",
            "{anaphora:a your} national greatness, swelling vanity",
          ),
        ],
      ),
      beat(
        "Set opposites side by side",
        "Antithesis places opposed ideas in parallel grammatical form, so that the parallel sharpens the opposition. Lincoln contrasts 'we' with 'they' and 'say' with 'did' inside one frame ('what ___ ___ here'), so the speech enacts its own modesty: words matter less than deeds. Dickens's 'best' and 'worst' sit in the same slot of the same clause.",
        [
          "Lincoln",
          passage(
            "Lincoln, Gettysburg, 19 November 1863",
            "figure",
            "The world will little note, nor long remember {antithesis:a what we say here,}",
            "but it can never forget {antithesis:a what they did here.}",
          ),
        ],
        [
          "Dickens",
          passage(
            "Dickens, A Tale of Two Cities, opening",
            "figure",
            "It was {antithesis:a the best of times,} it was {antithesis:a the worst of times}",
          ),
        ],
      ),
      beat(
        "Reverse the order",
        "Chiasmus reverses the order of terms in its second half: man, slave / slave, man. When the same words return, as here, the stricter name is antimetabole. Douglass places the figure at the turning point of his Narrative, just before he fights back against Covey, so the grammar reverses as his life does. Draw lines between the matching words and they cross in an X, the Greek letter chi.",
        [
          "Douglass, 1845",
          passage(
            "Douglass, Narrative, chapter X",
            "figure",
            "You have seen how {chiasmus:a a man} was made {chiasmus:b a slave};",
            "you shall see how {chiasmus:b a slave} was made {chiasmus:a a man}.",
          ),
        ],
        [
          "Macbeth",
          passage(
            "Shakespeare, Macbeth, 1.1",
            "figure",
            "{chiasmus:a Fair} is {chiasmus:b foul}, and {chiasmus:b foul} is {chiasmus:a fair}:",
          ),
        ],
      ),
      beat(
        "Three parallel members",
        "A tricolon is a series of three parallel members. Lincoln's 'of the people, by the people, for the people' varies only the preposition, so each phrase adds a relation: government drawn from the people, run by them, serving them. His earlier sequence 'dedicate', 'consecrate', 'hallow' climbs from civic to sacred, a tricolon whose members grow in weight.",
        [
          "Lincoln's close",
          passage(
            "Lincoln, Gettysburg, 19 November 1863",
            "figure",
            "and that government {tricolon:a of the people,} {tricolon:a by the people,} {tricolon:a for the people,}",
            "shall not perish from the earth.",
          ),
        ],
        [
          "Lincoln's verbs",
          passage(
            "Lincoln, Gettysburg, 19 November 1863",
            "figure",
            "But, in a larger sense, we can not {tricolon:a dedicate}—we can not {tricolon:a consecrate}—",
            "we can not {tricolon:a hallow}—this ground.",
          ),
        ],
      ),
    ],
    questions: [
      numeric(
        "Dickens opens A Tale of Two Cities: 'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.' How many times does 'it was' open a clause in this extract?",
        4,
        "Four. The repeated opening is anaphora; in the full sentence Dickens keeps it going for ten clauses.",
        [
          "Split the extract at each comma.",
          "Mark the first two words of each clause.",
          "Count the clauses that open the same way.",
        ],
      ),
      word(
        "Lincoln sets 'what we say here' against 'what they did here' in matching grammatical form. Name the figure that balances opposed ideas in parallel structure.",
        ["antithesis"],
        "Antithesis: contrasting ideas placed in parallel form, here saying against doing and 'we' against 'they'.",
        "The Greek name means 'setting against'.",
      ),
      word(
        "Douglass: 'You have seen how a man was made a slave; you shall see how a slave was made a man.' The terms return in reverse order, A B B A. Name the figure.",
        ["chiasmus", "antimetabole"],
        "Chiasmus (strictly antimetabole, since the same words return): A B, then B A.",
        "The name comes from the Greek letter chi, shaped like an X.",
      ),
      word(
        "'Government of the people, by the people, for the people.' Name the figure made of three parallel members.",
        ["tricolon"],
        "A tricolon: three parallel members, here three prepositional phrases sharing one noun.",
        "The Greek prefix for three is joined to the word for a clause or limb.",
      ),
      word(
        "Douglass: 'your celebration is a sham; your boasted liberty, an unholy license; your national greatness, swelling vanity.' Which figure does the repeated opening 'your' create?",
        ["anaphora"],
        "Anaphora: repetition at the start of successive clauses, here pointing each charge at the audience.",
        "Repetition at the start of successive clauses has a name from the Greek for 'carrying back'.",
      ),
      choose(
        "The witches in Macbeth chant 'Fair is foul, and foul is fair.' Which figure is this?",
        ["Chiasmus", "Anaphora", "Tricolon"],
        0,
        "Chiasmus: fair, foul / foul, fair. The reversal suits a play in which appearances invert.",
        "Look at the order of the two repeated words in each half.",
      ),
    ],
    cards: [
      term(
        "'We do not live to eat; we eat to live.' Name the figure that reverses the order of the repeated words.",
        ["chiasmus", "antimetabole"],
        "Chiasmus, or more strictly antimetabole: live, eat / eat, live.",
      ),
      term(
        "What is a series of three parallel members, as in 'I came, I saw, I conquered', called?",
        ["tricolon"],
        "A tricolon: three parallel members, here three short clauses.",
      ),
    ],
  },
];
