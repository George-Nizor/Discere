import {
  beat,
  card,
  cues,
  detection,
  numeric,
  switching,
  tally,
  term,
  word,
  type TeachingLesson,
} from "./definition.js";

export const perceptionLessons: TeachingLesson[] = [
  {
    id: "signal-detection",
    title: "Signal and noise",
    summary:
      "Separate how well an observer can tell signal from noise (d′) from how willing they are to say yes.",
    moduleId: "psych-perception",
    sourceIds: ["psych-sensation"],
    beats: [
      beat(
        "Four outcomes",
        "Every decision about a faint signal falls in one of four cells. On scans with a tumour, saying yes is a hit and saying no a miss. On clear scans, yes is a false alarm and no a correct rejection. Reporting 40 of 50 tumours is a hit rate of 40/50 = 80%. The criterion line splits each curve: the signal curve's area to its right is the hit rate, the noise curve's area to its right is the false-alarm rate.",
        ["Criterion midway", detection(1.68, 0.84, "Tumour present")],
        ["A stricter radiologist", detection(1.68, 1.5, "Tumour present")],
      ),
      beat(
        "Measure sensitivity",
        "Sensitivity, d′, is the distance between the noise and signal curves in standard-deviation units. Convert each rate to a z-score and subtract: d′ = z(H) − z(FA). A hit rate of 0.80 has z = 0.84 and a false-alarm rate of 0.20 has z = −0.84, so d′ = 0.84 − (−0.84) = 1.68. Noisier scans pull the curves together and lower d′ whatever the observer decides.",
        ["Clear scans", detection(1.68, 0.84, "Tumour present")],
        ["Noisier scans", detection(0.8, 0.4, "Tumour present")],
      ),
      beat(
        "Move the criterion",
        "Drag the criterion left and the observer says yes more often: hits rise to about 0.95, but false alarms rise to 0.50. The curves have not moved, so d′ is unchanged: 1.68 − 0 = 1.68. This is why a raw hit rate cannot compare two observers. One may simply be more willing to say yes.",
        ["Neutral observer", detection(1.68, 0.84, "Tumour present")],
        ["Liberal observer", detection(1.68, 0, "Tumour present")],
      ),
      beat(
        "Bias in one number",
        "The criterion location c = −[z(H) + z(FA)]/2 measures willingness to say yes. It is zero when the line sits midway between the curves, negative for a liberal observer and positive for a conservative one. The liberal observer has c = −(1.68 + 0)/2 = −0.84. Sensitivity and bias are separate: training improves d′, while costs and rewards move c.",
        ["Liberal observer", detection(1.68, 0, "Tumour present")],
        ["Conservative observer", detection(1.68, 1.68, "Tumour present")],
      ),
    ],
    questions: [
      numeric(
        "A radiologist reviews 50 scans that contain a tumour and reports a tumour on 40 of them. What is the hit rate as a percentage?",
        80,
        "Hit rate = hits/signal trials = 40/50 = 0.80, or 80%.",
        [
          "A hit is a yes on a trial where the signal is present.",
          "Divide by the number of scans with a tumour, not all scans.",
          "Convert 40/50 to a percentage.",
        ],
        "%",
      ),
      numeric(
        "An observer's hit rate is 0.80 (z = 0.84) and false-alarm rate is 0.20 (z = −0.84). What is d′?",
        1.68,
        "d′ = z(H) − z(FA) = 0.84 − (−0.84) = 1.68.",
        [
          "d′ subtracts the false-alarm z-score from the hit z-score.",
          "Subtracting a negative number adds its size.",
          "Calculate 0.84 + 0.84.",
        ],
      ),
      numeric(
        "On the same scans, a liberal observer has hit rate 0.954 (z = 1.68) and false-alarm rate 0.50 (z = 0). What is this observer's d′?",
        1.68,
        "d′ = 1.68 − 0 = 1.68. Sensitivity is unchanged; only the criterion moved.",
        [
          "Use the same formula as before with the new z-scores.",
          "The z-score of a 0.50 rate is zero.",
          "Subtract the false-alarm z-score from the hit z-score.",
        ],
      ),
      numeric(
        "For the liberal observer, z(H) = 1.68 and z(FA) = 0. What is the criterion location c = −[z(H) + z(FA)]/2?",
        -0.84,
        "c = −(1.68 + 0)/2 = −0.84. A negative c means a bias towards saying yes.",
        [
          "Add the two z-scores first.",
          "Halve the sum.",
          "Keep the minus sign in front of the bracket.",
        ],
      ),
      numeric(
        "A lifeguard spots swimmers in difficulty with hit rate 0.69 (z = 0.50) and raises false alarms at rate 0.07 (z = −1.48). What is d′?",
        1.98,
        "d′ = 0.50 − (−1.48) = 1.98.",
        ["Subtract z(FA) from z(H).", "The false-alarm z-score is negative.", "Add 0.50 and 1.48."],
      ),
      word(
        "Lowering the criterion so an observer says yes more often increases hits. Which other outcome, on noise trials, does it increase?",
        ["false alarms", "false alarm", "false positives", "false positive"],
        "It also increases false alarms: more yes responses when no signal is present.",
        "Think about the yes responses on trials with no signal.",
        ["correct rejection"],
      ),
    ],
    cards: [
      card(
        "An observer's hit rate has z = 1.0 and false-alarm rate has z = −0.5. What is d′?",
        1.5,
        "d′ = 1.0 − (−0.5) = 1.5.",
      ),
      card(
        "An observer has z(H) = 1.2 and z(FA) = −0.4. What is the criterion location c = −[z(H) + z(FA)]/2?",
        -0.4,
        "c = −(1.2 − 0.4)/2 = −0.4, a slight bias towards yes.",
      ),
    ],
  },
  {
    id: "attention-and-multitasking",
    title: "Where attention goes",
    summary: "Measure what selective attention misses and what switching between tasks costs.",
    moduleId: "psych-perception",
    sourceIds: ["psych-sensation", "psych-simons-1999", "psych-monsell-2003", "psych-watson-2010"],
    beats: [
      beat(
        "Count the passes",
        "Selective attention lets you follow one stream and ignore the rest, and the price is high. When Simons and Chabris asked viewers to count basketball passes, 46% failed to notice a person in a gorilla suit or with an umbrella walking through the game. In this illustrative class 14 of 30 counters missed it (46.7%), against 1 of 30 people who simply watched. This is inattentional blindness: seeing requires attending.",
        [
          "Counting passes",
          tally("Illustrative class counting passes", 14, 30, "Missed the gorilla", "Noticed it"),
        ],
        [
          "Just watching",
          tally("Illustrative class watching freely", 1, 30, "Missed the gorilla", "Noticed it"),
        ],
      ),
      beat(
        "Every switch costs time",
        "Alternate between judging digits as odd or even (A) and letters as vowel or consonant (B), and each change of task adds time while the mind reconfigures. With 600 ms per trial and a 200 ms switch cost, ABABABAB has 7 switches: 8 × 600 + 7 × 200 = 6,200 ms. Play the sequence and watch the switch trials stretch.",
        ["Alternating ABABABAB", switching("ABABABAB", 600, 200)],
        ["Blocked AAAABBBB", switching("AAAABBBB", 600, 200)],
      ),
      beat(
        "Blocked beats alternating",
        "The same eight judgements done as AAAABBBB involve one switch, so they take 8 × 600 + 200 = 5,000 ms. Alternating loses 1,200 ms more. Preparation shrinks switch costs but does not remove them, which is why answering messages while writing is slower than it feels: the costs are spread across many small switches.",
        ["Blocked AAAABBBB", switching("AAAABBBB", 600, 200)],
        ["Alternating ABABABAB", switching("ABABABAB", 600, 200)],
        ["Pairs AABBAABB", switching("AABBAABB", 600, 200)],
      ),
      beat(
        "Supertaskers are rare",
        "Watson and Strayer tested 200 people driving a simulator while doing a demanding memory-and-arithmetic task. Only 5, or 2.5%, showed no measurable cost from doing both. Most people who believe they multitask well are among the other 97.5%. Doing two demanding tasks usually means alternating between them, with the switch costs that brings.",
        [
          "No dual-task cost",
          tally("200 drivers in a simulator study", 5, 200, "Supertaskers", "Showed a cost"),
        ],
        [
          "Showed a cost",
          tally("200 drivers in a simulator study", 195, 200, "Showed a cost", "Supertaskers"),
        ],
      ),
    ],
    questions: [
      numeric(
        "In a class demonstration, 14 of 30 people counting basketball passes fail to notice a person in a gorilla suit. What percentage missed it? Give one decimal place.",
        46.7,
        "14/30 = 0.4667, or 46.7%, close to the 46% Simons and Chabris reported.",
        [
          "Divide the number who missed it by the number watching.",
          "The denominator is 30.",
          "Convert 14/30 to a percentage and round to one decimal place.",
        ],
        "%",
        0.051,
      ),
      numeric(
        "Each trial takes 600 ms, and changing task adds 200 ms. How long does the sequence ABABABAB take in total, in milliseconds?",
        6200,
        "ABABABAB has 7 switches: 8 × 600 + 7 × 200 = 6,200 ms.",
        [
          "Count the places where the letter changes.",
          "Every trial costs 600 ms; each switch adds 200 ms.",
          "Add 8 × 600 to the number of switches × 200.",
        ],
        "ms",
      ),
      numeric(
        "With 600 ms per trial and a 200 ms switch cost, how many milliseconds longer does ABABABAB take than AAAABBBB?",
        1200,
        "ABABABAB has 7 switches and AAAABBBB has 1; the extra 6 switches cost 6 × 200 = 1,200 ms.",
        [
          "Both sequences have eight trials, so only switches differ.",
          "Count the switches in each sequence.",
          "Multiply the difference in switches by 200 ms.",
        ],
        "ms",
      ),
      numeric(
        "In a simulator study, 5 of 200 drivers showed no cost from doing a demanding task while driving. What percentage is that?",
        2.5,
        "5/200 = 0.025, or 2.5%.",
        [
          "Divide the supertaskers by the total tested.",
          "The total is 200.",
          "Convert 5/200 to a percentage.",
        ],
        "%",
      ),
      numeric(
        "Each trial takes 500 ms and each change of task adds 150 ms. How long does AABBAABB take, in milliseconds?",
        4450,
        "AABBAABB switches 3 times: 8 × 500 + 3 × 150 = 4,450 ms.",
        [
          "Look for each place where A is followed by B or B by A.",
          "There are eight trials at 500 ms each.",
          "Add the switch costs to 4,000 ms.",
        ],
        "ms",
      ),
      word(
        "An observer concentrating on a task fails to see a clearly visible but unexpected object. What is this failure called?",
        ["inattentional blindness", "inattentional"],
        "Inattentional blindness: the object was visible but not attended.",
        "It is a kind of blindness caused by where attention was directed.",
        ["change blindness"],
      ),
    ],
    cards: [
      card(
        "Each trial takes 700 ms and each change of task adds 250 ms. How long does the sequence ABBA take, in milliseconds?",
        3300,
        "ABBA switches twice: 4 × 700 + 2 × 250 = 3,300 ms.",
        "ms",
      ),
      term(
        "What name is given to the phenomenon in which people counting basketball passes miss a person in a gorilla suit?",
        ["inattentional blindness", "inattentional"],
        "Inattentional blindness.",
      ),
    ],
  },
  {
    id: "perception-as-inference",
    title: "Perception as inference",
    summary:
      "Combine noisy cues and prior expectations by their reliability, as the perceptual system appears to.",
    moduleId: "psych-perception",
    sourceIds: ["psych-sensation", "psych-ernst-2002"],
    beats: [
      beat(
        "Two cues, one estimate",
        "Sight says a block is 50 mm tall, with a standard deviation of 2 mm; touch says 56 mm, with SD 4 mm. Weighting each cue by its reliability, 1/SD², gives vision 0.25/(0.25 + 0.0625) = 0.8 of the weight. The combined estimate is 0.8 × 50 + 0.2 × 56 = 51.2 mm. Ernst and Banks found people combine sight and touch with weights close to these.",
        ["Sharp vision", cues("Vision", 50, 2, "Touch", 56, 4, "mm")],
        ["Blurred vision", cues("Vision", 50, 4, "Touch", 56, 2, "mm")],
      ),
      beat(
        "Blur the eyes",
        "Add visual noise so vision's SD rises to 4 mm while touch improves to 2 mm, and the weights swap: touch now carries 0.8. The estimate moves to 0.2 × 50 + 0.8 × 56 = 54.8 mm. The same brain, given the same two readings, reaches a different answer because it tracks how trustworthy each reading is.",
        ["Blurred vision", cues("Vision", 50, 4, "Touch", 56, 2, "mm")],
        ["Sharp vision", cues("Vision", 50, 2, "Touch", 56, 4, "mm")],
      ),
      beat(
        "Two cues beat either",
        "Combining independent cues narrows the result. The combined SD is 1/√(1/SD₁² + 1/SD₂²). With SDs of 3 and 4 mm: 1/√(1/9 + 1/16) = 1/√(25/144) = 12/5 = 2.4 mm, smaller than either cue alone. The narrow curve in the explorer is that sharper estimate.",
        ["SDs 3 and 4 mm", cues("Vision", 50, 3, "Touch", 53, 4, "mm")],
        ["SDs 3 and 3 mm", cues("Vision", 50, 3, "Touch", 53, 3, "mm")],
      ),
      beat(
        "Expectation is a cue",
        "Knowledge enters the same calculation as a prior. Expect a line to be upright at 0° with SD 1°. Glimpse it at 10° with SD 3° and the prior carries 1/(1 + 1/9) = 0.9 of the weight: you see about 1°. This is top-down processing. A hollow mask seen from behind looks like an ordinary face because the expectation that faces bulge outwards outweighs the depth cues.",
        ["Ambiguous glimpse", cues("Expected tilt", 0, 1, "Seen tilt", 10, 3, "°")],
        ["Clear view", cues("Expected tilt", 0, 1, "Seen tilt", 10, 0.5, "°")],
      ),
    ],
    questions: [
      numeric(
        "Vision reports a height of 50 mm (SD 2 mm) and touch reports 56 mm (SD 4 mm). Weighting each by 1/SD², what is the combined estimate in millimetres?",
        51.2,
        "Weights 1/4 and 1/16 give vision 0.25/0.3125 = 0.8; estimate = 0.8 × 50 + 0.2 × 56 = 51.2 mm.",
        [
          "Reliability is one over the variance, 1/SD².",
          "Vision's share is its reliability divided by the sum of both.",
          "Multiply each reading by its share and add.",
        ],
        "mm",
      ),
      numeric(
        "Now vision reports 50 mm with SD 4 mm and touch reports 56 mm with SD 2 mm. What is the combined estimate in millimetres?",
        54.8,
        "Touch now has weight 0.8: 0.2 × 50 + 0.8 × 56 = 54.8 mm.",
        [
          "The more reliable cue now is touch.",
          "Its weight is (1/4)/(1/4 + 1/16).",
          "Combine 0.2 of the vision reading with the rest from touch.",
        ],
        "mm",
      ),
      numeric(
        "Two independent cues have standard deviations of 3 mm and 4 mm. What is the standard deviation of the combined estimate, 1/√(1/SD₁² + 1/SD₂²), in millimetres?",
        2.4,
        "1/9 + 1/16 = 25/144; the combined SD is √(144/25) = 12/5 = 2.4 mm.",
        [
          "Add the two reliabilities 1/9 and 1/16.",
          "Use the common denominator 144.",
          "Take one over the square root of the sum.",
        ],
        "mm",
      ),
      numeric(
        "You expect a line to be upright at 0° (SD 1°). You glimpse it at 10° (SD 3°). Combining expectation and glimpse by reliability, what tilt do you perceive, in degrees?",
        1,
        "Reliabilities 1 and 1/9 give the expectation weight 0.9; perceived tilt = 0.9 × 0 + 0.1 × 10 = 1°.",
        [
          "Treat the expectation as a cue with its own SD.",
          "The expectation's weight is 1/(1 + 1/9).",
          "Only the glimpse's share multiplies a non-zero reading.",
        ],
        "°",
      ),
      numeric(
        "Hearing places a voice 10° to the right (SD 8°); vision places the moving lips at 0° (SD 4°). Where is the voice heard, in degrees to the right?",
        2,
        "Reliabilities 1/64 and 1/16 give hearing weight (1/64)/(5/64) = 0.2; location = 0.2 × 10 = 2°. Vision captures the sound, as in ventriloquism.",
        [
          "Compute 1/SD² for each sense.",
          "Hearing's weight is its reliability over the total.",
          "Multiply that weight by 10°.",
        ],
        "°",
      ),
      word(
        "Perception guided by knowledge and expectation, rather than built only from incoming sensory features, is called what kind of processing?",
        ["top-down", "top down", "conceptually driven"],
        "Top-down processing: knowledge and expectation shape what is perceived.",
        "It runs in the opposite direction to bottom-up processing.",
        ["bottom-up", "bottom up"],
      ),
    ],
    cards: [
      card(
        "Two independent cues have standard deviations of 6 and 8. What is the standard deviation of their reliability-weighted combination?",
        4.8,
        "1/36 + 1/64 = 100/2304, so the combined SD is 48/10 = 4.8.",
      ),
      card(
        "Cue A reads 20 with SD 3 and cue B reads 30 with SD 3. What is the reliability-weighted combined estimate?",
        25,
        "Equal reliabilities give equal weights: (20 + 30)/2 = 25.",
      ),
    ],
  },
];
