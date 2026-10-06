import {
  argument,
  bayes,
  beat,
  cardNumber,
  cardWord,
  choose,
  knowledge,
  numeric,
  word,
  type TeachingLesson,
} from "./definition.js";

const coins = knowledge(
  "Smith",
  "The man who will get the job has ten coins in his pocket.",
  "The company president told him Jones will get the job; he counted ten coins in Jones's pocket.",
  "Smith gets the job, and Smith happens to have ten coins in his own pocket.",
  { evidenceConnected: false },
);
const rainSeen = knowledge(
  "Ravi",
  "It is raining outside.",
  "He looks out of the window and sees rain falling on the street.",
  "It is raining, and the rain is what he sees.",
  { evidenceConnected: true },
);
const clock = knowledge(
  "Ana",
  "It is 2:15.",
  "The station clock, usually reliable, reads 2:15.",
  "It is 2:15, but the clock stopped exactly twelve hours ago.",
  { evidenceConnected: false },
);
const ford = knowledge(
  "Smith",
  "Either Jones owns a Ford or Brown is in Barcelona.",
  "Jones has always driven a Ford and has just offered Smith a ride in one.",
  "Jones rents the car and owns no Ford; by chance, Brown is in Barcelona.",
  { evidenceConnected: false },
);
const barns = knowledge(
  "Henry",
  "That is a barn.",
  "He sees a barn clearly from the road in good light.",
  "It is the one real barn in a county full of barn facades.",
  { evidenceConnected: false },
);
const demon: Array<["p" | "q", string]> = [
  ["p", "I know I have hands"],
  ["q", "I know I am not deceived by a demon"],
];

export const knowledgeLessons: TeachingLesson[] = [
  {
    id: "justified-true-belief",
    title: "Knowledge and Gettier cases",
    summary:
      "Apply the justified-true-belief analysis of knowledge and see how Gettier cases separate it from knowing.",
    moduleId: "phil-knowledge",
    sourceIds: ["os-knowledge", "sep-knowledge-analysis"],
    beats: [
      beat(
        "Three conditions",
        "The traditional analysis says S knows that p when p is true, S believes p and S is justified in believing p. Smith's belief meets all three: it is true and he holds it, having inferred it from good evidence. Edmund Gettier's 1963 paper used this case to argue that the three conditions can all hold while the belief is true only by luck. Smith's evidence was about Jones; the fact that makes his belief true is about Smith.",
        ["Smith's coins", coins],
        ["Ravi sees rain", rainSeen],
      ),
      beat(
        "A clock that stopped",
        "Bertrand Russell described the stopped clock in Human Knowledge, years before Gettier. Ana's belief is true, she believes it, and reading a usually reliable clock is a good reason. So the JTB analysis counts it as knowledge. Most readers judge that she does not know the time: had she looked a minute later, she would have formed a false belief from the same evidence.",
        ["Stopped clock", clock],
        ["Ravi sees rain", rainSeen],
      ),
      beat(
        "Necessary or sufficient",
        "A condition is necessary when knowledge cannot exist without it, and sufficient when it guarantees knowledge. Gettier did not dispute that truth, belief and justification are each needed. His cases show that together they still fall short: the trio is not sufficient. In the Ford case Smith validly infers a disjunction from a well-supported false belief, and the disjunction comes out true by coincidence.",
        ["Ford or Barcelona", ford],
        ["Smith's coins", coins],
      ),
      beat(
        "Fake barns",
        "Carl Ginet's fake-barn case, published by Alvin Goldman in 1976, has no false step to blame. Henry sees a real barn, but in that county he would have believed the same of any facade. His belief is not safe: it could easily have been false. Safety and reliability conditions explain why he lacks knowledge, whereas the no-false-lemmas reply, which blames a false belief in the reasoning, does not.",
        ["Fake barn county", barns],
        ["Stopped clock", clock],
      ),
    ],
    questions: [
      numeric(
        "Gettier's first case: Smith has strong evidence that Jones will get the job and that Jones has ten coins in his pocket. He concludes 'the man who will get the job has ten coins in his pocket'. In fact Smith gets the job and, unknown to him, has ten coins himself. How many of the three JTB conditions does his belief meet?",
        3,
        "All three. The belief is true and Smith believes it, having inferred it from strong evidence. That is why the case troubles the analysis.",
        [
          "List the conditions: truth, belief and justification.",
          "Check truth against what actually happened, not against Smith's evidence.",
          "Check whether his reasons were good ones when he formed the belief.",
        ],
      ),
      word(
        "Ana looks at a usually reliable station clock reading 2:15 and believes it is 2:15. It is 2:15, but the clock stopped exactly twelve hours ago. On the JTB analysis, does Ana know the time? Answer yes or no.",
        "yes",
        [],
        "Yes on the JTB analysis, since the belief is true, held and justified. Most people judge that she does not know, which is the problem for the analysis.",
        [
          "Apply the analysis mechanically: check each of its three conditions.",
          "The question asks what the analysis says, not what intuition says.",
        ],
        ["no"],
      ),
      word(
        "Gettier cases show that justified true belief is not ___ for knowledge. Fill the gap with 'necessary' or 'sufficient'.",
        "sufficient",
        ["enough"],
        "Sufficient: all three conditions hold in a Gettier case, yet the subject does not know.",
        [
          "In a Gettier case, are all three conditions present?",
          "If they are present and knowledge is absent, what do they fail to guarantee?",
        ],
        ["necessary"],
      ),
      word(
        "Henry drives through a county full of barn facades and looks at the only real barn. Could his true belief 'that is a barn' easily have been false? Answer yes or no.",
        "yes",
        [],
        "Yes. Had he looked at any of the facades he would have formed the same belief, and it would have been false. The belief is not safe.",
        [
          "Imagine Henry glancing at a different building along the same road.",
          "Would his evidence have looked any different?",
        ],
        ["no"],
      ),
      choose(
        "The no-false-lemmas reply says Smith's reasoning in the coins case passed through a false belief. Which one?",
        [
          "Jones will get the job",
          "Smith has ten coins in his pocket",
          "The man who will get the job has ten coins",
        ],
        0,
        "Smith reasoned from 'Jones will get the job', which is false. The other two claims are true.",
        "Find the step in Smith's reasoning that did not match what happened.",
      ),
      word(
        "Who published the three-page paper 'Is Justified True Belief Knowledge?' in 1963?",
        "gettier",
        ["edmund gettier"],
        "Edmund Gettier, in Analysis, 1963.",
        ["The cases that bear his name answer the paper's question."],
      ),
    ],
    cards: [
      cardNumber(
        "In a standard Gettier case, how many of the three conditions of the justified-true-belief analysis fail?",
        0,
        "None fail. All three hold, yet the subject does not know; that is what makes it a Gettier case.",
      ),
      cardWord(
        "Name the condition, proposed in response to Gettier, that a known belief could not easily have been false.",
        "safety",
        ["safe", "safety condition"],
        "Safety: in nearby situations where the subject believes it, the belief is true.",
      ),
    ],
  },
  {
    id: "scepticism-and-closure",
    title: "Dreams, demons and closure",
    summary:
      "Reconstruct the sceptic's closure argument, test it, and compare the replies of Moore, Dretske and Nozick.",
    moduleId: "phil-knowledge",
    sourceIds: ["os-skepticism", "sep-closure-epistemic", "descartes-meditations", "forallx-ch12"],
    beats: [
      beat(
        "The sceptic's argument",
        "Descartes imagines a demon who deceives him about everything he seems to perceive. The modern sceptic turns that into a short argument. If I know I have hands, I know I am not deceived by such a demon. I do not know I am not deceived. So I do not know I have hands. The form is modus tollens, so the argument is valid. A reply has to reject a premise.",
        [
          "Sceptic",
          argument(
            [
              ["If I know I have hands, I know I am not deceived by a demon.", "p → q"],
              ["I do not know I am not deceived by a demon.", "¬q"],
            ],
            ["I do not know I have hands.", "¬p"],
            { atoms: demon },
          ),
        ],
        [
          "Moore",
          argument(
            [
              ["If I know I have hands, I know I am not deceived by a demon.", "p → q"],
              ["I know I have hands.", "p"],
            ],
            ["I know I am not deceived by a demon.", "q"],
            { atoms: demon },
          ),
        ],
      ),
      beat(
        "Turning it around",
        "In 1939 G. E. Moore held up his hands and ran the argument the other way. He shares the sceptic's first premise but starts from 'I know I have hands', and modus ponens delivers 'I know I am not deceived'. Both arguments are valid. The dispute is over which premise deserves more confidence, and Moore found his hands more certain than any philosophical premise against them.",
        [
          "Moore",
          argument(
            [
              ["If I know I have hands, I know I am not deceived by a demon.", "p → q"],
              ["I know I have hands.", "p"],
            ],
            ["I know I am not deceived by a demon.", "q"],
            { atoms: demon },
          ),
        ],
        [
          "Sceptic",
          argument(
            [
              ["If I know I have hands, I know I am not deceived by a demon.", "p → q"],
              ["I do not know I am not deceived by a demon.", "¬q"],
            ],
            ["I do not know I have hands.", "¬p"],
            { atoms: demon },
          ),
        ],
      ),
      beat(
        "Where the premises hold together",
        "For 'p → q, ¬q, so ¬p', the second premise rules out the rows where q is true. Of the two that remain, p → q is false where p is true, so only the row with p false and q false keeps both premises true. There the conclusion ¬p is true, so no counterexample exists. Testing every row is how 'this looks valid' becomes 'this is valid'.",
        [
          "Sceptic",
          argument(
            [
              ["If I know I have hands, I know I am not deceived by a demon.", "p → q"],
              ["I do not know I am not deceived by a demon.", "¬q"],
            ],
            ["I do not know I have hands.", "¬p"],
            { atoms: demon },
          ),
        ],
        [
          "A tempting variant",
          argument(
            [
              ["If I know I have hands, I know I am not deceived by a demon.", "p → q"],
              ["I do not know I have hands.", "¬p"],
            ],
            ["I do not know I am not deceived by a demon.", "¬q"],
            { atoms: demon },
          ),
        ],
      ),
      beat(
        "Denying closure",
        "The first premise is an instance of closure: if you know p, and know that p entails q, you know q. Fred Dretske and Robert Nozick rejected closure. On Nozick's tracking account you know you have hands because, if you had none, you would not believe you had. You cannot know you are not envatted, since an envatted brain would believe it was not. Their price is accepting 'I know I have hands but cannot know I am not a handless brain in a vat'.",
        [
          "Closure-based doubt",
          argument(
            [
              ["If I know I have hands, I know I am not a handless brain in a vat.", "p → q"],
              ["I do not know I am not a handless brain in a vat.", "¬q"],
            ],
            ["I do not know I have hands.", "¬p"],
            {
              atoms: [
                ["p", "I know I have hands"],
                ["q", "I know I am not a handless brain in a vat"],
              ],
            },
          ),
        ],
        [
          "Nozick's verdicts",
          argument(
            [
              ["I know I have hands.", "p"],
              ["I do not know I am not a handless brain in a vat.", "¬q"],
            ],
            ["Here closure fails: I know p without knowing q.", "¬(p → q)"],
            {
              atoms: [
                ["p", "I know I have hands"],
                ["q", "I know I am not a handless brain in a vat"],
              ],
            },
          ),
        ],
      ),
    ],
    questions: [
      word(
        "Premises: 'If I know I have hands, I know I am not deceived by a demon' and 'I do not know I am not deceived by a demon'. Conclusion: 'I do not know I have hands'. Valid or invalid?",
        "valid",
        [],
        "Valid. The form is modus tollens: p → q, ¬q, so ¬p.",
        [
          "Write it as p → q, ¬q, so ¬p.",
          "Is there a row in which both premises are true and ¬p is false?",
        ],
        ["invalid"],
      ),
      word(
        "Which philosopher answered the sceptic in 1939 by holding up his hands and arguing from 'here is one hand' to the existence of an external world?",
        "moore",
        ["g. e. moore", "george edward moore"],
        "G. E. Moore, in 'Proof of an External World'.",
        ["He was a Cambridge philosopher famous for defending common sense."],
      ),
      numeric(
        "For the form 'p → q, ¬q, so ¬p', in how many of the four truth-table rows are both premises true?",
        1,
        "Only the row with p false and q false. There ¬p is true, so the form has no counterexample.",
        [
          "The premise ¬q keeps only the rows in which q is false.",
          "In those rows, check where p → q is true.",
          "A conditional with a true antecedent and false consequent is false.",
        ],
      ),
      word(
        "Dretske and Nozick hold that you know you have hands but cannot know you are not a handless brain in a vat. Which principle about knowledge must they reject?",
        "closure",
        ["epistemic closure", "closure principle", "closure under known entailment"],
        "Closure: the principle that knowledge carries over to what you know your knowledge entails.",
        [
          "Their two verdicts together contradict a general principle linking known claims to what they entail.",
          "The principle says knowledge is 'closed' under known entailment.",
        ],
      ),
      choose(
        "What does Descartes' all-powerful deceiver, a deceiving God or evil demon, put in doubt that his dream argument leaves standing?",
        [
          "Simple truths of arithmetic, such as two and three making five",
          "Beliefs about distant cities",
          "Memories of the day before",
        ],
        0,
        "Descartes notes that two and three make five whether he wakes or sleeps. An all-powerful deceiver could make him err even there.",
        "Ask which beliefs would stay true even inside a dream.",
      ),
      word(
        "In the Second Meditation, what did Descartes take to survive even the demon's deception? Answer in two words.",
        "i exist",
        ["i am", "cogito", "i think"],
        "'I exist': whatever deception he suffers, he must exist to be deceived.",
        ["Even a deceiver needs someone to deceive.", "The claim concerns the thinker himself."],
      ),
    ],
    cards: [
      cardWord(
        "Name the principle: if you know p, and know that p entails q, then you know q.",
        "closure",
        ["epistemic closure", "closure principle"],
        "The closure principle.",
      ),
      cardWord(
        "Name the modern sceptical scenario in which a scientist keeps a brain alive and feeds it experiences by computer.",
        "brain in a vat",
        ["vat", "envatted brain"],
        "The brain in a vat.",
      ),
    ],
  },
  {
    id: "bayesian-evidence",
    title: "Evidence and credence",
    summary:
      "Update a degree of belief with Bayes' theorem, using natural frequencies, base rates and likelihood ratios.",
    moduleId: "phil-knowledge",
    sourceIds: ["sep-epistemology-bayesian", "os-inferences"],
    beats: [
      beat(
        "Count people, not percentages",
        "Bayes' theorem says P(H | E) = P(E | H) × P(H) / P(E). Natural frequencies make it concrete. Of 1,000 people, 100 have the condition and the test flags 90 of them. Of the 900 without it, 10% also test positive: another 90. So 180 positives, of whom 90 are ill, and a positive result leaves a 50% chance of illness, far below the test's 90% hit rate.",
        ["Common condition", bayes(1000, 0.1, 0.9, 0.1)],
        ["Rare condition", bayes(1000, 0.01, 0.9, 0.1)],
      ),
      beat(
        "The base rate decides",
        "Run the same test on a condition that affects 1% of people. Of 1,000, ten are ill and nine test positive. Of the 990 who are well, 10% test positive: 99 people. A positive result now means illness only 9 times in 108, about 8%. Judging the test by its hit rate alone, and forgetting how rare the condition is, is called base-rate neglect.",
        ["Rare condition", bayes(1000, 0.01, 0.9, 0.1)],
        ["Common condition", bayes(1000, 0.1, 0.9, 0.1)],
      ),
      beat(
        "Odds times the likelihood ratio",
        "Bayes' theorem has a compact odds form: posterior odds = prior odds × likelihood ratio. The likelihood ratio compares how probable the evidence is if H is true with how probable it is if H is false: here 0.9 against 0.1. A 10% prior is odds of 1 to 9; multiplying gives even odds, which is 50%. A 1% prior is 1 to 99, and the same test lifts it only to 9 to 99.",
        ["10% prior", bayes(1000, 0.1, 0.9, 0.1)],
        ["1% prior", bayes(1000, 0.01, 0.9, 0.1)],
        ["Sharper test", bayes(1000, 0.01, 0.9, 0.01)],
      ),
      beat(
        "A different test",
        "Change one number at a time and recount. A test that catches 80% of cases and gives false alarms to 5% of healthy people, used where 10% are ill, yields 80 true positives and 45 false ones among 1,000. The posterior is 80 out of 125. Lowering false alarms usually does more for a rare condition than raising the hit rate.",
        ["Fewer false alarms", bayes(1000, 0.1, 0.8, 0.05)],
        ["Original test", bayes(1000, 0.1, 0.9, 0.1)],
      ),
    ],
    questions: [
      numeric(
        "1,000 people are screened. 10% have the condition. The test is positive for 90% of people with it and for 10% of people without it. What percentage of people who test positive have the condition?",
        50,
        "100 are ill and 90 of them test positive. 900 are well and 90 of them test positive. 90 of 180 positives are ill: 50%.",
        [
          "Find how many of the 1,000 have the condition, and how many of those test positive.",
          "Find how many of the healthy people test positive.",
          "Divide the ill positives by all positives.",
        ],
        "%",
      ),
      numeric(
        "The same test (90% hit rate, 10% false alarms) is used on 1,000 people, of whom 1% have the condition. How many people test positive in total?",
        108,
        "10 are ill and 9 test positive. 990 are well and 99 test positive. 9 + 99 = 108.",
        [
          "Find the number who are ill, then the number of them the test catches.",
          "Apply the false-alarm rate to everyone who is well.",
          "Add the two groups of positives.",
        ],
      ),
      numeric(
        "A test is positive for 90% of people with a condition and for 10% of people without it. By what factor does a positive result multiply the odds that someone has the condition?",
        9,
        "The likelihood ratio is 0.9 / 0.1 = 9, so posterior odds are nine times the prior odds.",
        [
          "The factor is the likelihood ratio.",
          "Compare P(positive | condition) with P(positive | no condition).",
          "Divide the hit rate by the false-alarm rate.",
        ],
      ),
      numeric(
        "Of 1,000 people, 10% have a condition. A test catches 80% of cases and is positive for 5% of people without the condition. What percentage of positives have the condition?",
        64,
        "80 true positives and 0.05 × 900 = 45 false positives. 80 / 125 = 64%.",
        [
          "Count the ill people the test catches.",
          "Count the healthy people it flags.",
          "Divide true positives by all positives and convert to a percentage.",
        ],
        "%",
      ),
      numeric(
        "P(H) = 0.2, P(E | H) = 0.5 and P(E | not-H) = 0.25. Find P(H | E), as a fraction or a decimal to three places.",
        1 / 3,
        "The joint probability of E and H is 0.2 × 0.5 = 0.1; of E without H, 0.8 × 0.25 = 0.2. So P(H | E) = 0.1 / (0.1 + 0.2) = 1/3.",
        [
          "Find the probability of E and H together.",
          "Find the probability of E without H, using P(not-H) = 1 − P(H).",
          "Divide the first by the sum of both.",
        ],
        "",
        0.0006,
      ),
      word(
        "What is the name for the error of judging P(H | E) from P(E | H) while ignoring how common H was to begin with? Two words are enough.",
        "base rate",
        ["base-rate", "base rates", "prior probability neglect"],
        "Base-rate neglect, also called the base-rate fallacy.",
        [
          "The neglected quantity is the prior: how often H holds in the population.",
          "Statisticians call that frequency the '___ rate'.",
        ],
      ),
    ],
    cards: [
      cardNumber(
        "A hypothesis starts at odds of 1 to 1. Evidence is three times as likely if it is true as if it is false. What is the posterior probability, as a percentage?",
        75,
        "Posterior odds are 3 to 1, which is a probability of 3/4 = 75%.",
        "%",
      ),
      cardWord(
        "Name the theorem that gives P(H | E) from P(E | H), P(H) and P(E).",
        "bayes",
        ["bayesian"],
        "Bayes' theorem.",
      ),
    ],
  },
];
