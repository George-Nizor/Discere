import {
  beat,
  card,
  choose,
  forgetting,
  numeric,
  pairing,
  schedule,
  span,
  tally,
  term,
  word,
  type TeachingLesson,
} from "./definition.js";

const position = "Kg1 Rf1 Pf2 Pg2 Ph2 Qd1 Bc1 Nb1 Ra1 Pa2 Pb2 Pc3 Ke8 Rf8 Pf7 Pg7 Ph7 Qd8 Bc8 Nb8";

export const memoryLessons: TeachingLesson[] = [
  {
    id: "working-memory",
    title: "Holding it in mind",
    summary:
      "Estimate working-memory capacity in chunks and use knowledge to make the chunks bigger.",
    moduleId: "psych-memory",
    sourceIds: [
      "psych-memory-functions",
      "psych-memory-enhance",
      "psych-cowan-2001",
      "psych-chase-1973",
      "psych-baddeley-1966",
    ],
    beats: [
      beat(
        "Seven, or four?",
        "George Miller's 1956 estimate of short-term capacity was seven items, plus or minus two. When rehearsal and grouping are prevented, the better estimate is about four chunks, the figure Nelson Cowan defended in 2001. Nine unrelated digits, each its own chunk, overflow a four-chunk store by 9 − 4 = 5. Group them in threes and the same digits form three chunks, inside the limit.",
        ["Nine separate digits", span("4 9 1 7 2 8 5 3 6", [1, 1, 1, 1, 1, 1, 1, 1, 1])],
        ["Grouped in threes", span("4 9 1 7 2 8 5 3 6", [3, 3, 3])],
      ),
      beat(
        "Knowledge makes the chunks",
        "A chunk is a unit already stored in long-term memory. To someone who knows FBI, BBC, NHS and USA, those twelve letters are four chunks, which fit. Scramble the same letters and each one is its own chunk. With room for four chunks, chunking lets this reader hold 12 letters where letter-by-letter storage would hold 4: eight more.",
        ["Familiar acronyms", span("F B I B B C N H S U S A", [3, 3, 3, 3])],
        ["Same letters, scrambled", span("B S F U B N I H A C S B", Array(12).fill(1))],
      ),
      beat(
        "Experts chunk bigger",
        "Chase and Simon showed a chess master and weaker players a real game position for five seconds. The master rebuilt far more of it, recalling pieces in meaningful groups such as a castled king with its pawns. With random positions the advantage vanished. A 20-piece position held as four chunks is five pieces a chunk: the master's capacity is ordinary, while the chunks are rich.",
        ["Master: patterns", span(position, [5, 5, 5, 5])],
        ["Novice: single pieces", span(position, Array(20).fill(1))],
      ),
      beat(
        "Inside working memory",
        "Baddeley and Hitch split short-term storage into parts. The phonological loop holds speech-based material, which is why lists of similar-sounding words such as man, cat, map are recalled worse than pit, day, cow. The visuospatial sketchpad holds images and positions; the episodic buffer links them; a central executive directs attention among them.",
        ["Similar-sounding words", span("man cat map can cap mat", [1, 1, 1, 1, 1, 1], 4)],
        ["Different-sounding words", span("pit day cow pen sup hot", [1, 1, 1, 1, 1, 1], 4)],
      ),
    ],
    questions: [
      numeric(
        "Nine unrelated digits are read once, and each digit is its own chunk. With a capacity of four chunks, how many digits exceed the limit?",
        5,
        "Nine chunks against a capacity of four leaves 9 − 4 = 5 beyond the limit.",
        [
          "Each separate digit counts as one chunk.",
          "Compare the number of chunks with the capacity.",
          "Subtract the capacity from the number of digits.",
        ],
        "digits",
      ),
      numeric(
        "A reader with a four-chunk capacity knows the acronyms FBI, BBC, NHS and USA. How many more letters can they hold by chunking than by storing one letter per chunk?",
        8,
        "Four acronym chunks hold 12 letters; four single-letter chunks hold 4; the gain is 8.",
        [
          "Find how many letters fit when each chunk is an acronym.",
          "Find how many fit when each chunk is one letter.",
          "Subtract the second from the first.",
        ],
        "letters",
      ),
      numeric(
        "A chess master recalls a 20-piece position as 4 chunks. On average, how many pieces are in each chunk?",
        5,
        "20 pieces / 4 chunks = 5 pieces a chunk.",
        [
          "Average means total pieces shared equally across chunks.",
          "There are 20 pieces in the position.",
          "Divide by the number of chunks.",
        ],
        "pieces",
      ),
      choose(
        "Lists of similar-sounding words are harder to recall in order. Which part of Baddeley and Hitch's working-memory model does this point to?",
        ["Phonological loop", "Visuospatial sketchpad", "Central executive", "Episodic buffer"],
        0,
        "The phonological loop stores speech-based codes, so similar sounds interfere with one another.",
        "The interference comes from sound.",
      ),
      numeric(
        "A 16-digit card number is printed in groups of four. If each group becomes one chunk, how many chunks must be held?",
        4,
        "16 digits / 4 per group = 4 chunks.",
        [
          "Each printed group becomes a single chunk.",
          "Find how many groups of four make 16.",
          "Divide 16 by the group size.",
        ],
        "chunks",
      ),
      word(
        "What is the strategy of organising items into meaningful groups so more fits in short-term memory called?",
        ["chunking", "chunk"],
        "Chunking: grouping items into units already known from long-term memory.",
        "The groups are called chunks.",
      ),
    ],
    cards: [
      card(
        "Someone groups 15 letters into 5 familiar words. Against a capacity of 4 chunks, how many chunks over the limit are they?",
        1,
        "5 chunks − 4 = 1 over the limit.",
        "chunks",
      ),
      term(
        "Which component of Baddeley and Hitch's working-memory model directs attention and coordinates the other parts?",
        ["central executive", "executive"],
        "The central executive.",
      ),
    ],
  },
  {
    id: "forgetting-and-spacing",
    title: "Forgetting and spaced retrieval",
    summary:
      "Read a forgetting curve and see how each successful retrieval flattens it, as Discere's scheduler assumes.",
    moduleId: "psych-memory",
    sourceIds: [
      "psych-memory-problems",
      "psych-memory-enhance",
      "psych-murre-2015",
      "psych-roediger-2006",
      "psych-fsrs",
    ],
    beats: [
      beat(
        "Stability sets the slope",
        "Ebbinghaus found forgetting fast at first and slower later; a 2015 replication by Murre and Dros reproduced the shape. This course uses the curve R = 1/(1 + t/9S), where t is days since the last retrieval and S is stability: the number of days until predicted recall falls to 90%. With S = 10, recall reaches 50% when t/90 = 1, at day 90. A memory with S = 2 halves by day 18.",
        ["Stability 10 days", forgetting(10, 120)],
        ["Stability 2 days", forgetting(2, 120)],
      ),
      beat(
        "A retrieval resets the clock",
        "A successful review returns recall to near 100% and also raises stability. Here a review on day 4 triples S from 2 to 6 days. Thirteen and a half days later recall is 1/(1 + 13.5/54) = 0.8, or 80%. Without the review, recall on that day, day 17.5, would be about 51%.",
        ["Reviewed on day 4", forgetting(2, 30, [4], 3)],
        ["Never reviewed", forgetting(2, 30)],
      ),
      beat(
        "Why the scheduler waits",
        "Discere schedules reviews with FSRS. Each card has a stability; a review is due when predicted recall falls to the target of 90%, which by definition is S days after the last one. So a card with S = 12 is due in 12 days. Each success raises S, so intervals expand. The current FSRS-6 curve has a fitted, flatter tail than the one drawn here, though it shares the 90% point at S.",
        ["Three spaced reviews", forgetting(2, 90, [2, 8, 26], 3)],
        ["No reviews", forgetting(2, 90)],
      ),
      beat(
        "Recall beats rereading",
        "Roediger and Karpicke had students either reread a passage or practise recalling it. Five minutes later rereading looked better, 81% against 75%. A week later the order flipped: 56% of idea units for recall practice against 42% for rereading, a gap of 14 percentage points. Effortful retrieval feels worse and lasts longer, which is why Discere asks before it shows.",
        [
          "Practised recall, one week later",
          tally("Recall after one week, per 100 idea units", 56, 100, "Recalled", "Forgotten"),
        ],
        [
          "Reread, one week later",
          tally("Recall after one week, per 100 idea units", 42, 100, "Recalled", "Forgotten"),
        ],
      ),
    ],
    questions: [
      numeric(
        "Using R = 1/(1 + t/9S), a memory has stability S = 10 days. What percentage recall is predicted 90 days after learning?",
        50,
        "t/9S = 90/90 = 1, so R = 1/(1 + 1) = 0.5, or 50%.",
        [
          "Compute 9S first.",
          "Divide t by 9S.",
          "Substitute into 1/(1 + t/9S) and convert to a percentage.",
        ],
        "%",
      ),
      numeric(
        "After a review, a memory's stability is 6 days. Using R = 1/(1 + t/9S), what percentage recall is predicted 13.5 days after that review?",
        80,
        "9S = 54; t/9S = 13.5/54 = 0.25; R = 1/1.25 = 0.8, or 80%.",
        [
          "Multiply the stability by 9.",
          "Divide 13.5 by that product.",
          "Take one over one plus your answer.",
        ],
        "%",
      ),
      numeric(
        "A card has stability 12 days. If reviews are scheduled for when predicted recall falls to 90%, how many days after its last review is it due?",
        12,
        "Stability is defined as the interval at which predicted recall reaches 90%, so the card is due in 12 days.",
        [
          "Recall the definition of stability.",
          "The 90% target matches that definition exactly.",
          "The interval equals the stability.",
        ],
        "days",
      ),
      numeric(
        "A week after studying, students who practised recall remembered 56% of idea units and students who reread remembered 42%. How many percentage points higher was recall practice?",
        14,
        "56 − 42 = 14 percentage points.",
        [
          "Compare the two one-week scores.",
          "Percentage points are a plain difference of percentages.",
          "Subtract the rereading score from the recall-practice score.",
        ],
        "%",
      ),
      numeric(
        "A memory has stability S = 4 days. Using R = 1/(1 + t/9S), what percentage recall is predicted 108 days after learning?",
        25,
        "9S = 36; t/9S = 108/36 = 3; R = 1/(1 + 3) = 25%.",
        ["Multiply S by 9.", "Divide 108 by that result.", "Take one over one plus the quotient."],
        "%",
      ),
      word(
        "Studying in short sessions spread over days, rather than one long session, is called what kind of practice?",
        ["distributed", "spaced", "spacing"],
        "Distributed, or spaced, practice.",
        "It is the opposite of massed practice, or cramming.",
        ["massed"],
      ),
    ],
    cards: [
      card(
        "Using R = 1/(1 + t/9S) with stability S = 3 days, what percentage recall is predicted 9 days later?",
        75,
        "t/9S = 9/27 = 1/3; R = 1/(4/3) = 0.75, or 75%.",
        "%",
      ),
      card(
        "A memory has stability 8 days, and a successful review multiplies stability by 2.5. What is the new stability in days?",
        20,
        "8 × 2.5 = 20 days.",
        "days",
      ),
    ],
  },
  {
    id: "conditioning",
    title: "Conditioning and reinforcement",
    summary:
      "Track how a signal gains associative strength and how reinforcement schedules shape behaviour.",
    moduleId: "psych-memory",
    sourceIds: ["psych-classical", "psych-operant", "psych-rescorla-1972"],
    beats: [
      beat(
        "Learning a signal",
        "Pavlov's dogs came to salivate at a bell that had preceded food. The Rescorla–Wagner rule describes the growth: on each pairing, associative strength V rises by a learning rate times the gap to its maximum, ΔV = αβ(λ − V). With rate 0.3 and maximum 1, V goes from 0 to 0.3, then 0.3 + 0.3 × 0.7 = 0.51. Each step is smaller, because there is less left to learn.",
        ["Three pairings", pairing(0.3, "PPP")],
        ["Six pairings", pairing(0.3, "PPPPPP")],
      ),
      beat(
        "Extinction",
        "Ring the bell without food and λ becomes 0, so V falls by the same proportion each trial. With rate 0.5, two pairings give 0.5 then 0.75; one bell-alone trial halves that to 0.375. The model treats this as unlearning, yet responding can return after a rest, called spontaneous recovery. That is a known limit: extinction adds new learning more than it erases the old.",
        ["Two pairings, one bell alone", pairing(0.5, "PPA")],
        ["Two pairings, two bells alone", pairing(0.5, "PPAA")],
      ),
      beat(
        "Ratio schedules",
        "In operant conditioning a consequence follows a behaviour. On a fixed-ratio 5 schedule every fifth response earns a reward, so 30 responses earn 6. A variable-ratio schedule averages five but never says when; it produced the same six rewards here, yet it keeps responding high and extinction slow, as slot machines show. The staircase is a cumulative record: each tick a response, each dot a reward.",
        ["Fixed ratio 5", schedule("fixed_ratio", [5], 2, 60)],
        ["Variable ratio, mean 5", schedule("variable_ratio", [3, 7, 2, 8, 5], 2, 60)],
      ),
      beat(
        "Interval schedules",
        "On a fixed-interval schedule the first response after a set time is rewarded. With a 10-second interval and a response every 3 seconds, rewards come at 12, 24, 36, 48 and 60 seconds: five in a minute, no matter how fast you respond. Animals learn to pause after each reward and speed up near the deadline. Variable intervals remove that pattern and produce steady, moderate responding.",
        ["Fixed interval 10 s", schedule("fixed_interval", [10], 3, 60)],
        ["Variable interval, mean 10 s", schedule("variable_interval", [4, 16, 10, 6, 14], 3, 60)],
      ),
    ],
    questions: [
      numeric(
        "Under the Rescorla–Wagner rule ΔV = αβ(λ − V), with rate αβ = 0.3, maximum λ = 1 and V starting at 0, what is V after two pairings of bell and food?",
        0.51,
        "Trial 1: V = 0 + 0.3 × 1 = 0.3. Trial 2: V = 0.3 + 0.3 × (1 − 0.3) = 0.51.",
        [
          "Work one trial at a time.",
          "The first trial adds 0.3 × (1 − 0).",
          "On trial two the remaining gap is 1 − 0.3.",
        ],
      ),
      numeric(
        "With rate 0.5 and maximum 1, a bell is paired with food twice and then presented alone once (λ = 0). Starting from V = 0, what is the final V?",
        0.375,
        "Pairings: 0.5, then 0.75. Alone: 0.75 + 0.5 × (0 − 0.75) = 0.375.",
        [
          "Compute the two pairings first.",
          "On the bell-alone trial the target is 0.",
          "Move V halfway towards 0 from its value after two pairings.",
        ],
      ),
      numeric(
        "On a fixed-ratio 5 schedule, a pigeon makes 30 pecks. How many rewards does it earn?",
        6,
        "Every fifth response is rewarded: 30/5 = 6.",
        [
          "Fixed ratio 5 means a fixed number of responses per reward.",
          "Count how many complete sets of five fit in 30.",
          "Divide 30 by 5.",
        ],
        "rewards",
      ),
      numeric(
        "On a fixed-interval 10-second schedule, a rat presses every 3 seconds for 60 seconds. The first press at least 10 s after the previous reward is rewarded. How many rewards does it earn?",
        5,
        "Rewarded presses fall at 12, 24, 36, 48 and 60 s: five rewards.",
        [
          "The first press at or after 10 s is at 12 s.",
          "The next must come at least 10 s after 12 s.",
          "Keep stepping until 60 s and count.",
        ],
        "rewards",
      ),
      word(
        "A slot machine pays out after an unpredictable number of plays, averaging one win in twenty. Which reinforcement schedule is this?",
        ["variable ratio", "variable-ratio", "VR"],
        "Variable ratio: rewards follow an unpredictable number of responses.",
        "Decide whether rewards depend on time or on the number of responses, and whether that number is predictable.",
        ["fixed ratio", "variable interval", "fixed interval"],
      ),
      choose(
        "A child's screen time is taken away after they hit a sibling, and the hitting becomes less frequent. Which consequence is this?",
        [
          "Negative punishment",
          "Positive punishment",
          "Negative reinforcement",
          "Positive reinforcement",
        ],
        0,
        "Something pleasant is removed (negative) and the behaviour decreases (punishment).",
        "Ask whether something was added or removed, and whether the behaviour rose or fell.",
      ),
    ],
    cards: [
      card(
        "Rescorla–Wagner with rate 0.4, maximum 1 and V starting at 0: what is V after two paired trials?",
        0.64,
        "0.4, then 0.4 + 0.4 × 0.6 = 0.64.",
      ),
      term(
        "Which reinforcement schedule produces behaviour that is most resistant to extinction?",
        ["variable ratio", "variable-ratio", "VR"],
        "The variable-ratio schedule.",
      ),
    ],
  },
];
