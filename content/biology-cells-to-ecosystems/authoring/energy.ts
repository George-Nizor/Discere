import {
  beat,
  q,
  c,
  n,
  card,
  term,
  energy,
  series,
  dna,
  division,
  type TeachingLesson,
} from "./definition.js";
export const energyLessons: TeachingLesson[] = [
  {
    id: "light-to-sugar",
    title: "Where does a leaf get its carbon?",
    summary: "Trace carbon and energy through the overall photosynthesis reaction.",
    moduleId: "bio-energy",
    sourceIds: ["bio-photosynthesis"],
    beats: [
      beat(
        "Build from air",
        "In photosynthesis, carbon dioxide supplies the carbon used to build sugars. Light provides energy; it does not supply carbon atoms.",
        ["Photosynthesis", energy("photosynthesis")],
        ["Respiration", energy("respiration")],
      ),
      beat(
        "Count carbon",
        "The simplified overall accounting is 6 CO₂ + 6 H₂O + light → C₆H₁₂O₆ + 6 O₂. Six carbon dioxide molecules supply six carbon atoms for one glucose.",
        ["One glucose", energy("photosynthesis")],
        ["Two glucose", energy("photosynthesis", 2)],
      ),
      beat(
        "Follow the energy",
        "Photosynthesis converts light energy into chemical energy. Plants still need respiration to transfer energy from sugars into forms cells can use.",
        ["Capture light", energy("photosynthesis")],
        ["Use fuel", energy("respiration")],
      ),
      beat(
        "Find a limit",
        "More light can raise photosynthetic rate over one range. A plateau suggests that extra light alone is no longer increasing rate under those conditions.",
        [
          "Lower CO₂",
          series("Light (relative units)", "Rate (relative units)", [
            [0, 0],
            [20, 4],
            [40, 7],
            [60, 8],
            [80, 8],
          ]),
        ],
        [
          "Higher CO₂",
          series("Light (relative units)", "Rate (relative units)", [
            [0, 0],
            [20, 4],
            [40, 8],
            [60, 11],
            [80, 12],
          ]),
        ],
      ),
    ],
    questions: [
      q(
        "Name the gas that supplies carbon atoms for newly made sugars during photosynthesis.",
        ["carbon dioxide", "CO2", "CO₂"],
        "Carbon dioxide supplies the carbon atoms; light supplies energy.",
        "Trace atoms separately from energy.",
      ),
      n(
        "One glucose has six carbon atoms. Each CO₂ supplies one. How many CO₂ molecules supply the carbon for two glucose molecules?",
        12,
        "Two glucose contain 12 carbon atoms, requiring 12 CO₂.",
        [
          "Count carbon in both glucose molecules.",
          "Each glucose has six carbon atoms.",
          "Each CO₂ contributes one carbon atom.",
        ],
      ),
      c(
        "What happens to energy in photosynthesis?",
        [
          "Light energy becomes chemical energy",
          "Light energy becomes carbon atoms",
          "All light energy is destroyed",
        ],
        0,
        "Photosynthetic reactions capture some incoming light energy in chemical form.",
        "Keep matter and energy separate.",
      ),
      n(
        "On the lower-CO₂ curve, rate is 8 at both light levels 60 and 80. What is the measured rate increase?",
        0,
        "8 − 8 = 0; this interval is a plateau.",
        [
          "Use the lower-CO₂ curve.",
          "Read the two rates at 60 and 80.",
          "Subtract the first rate from the second.",
        ],
      ),
      c(
        "A leaf cell has chloroplasts. What else may it do?",
        ["Carry out cellular respiration", "Avoid using ATP", "Create carbon atoms from light"],
        0,
        "Leaf cells also respire to support their energy needs.",
        "Photosynthesis does not replace every other cell process.",
      ),
      n(
        "Using the simplified overall equation, how many O₂ molecules accompany the formation of three glucose molecules?",
        18,
        "Each glucose corresponds to six O₂: 3 × 6 = 18.",
        [
          "Read the coefficient beside O₂.",
          "Use six oxygen molecules per glucose.",
          "Multiply by three glucose molecules.",
        ],
      ),
    ],
    cards: [
      term(
        "Which gas supplies carbon atoms that photosynthetic organisms incorporate into sugar?",
        ["carbon dioxide", "CO2", "CO₂"],
        "Carbon dioxide is a matter input; light is the energy input.",
      ),
      card(
        "A simplified photosynthesis model forms five glucose molecules. How many carbon atoms are incorporated?",
        30,
        "5 × 6 = 30 carbon atoms.",
      ),
    ],
  },
  {
    id: "fuel-to-cell-work",
    title: "How does a cell use its fuel?",
    summary:
      "Connect respiration, ATP and conserved atoms without confusing breathing with cellular reactions.",
    moduleId: "bio-energy",
    sourceIds: ["bio-respiration", "bio-photosynthesis"],
    beats: [
      beat(
        "Transfer usable energy",
        "During aerobic respiration, cells transfer some energy from fuel into ATP, while other energy disperses as heat. ATP can then drive cellular work.",
        ["Aerobic respiration", energy("respiration")],
        ["Photosynthesis", energy("photosynthesis")],
      ),
      beat(
        "Conserve carbon",
        "For complete aerobic oxidation, one glucose gives six CO₂. Carbon atoms are rearranged into products rather than converted into energy.",
        ["One glucose", energy("respiration")],
        ["Three glucose", energy("respiration", 3)],
      ),
      beat(
        "Plants use fuel too",
        "Plants respire in light and darkness. Photosynthesis needs light, but living plant cells still need ATP when light is absent.",
        ["Respiration", energy("respiration")],
        ["Light capture", energy("photosynthesis")],
      ),
      beat(
        "Read a respiration signal",
        "In a sealed measurement system with aerobic organisms, falling oxygen can indicate respiration. A matched blank helps separate organism activity from changes in the apparatus.",
        [
          "Organisms",
          series("Time (min)", "Oxygen (units)", [
            [0, 20],
            [1, 17],
            [2, 14],
            [3, 11],
          ]),
        ],
        [
          "Blank",
          series("Time (min)", "Oxygen (units)", [
            [0, 20],
            [1, 20],
            [2, 20],
            [3, 20],
          ]),
        ],
      ),
    ],
    questions: [
      q(
        "Name the molecule that commonly transfers energy from respiration to cellular work.",
        ["ATP", "adenosine triphosphate"],
        "ATP couples energy-releasing processes to energy-requiring work.",
        "The molecule has three phosphate groups.",
      ),
      n(
        "Complete aerobic oxidation of two glucose molecules produces how many CO₂ molecules?",
        12,
        "Each glucose contributes six carbon atoms: 2 × 6 = 12 CO₂.",
        [
          "Each CO₂ contains one carbon.",
          "Each glucose contains six carbons.",
          "Count the carbon from two glucose molecules.",
        ],
      ),
      q(
        "A living plant has stored fuel and oxygen but no light. Name the energy-transfer process that can continue.",
        ["respiration", "cellular respiration", "aerobic respiration"],
        "Respiration can use stored fuel in darkness even when photosynthesis stops.",
        "Which process uses fuel rather than requiring incoming light?",
      ),
      n(
        "In the organisms case, oxygen falls from 20 to 11 units in three minutes. How many units were consumed?",
        9,
        "20 − 11 = 9 oxygen units.",
        [
          "Compare the initial and final oxygen amounts.",
          "The final amount is lower.",
          "Subtract 11 from 20.",
        ],
      ),
      c(
        "What happens to glucose's carbon during complete aerobic oxidation?",
        ["It vanishes as energy", "It appears in carbon dioxide", "It becomes only oxygen gas"],
        1,
        "Glucose carbon is conserved in CO₂; energy transfer does not destroy those atoms.",
        "Follow carbon-containing substances.",
      ),
      c(
        "Which claim correctly distinguishes breathing and respiration?",
        [
          "They are exactly the same reaction",
          "Breathing moves air; cellular respiration transfers energy through chemical reactions",
          "Only animals respire",
        ],
        1,
        "Breathing can supply oxygen, but respiration is a set of chemical processes in cells.",
        "Compare movement of air with cellular chemistry.",
      ),
    ],
    cards: [
      term(
        "Name the small molecule commonly used to couple energy release to cellular work.",
        ["ATP", "adenosine triphosphate"],
        "ATP transfers energy to many energy-requiring processes.",
      ),
      card(
        "Complete aerobic oxidation of four glucose molecules releases how many carbon atoms in CO₂?",
        24,
        "4 × 6 = 24 carbon atoms, one in each CO₂.",
      ),
    ],
  },
  {
    id: "copying-dna",
    title: "Copy a message one base at a time",
    summary: "Use complementary DNA bases and distinguish DNA amount from chromosome count.",
    moduleId: "bio-energy",
    sourceIds: ["bio-dna", "bio-cycle"],
    beats: [
      beat(
        "Match a base",
        "Complementary pairing makes each DNA strand a template. A pairs with T, and C pairs with G. The strands run in opposite chemical directions.",
        ["ATCG", dna("ATCG")],
        ["TAGC", dna("TAGC")],
      ),
      beat(
        "Align the strands",
        "When the top strand is read left to right as 5′-AAGC-3′, its aligned partner below reads 3′-TTCG-5′. These are opposite directions, not two parallel 5′-to-3′ readings.",
        ["AAGC", dna("AAGC")],
        ["CCAT", dna("CCAT")],
      ),
      beat(
        "Keep an old strand",
        "DNA replication is semiconservative: each resulting double-stranded DNA molecule contains one old strand and one newly made strand.",
        ["Six template bases", dna("ATGCGA")],
        ["Eight template bases", dna("ATGCCGTA")],
      ),
      beat(
        "Copies stay joined",
        "After DNA replication, each chromosome consists of two sister chromatids joined together. DNA amount has doubled, but chromosome number has not yet doubled.",
        ["Before copying", division("mitosis", 2, 0)],
        ["After copying", division("mitosis", 2, 1)],
      ),
    ],
    questions: [
      q(
        "A new DNA base is placed opposite adenine (A). Give the name of its complementary base.",
        ["thymine"],
        "Adenine pairs with thymine in standard DNA base pairing.",
        "Inspect which base completes the pair.",
      ),
      q(
        "Write the four complementary letters directly beneath 5′-AAGC-3′, reading left to right along the partner strand in its 3′-to-5′ direction.",
        ["TTCG"],
        "The aligned partner is 3′-TTCG-5′; the two strands run in opposite directions.",
        "Pair one position at a time without reversing the displayed order.",
      ),
      n(
        "A double-stranded DNA molecule replicates once. How many double-stranded DNA molecules result?",
        2,
        "One molecule is copied into two molecules, each with one old and one new strand.",
        [
          "Separate strands serve as templates.",
          "Each old strand receives a new partner.",
          "Count the resulting paired molecules.",
        ],
      ),
      n(
        "A cell has 4 chromosomes before copying. Immediately after copying, while sister chromatids remain joined, how many chromosomes does it have?",
        4,
        "It still has four chromosomes; each now has two sister chromatids.",
        [
          "DNA amount and chromosome number are different counts.",
          "Joined sister chromatids belong to one replicated chromosome.",
          "Keep the chromosome count unchanged at this stage.",
        ],
      ),
      c(
        "What does semiconservative replication conserve in each resulting DNA molecule?",
        ["One original strand", "Both original strands together", "No original material"],
        0,
        "Each resulting molecule pairs an original template strand with a newly synthesised strand.",
        "Trace the two original strands separately.",
      ),
      n(
        "Six chromosomes each have two sister chromatids after copying. How many DNA molecules are present?",
        12,
        "Each chromatid contains one DNA molecule: 6 × 2 = 12.",
        [
          "Count both chromatids of each chromosome.",
          "There are six replicated chromosomes.",
          "Multiply six by two.",
        ],
      ),
    ],
    cards: [
      term(
        "Which DNA base pairs with guanine? Give its name.",
        ["cytosine"],
        "Guanine pairs with cytosine (C).",
      ),
      card(
        "A cell starts with 10 chromosomes. After replication, each has two chromatids. How many DNA molecules does it contain?",
        20,
        "10 × 2 = 20 DNA molecules.",
      ),
    ],
  },
  {
    id: "mitosis-and-growth",
    title: "Make two cells",
    summary:
      "Track chromosomes through mitotic division and connect division to growth and repair.",
    moduleId: "bio-energy",
    sourceIds: ["bio-cycle"],
    beats: [
      beat(
        "A reason to divide",
        "Cells divide for growth, repair and reproduction. Division is regulated; it is not simply a response to being about to die.",
        ["Two pairs", division("mitosis", 2)],
        ["Three pairs", division("mitosis", 3)],
      ),
      beat(
        "Prepare a copy",
        "Before mitosis, DNA is replicated. Each chromosome then has two sister chromatids, ready to be separated into the daughter nuclei.",
        ["Before copying", division("mitosis", 3, 0)],
        ["DNA copied", division("mitosis", 3, 1)],
      ),
      beat(
        "Share the copies",
        "During mitosis, sister chromatids separate. After division and cytokinesis, the two daughter cells normally retain the starting chromosome number.",
        ["Two pairs, divided", division("mitosis", 2, 2)],
        ["Three pairs, divided", division("mitosis", 3, 2)],
      ),
      beat(
        "Repeat with care",
        "In an ideal sequence where every cell divides once per round, cell number doubles each round. Real tissues regulate which cells divide and when.",
        ["Before a round", division("mitosis", 1, 0)],
        ["After a round", division("mitosis", 1, 3)],
      ),
    ],
    questions: [
      q(
        "Name the nuclear division process used in ordinary tissue growth and repair.",
        ["mitosis"],
        "Mitosis distributes copied chromosomes to daughter nuclei during regulated growth and repair.",
        "It preserves the starting chromosome number.",
      ),
      n(
        "A cell has 6 chromosomes before replication. How many DNA molecules does it have after replication but before mitosis?",
        12,
        "Six replicated chromosomes have two chromatids each: 12 DNA molecules.",
        [
          "Replication copies the DNA.",
          "Each of six chromosomes has two chromatids.",
          "Count the two DNA molecules per replicated chromosome.",
        ],
      ),
      n(
        "A cell starts with 4 chromosomes and completes normal mitosis and cytokinesis. How many chromosomes are in each daughter cell?",
        4,
        "Each daughter retains the original four chromosomes.",
        [
          "Track copies delivered to one daughter.",
          "Sister chromatids are separated equally.",
          "Mitosis preserves this starting chromosome number.",
        ],
      ),
      n(
        "One cell completes three ideal rounds of division, with every descendant dividing each round. How many cells result?",
        8,
        "The sequence is 1 → 2 → 4 → 8.",
        [
          "Double once for each round.",
          "After two rounds there are four cells.",
          "Double the count a third time.",
        ],
      ),
      q(
        "Name the two joined copies of a replicated chromosome that separate during mitosis.",
        ["sister chromatids"],
        "Sister chromatids separate and become daughter chromosomes.",
        "Track the two copies made by DNA replication.",
      ),
      c(
        "Does a normal body cell divide only because it is about to die?",
        [
          "Yes, that is the defining trigger",
          "No, division is regulated for growth, repair and other needs",
          "Yes, and DNA need not be copied",
        ],
        1,
        "Cell-cycle regulation responds to conditions and signals; imminent death is not the general cause.",
        "Separate regulated division from cell death.",
      ),
    ],
    cards: [
      card(
        "A starting cell with 8 chromosomes completes normal mitosis and cytokinesis. How many chromosomes does each daughter receive?",
        8,
        "Mitosis preserves eight chromosomes per daughter in this example.",
      ),
      card(
        "Three cells each divide in two ideal rounds. How many cells are present afterward?",
        12,
        "3 × 2 × 2 = 12 cells.",
      ),
    ],
  },
];
