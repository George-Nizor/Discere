import {
  beat,
  card,
  choose,
  clause,
  clauses,
  compress,
  numeric,
  term,
  voice,
  word,
  type TeachingLesson,
} from "./definition.js";

export const sentenceLessons: TeachingLesson[] = [
  {
    id: "clause-anatomy",
    title: "Inside a clause",
    summary:
      "Find the finite verb and its subject, tell an object from a complement, and separate independent clauses from dependent ones.",
    moduleId: "lang-sentence",
    sourceIds: ["lang-os-sentences", "lang-pg-sonnets"],
    beats: [
      beat(
        "Find the verb first",
        "Start with the finite verb: the word that carries tense and would change if the line moved into the past. In 'And every fair from fair sometime declines', that word is 'declines'. Then ask who or what declines; the answer, 'every fair', is the subject. Verse often delays its verb, and finding the verb first stops an inverted order from misleading you.",
        [
          "Shakespeare's order",
          clauses([clause("I", "[s Every fair] [m from fair] [m sometime] [v declines]")], {
            source: "Sonnet 18, line 7",
          }),
        ],
        [
          "Plain prose order",
          clauses([clause("I", "[s Every beautiful thing] [v loses] [o its beauty] [m in time]")]),
        ],
      ),
      beat(
        "Objects and complements",
        "A transitive verb passes its action to an object, a separate thing: rough winds shake 'the darling buds of May', and the head of that noun phrase is 'buds'. A linking verb such as 'be', 'seem' or 'become' takes a complement instead, which describes the subject itself. In 'Thou art more lovely and more temperate' the complement tells you what 'thou' is; nothing receives an action.",
        [
          "An object",
          clauses([clause("I", "[s Rough winds] [v do shake] [o the darling buds of May]")], {
            source: "Sonnet 18, line 3",
          }),
        ],
        [
          "A complement",
          clauses([clause("I", "[s Thou] [v art] [c more lovely and more temperate]")], {
            source: "Sonnet 18, line 2",
          }),
        ],
      ),
      beat(
        "Clauses that cannot stand alone",
        "A clause has its own subject and finite verb. An independent clause can stand as a sentence; a dependent clause opens with a subordinator such as 'when', 'if', 'because' or 'which' and leans on another clause. In Sonnet 130, 'If snow be white' is a condition waiting for its answer. Sonnet 29 stretches the same shape across eight lines: its 'When' clause holds the speaker's misery in suspense, and the main clause, 'Haply I think on thee', arrives only at line 10.",
        [
          "Sonnet 130, line 3",
          clauses([
            clause("D", "[x If] [s snow] [v be] [c white,]"),
            clause("I", "[m why then] [s her breasts] [v are] [c dun]"),
          ]),
        ],
        [
          "Sonnet 29, lines 1, 2 and 10",
          clauses([
            clause(
              "D",
              "[x When] [m in disgrace with fortune and men's eyes] [s I] [m all alone] [v beweep] [o my outcast state,]",
            ),
            clause("I", "[p …] [m Haply] [s I] [v think] [m on thee]"),
          ]),
        ],
      ),
      beat(
        "Clauses inside clauses",
        "Each finite verb anchors its own clause, so counting finite verbs is the quickest way to count clauses. 'Love is not love / Which alters when it alteration finds' holds three: the main clause 'Love is not love', the relative clause 'which alters', and the clause 'when it alteration finds', each with its own verb. Infinitives such as 'to serve' and participles such as 'despising' carry no tense and do not anchor a clause.",
        [
          "Sonnet 116",
          clauses([
            clause("I", "[s Love] [v is] [m not] [c love]"),
            clause("D", "[x Which] [v alters]"),
            clause("D", "[x when] [s it] [o alteration] [v finds]"),
          ]),
        ],
        [
          "Milton, lines 1 and 8",
          clauses([
            clause("D", "[x When] [s I] [v consider]"),
            clause("D", "[x how] [s my light] [v is spent,]"),
            clause("I", "[p …] [s I] [m fondly] [v ask]"),
          ]),
        ],
      ),
    ],
    questions: [
      word(
        "Shakespeare's Sonnet 18 says 'And every fair from fair sometime declines.' Which single word is the finite verb?",
        ["declines"],
        "'Declines' is the finite verb: it carries tense and would become 'declined' in the past. Its subject is 'every fair'.",
        "Put the line into the past tense. Which word changes form?",
      ),
      word(
        "In 'Rough winds do shake the darling buds of May', the object is a noun phrase. What is its head noun, the one word the rest of the phrase describes?",
        ["buds"],
        "The object is 'the darling buds of May'; its head noun is 'buds'. 'Darling' and 'of May' modify it.",
        "Strip away the describing words. Which noun is left as the thing being shaken?",
      ),
      word(
        "Sonnet 130 has 'If snow be white, why then her breasts are dun.' Which word makes the first clause dependent?",
        ["if"],
        "'If' subordinates 'snow be white', so that clause cannot stand alone; 'her breasts are dun' can.",
        "Which word turns a statement into a condition?",
      ),
      numeric(
        "How many finite verbs are in 'Love is not love / Which alters when it alteration finds'?",
        3,
        "Three: 'is', 'alters' and 'finds'. Each anchors a clause.",
        [
          "A finite verb carries tense: test each word by putting the lines into the past.",
          "Check the main clause, then the clause opened by 'which', then the clause opened by 'when'.",
          "List one verb from each clause and count the list.",
        ],
      ),
      numeric(
        "Douglass, 1852: 'You may rejoice, I must mourn.' How many independent clauses does this sentence hold?",
        2,
        "Two: 'You may rejoice' and 'I must mourn'. Each could stand alone, and the comma between them is a deliberate splice.",
        [
          "Find each subject and finite verb pair.",
          "Ask whether each clause could stand as a sentence on its own.",
          "Neither clause opens with a subordinator.",
        ],
      ),
      choose(
        "In Lincoln's 'The world will little note, nor long remember what we say here', what is the grammatical function of 'what we say here'?",
        [
          "The object of 'note' and 'remember'",
          "The subject of the sentence",
          "A subject complement",
        ],
        0,
        "'What we say here' is a noun clause that receives the action of 'note' and 'remember', so it is their object. The subject is 'the world'.",
        "Ask: the world will little note what? The answer names the object.",
      ),
    ],
    cards: [
      term(
        "In 'Thou art more lovely and more temperate', what grammatical function does 'more lovely and more temperate' serve after the linking verb 'art'?",
        ["complement", "subject complement", "predicate adjective"],
        "A subject complement: after a linking verb it describes the subject, 'thou'.",
      ),
      card(
        "How many finite verbs are in 'When I consider how my light is spent, I fondly ask'? Count 'is spent' as one verb.",
        3,
        "Three: 'consider', 'is spent' and 'ask'.",
      ),
    ],
  },
  {
    id: "joining-clauses",
    title: "Joining two clauses",
    summary:
      "Repair a comma splice and choose between a semicolon, a colon, a dash and a conjunction by what each mark says about the relation.",
    moduleId: "lang-sentence",
    sourceIds: ["lang-os-errors", "lang-os-punctuation", "lang-pg-douglass-bondage"],
    beats: [
      beat(
        "The comma splice",
        "A comma marks a pause inside a sentence or sets off a dependent element; on its own it cannot hold two independent clauses. 'The vote was close, the motion failed' is a comma splice. Repair it with a full stop or a semicolon, or keep the comma and add a coordinating conjunction such as 'but' or 'so'. Douglass's 'You may rejoice, I must mourn' is a splice used on purpose: the abrupt join makes the two fates collide.",
        [
          "Comma alone",
          clauses(
            [
              clause("I", "[s The vote] [v was] [c close]"),
              clause("I", "[s the motion] [v failed.]"),
            ],
            { join: { mark: "comma", conjunction: "and", relation: "adds" } },
          ),
        ],
        [
          "Douglass, 1852",
          clauses([clause("I", "[s You] [v may rejoice]"), clause("I", "[s I] [v must mourn.]")], {
            join: { mark: "comma", conjunction: "but", relation: "contrast" },
            source: "Douglass, Rochester, 1852",
          }),
        ],
      ),
      beat(
        "Semicolons and the missing verb",
        "A semicolon joins independent clauses that the writer wants read as one movement of thought. It also keeps a series of clauses legible when each clause already contains a comma. Douglass states the verb once ('your celebration is a sham') and then leaves it out: 'your boasted liberty, an unholy license'. The comma marks where 'is' has been dropped, so the semicolons must do the heavier work of separating the clauses.",
        [
          "Douglass's semicolons",
          clauses(
            [
              clause("I", "[m To him,] [s your celebration] [v is] [c a sham;]"),
              clause("I", "[s your boasted liberty,] [c an unholy license;]"),
              clause("I", "[s your national greatness,] [c swelling vanity]"),
            ],
            { source: "Douglass, Rochester, 1852" },
          ),
        ],
        [
          "Commas only",
          clauses([
            clause("I", "[m To him,] [s your celebration] [v is] [c a sham,]"),
            clause("I", "[s your boasted liberty,] [c an unholy license,]"),
            clause("I", "[s your national greatness,] [c swelling vanity]"),
          ]),
        ],
      ),
      beat(
        "What a colon promises",
        "A colon follows a complete clause and promises that what comes next will explain or specify it. 'The verdict was clear: the motion had failed by two votes' keeps that promise. A colon between a verb and its object, as in 'The reasons were: cost and delay', breaks the rule, because 'The reasons were' is incomplete. Shakespeare ends line 2 of Sonnet 18 with a colon, and the lines that follow set out why summer falls short.",
        [
          "Explains",
          clauses(
            [
              clause("I", "[s The verdict] [v was] [c clear]"),
              clause("I", "[s the motion] [v had failed] [m by two votes.]"),
            ],
            { join: { mark: "colon", conjunction: "so", relation: "explains" } },
          ),
        ],
        [
          "Only adds",
          clauses(
            [
              clause("I", "[s The hall] [v was] [c full]"),
              clause("I", "[s the speaker] [v arrived] [m late.]"),
            ],
            { join: { mark: "colon", conjunction: "and", relation: "adds" } },
          ),
        ],
      ),
      beat(
        "Name the relation",
        "Coordinating conjunctions name the relation a comma leaves unstated: 'and' adds, 'but' and 'yet' contrast, 'so' gives a result, 'for' gives a reason. 'It was late, so we left' says why they left. A dash makes a sharper break than any of them. Lincoln's Bliss copy uses dashes to separate 'we can not dedicate' from 'we can not consecrate', forcing a pause before each stronger verb.",
        [
          "Cause and result",
          clauses([clause("I", "[s It] [v was] [c late]"), clause("I", "[s we] [v left.]")], {
            join: { mark: "comma", conjunction: "so", relation: "cause" },
          }),
        ],
        [
          "Lincoln's dashes",
          clauses(
            [
              clause("I", "[s we] [v can not dedicate]"),
              clause("I", "[s we] [v can not consecrate—]"),
              clause("I", "[s we] [v can not hallow—] [o this ground.]"),
            ],
            {
              join: { mark: "dash", conjunction: "and", relation: "adds" },
              source: "Gettysburg Address, Bliss copy",
            },
          ),
        ],
      ),
    ],
    questions: [
      word(
        "'The vote was close, the motion failed.' Two independent clauses are joined by a comma alone. What do editors call this construction?",
        ["comma splice", "spliced comma", "comma fault"],
        "A comma splice: in edited prose a comma alone cannot join two independent clauses.",
        "The name pairs the mark with a word from rope-work and film editing.",
      ),
      word(
        "Douglass: 'To him, your celebration is a sham; your boasted liberty, an unholy license; your national greatness, swelling vanity.' Which verb is understood but not repeated in the second and third clauses?",
        ["is"],
        "'Is': each later clause means 'your boasted liberty is an unholy license'. The comma marks where the verb was left out.",
        "Read the first clause, then lend its verb to the second.",
      ),
      choose(
        "Which sentence uses the colon correctly?",
        [
          "The verdict was clear: the motion had failed by two votes.",
          "The motion: failed by two votes.",
          "The reasons were: cost and delay.",
        ],
        0,
        "A colon needs a complete clause before it, and what follows should explain or specify. Only the first sentence meets both conditions.",
        "Test the words before each colon: could they stand as a sentence?",
      ),
      word(
        "Repair 'It was late, we left' by keeping the comma and adding a coordinating conjunction that states cause and result. Which conjunction do you add?",
        ["so"],
        "'So': 'It was late, so we left.' 'And' would join the clauses without naming the cause.",
        "The second clause is the result of the first. Which short word introduces a result?",
      ),
      word(
        "Douglass writes 'You may rejoice, I must mourn.' Keeping the comma, which coordinating conjunction would make this standard edited prose while keeping the contrast?",
        ["but", "yet"],
        "'But' or 'yet': 'You may rejoice, but I must mourn.' Both name the contrast; 'and' would flatten it.",
        "Choose the conjunction that sets one clause against the other.",
      ),
      numeric(
        "How many independent clauses are in 'The hall was full; the speaker was late: his train had stopped outside the city.'?",
        3,
        "Three: 'The hall was full', 'the speaker was late' and 'his train had stopped outside the city'. The colon introduces the reason for the lateness.",
        [
          "Find each subject with its finite verb.",
          "Check whether any clause opens with a subordinator such as 'because' or 'when'.",
          "Each mark here separates complete clauses.",
        ],
      ),
    ],
    cards: [
      term(
        "Which mark joins two independent clauses in one sentence without a conjunction and leaves their relation unstated?",
        ["semicolon"],
        "A semicolon. A colon would claim that the second clause explains the first.",
      ),
      term(
        "What must the words before a colon form?",
        ["complete clause", "independent clause", "complete sentence", "main clause"],
        "A complete (independent) clause. 'The reasons were: cost and delay' fails this test.",
      ),
    ],
  },
  {
    id: "actors-and-actions",
    title: "Actors and actions",
    summary:
      "Move actors into subjects and actions into verbs. Switch between active and passive, unbury nominalisations and count the words a revision saves.",
    moduleId: "lang-sentence",
    sourceIds: ["lang-os-sentences", "lang-wp-passive", "lang-wp-nominalization"],
    beats: [
      beat(
        "Who did what",
        "In the active voice the subject performs the action: 'The committee rejected the motion.' The passive makes the receiver the subject and builds the verb from 'be' plus a past participle; the actor, if it appears at all, moves into a 'by' phrase: 'The motion was rejected by the committee.' Seven words become five when the actor returns to the front, and the sentence now opens with whoever acted.",
        ["The motion", voice("the committee", "rejected", "was rejected", "the motion", "passive")],
        [
          "The scale",
          voice(
            "the technician",
            "calibrated",
            "was calibrated",
            "the scale",
            "passive",
            "each morning",
          ),
        ],
      ),
      beat(
        "The vanishing actor",
        "The passive lets a writer delete the actor completely: 'Mistakes were made.' The sentence is grammatical and complete, and it assigns responsibility to nobody. That is honest when the actor is unknown or irrelevant, as in 'The temple was built in the second century'. It is evasive when the writer knows exactly who acted. Ask of every passive: who did this, and should the reader know?",
        ["Mistakes", voice("the finance office", "made", "were made", "mistakes", "agentless")],
        [
          "The bridge",
          voice(
            "the engineers",
            "inspected",
            "was inspected",
            "the bridge",
            "agentless",
            "last spring",
          ),
        ],
      ),
      beat(
        "Verbs disguised as nouns",
        "A nominalisation turns an action into a noun: 'decide' becomes 'a decision', 'review' becomes 'a review of'. The noun then needs a weak verb such as 'made' or 'conduct' to carry it, and the sentence gains words while losing force. Turning the noun back into a verb restores both: 'The committee decided to review the policy.' A good test for any draft is to make the main characters subjects and their actions verbs.",
        [
          "Two buried verbs",
          compress(
            "The committee",
            ["made a decision", "decided"],
            "to",
            ["conduct a review of", "review"],
            "the policy.",
          ),
        ],
        ["One buried verb", compress("The board", ["gave approval to", "approved"], "the plan.")],
      ),
      beat(
        "Cut what carries nothing",
        "Dead words carry no meaning a reader would miss. 'Personal opinion' repeats itself; 'basically' and 'final' add nothing to 'true' and 'outcome'; 'In my opinion, it is true that' only announces a claim the sentence is about to make. Cut them and sixteen words become six. Count before and after: a revision that keeps the claim and loses words is an improvement you can measure.",
        [
          "Frame and modifiers",
          compress(
            ["In my"],
            ["personal"],
            ["opinion, it is"],
            ["basically"],
            ["true that"],
            "the",
            ["final"],
            "outcome depends on the weather.",
          ),
        ],
        [
          "Padding and a buried verb",
          compress(
            ["At this point in time,", "Now"],
            "the committee",
            ["is in agreement", "agrees"],
            "that the plan is",
            ["a good one.", "good."],
          ),
        ],
      ),
    ],
    questions: [
      numeric(
        "Rewrite 'The motion was rejected by the committee' in the active voice. How many words does the active sentence have?",
        5,
        "Five: 'The committee rejected the motion.' The passive took seven.",
        [
          "Make the actor, the committee, the subject.",
          "Use the past-tense verb without 'was', and drop 'by'.",
          "Count every word, including both articles.",
        ],
      ),
      word(
        "Rewrite 'Mistakes were made by the finance office' in the active voice. What becomes the subject?",
        ["finance office"],
        "'The finance office made mistakes.' The actor, hidden in the 'by' phrase, moves into the subject position.",
        "Find the 'by' phrase: whoever sits inside it performed the action.",
      ),
      numeric(
        "Unbury the verbs in 'The committee made a decision to conduct a review of the policy': 'made a decision' becomes 'decided' and 'conduct a review of' becomes 'review'. How many words does the revision save?",
        5,
        "Twelve words become seven: 'The committee decided to review the policy.' Five are saved.",
        [
          "Count the words in the original sentence.",
          "Write out the revision and count it.",
          "Subtract the revised count from the original count.",
        ],
      ),
      numeric(
        "Cut the empty frame 'In my opinion, it is true that' and the redundant words 'personal', 'basically' and 'final' from 'In my personal opinion, it is basically true that the final outcome depends on the weather.' How many words remain?",
        6,
        "Sixteen words lose ten: 'The outcome depends on the weather.' Six remain.",
        [
          "Count the original sentence first.",
          "Count the frame words and the redundant words you are removing.",
          "Subtract, then check by reading what is left aloud.",
        ],
      ),
      numeric(
        "'The budget was approved by the council in March.' How many words does the active version save?",
        2,
        "Nine words become seven: 'The council approved the budget in March.' Two are saved.",
        [
          "Put the council in the subject position.",
          "Write the active sentence and count it.",
          "Subtract the active count from the passive count.",
        ],
      ),
      word(
        "'An investigation of the causes was carried out by the board.' Which verb is buried inside the noun 'investigation'?",
        ["investigate"],
        "'Investigate': 'The board investigated the causes' turns the noun back into a verb and the board into the subject.",
        "Remove the noun ending '-ation' and rebuild the verb.",
      ),
    ],
    cards: [
      card(
        "Unbury the verb in 'We had a discussion about the budget' to get 'We discussed the budget'. How many words are saved?",
        3,
        "Seven words become four; three are saved.",
      ),
      term(
        "In 'The window was broken', which participant in the action has the passive left out?",
        ["agent", "actor", "doer"],
        "The agent, or actor: the sentence never says who broke the window.",
      ),
    ],
  },
];
