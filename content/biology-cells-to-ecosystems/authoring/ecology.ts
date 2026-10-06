import {
  beat,
  q,
  c,
  n,
  card,
  term,
  web,
  pyramid,
  series,
  type TeachingLesson,
} from "./definition.js";
export const ecology: TeachingLesson[] = [
  {
    id: "reading-food-webs",
    title: "Follow the food",
    summary: "Read feeding arrows and separate energy flow from recycled matter.",
    moduleId: "bio-ecology",
    sourceIds: ["bio-ecosystems", "bio-trophic"],
    beats: [
      beat(
        "Read the arrow",
        "A feeding arrow points from food to the organism consuming it. Grass → grasshopper means the grasshopper obtains matter and energy from grass.",
        ["Meadow", web("meadow")],
        ["Pond", web("pond")],
      ),
      beat(
        "Find the producers",
        "Primary producers build organic matter using an external energy source. Grass and algae in these webs capture light through photosynthesis.",
        ["Grass producer", web("meadow")],
        ["Algal producer", web("pond")],
      ),
      beat(
        "More than one route",
        "A food web can contain several routes to the same consumer. In the meadow, energy can reach a hawk through mice or through grasshoppers and frogs.",
        ["Meadow routes", web("meadow")],
        ["Pond routes", web("pond")],
      ),
      beat(
        "Recycle matter",
        "Decomposers return matter from dead material to environmental pools. Energy disperses as heat through ecosystem processes and needs continuing input; it is not recycled like atoms.",
        ["Meadow links", web("meadow")],
        ["Pond links", web("pond")],
      ),
    ],
    questions: [
      c(
        "What does the arrow Grass → Grasshopper mean?",
        [
          "Grass eats grasshoppers",
          "Grasshoppers obtain food from grass",
          "Grass turns directly into a hawk",
        ],
        1,
        "Arrows run from food to consumer.",
        "Follow the direction of matter and energy transfer.",
      ),
      q(
        "Name the primary producer shown at the base of the pond web.",
        ["algae", "alga"],
        "Algae build organic matter using light; the depicted animals consume other organisms.",
        "Inspect the organism supplying food to zooplankton.",
      ),
      n(
        "How many direct food sources are shown for the meadow hawk?",
        2,
        "Two arrows enter the hawk: one from mouse and one from frog.",
        [
          "Count arrows ending at the hawk.",
          "Do not count indirect food sources.",
          "The direct sources are mouse and frog.",
        ],
      ),
      q(
        "Energy flows through ecosystems and becomes less available for further biological work. In what form does much of it disperse?",
        ["heat", "thermal energy"],
        "Energy disperses as heat; atoms can be recycled through environmental pools.",
        "Think about metabolic energy that is not passed into new biomass.",
      ),
      c(
        "The number of mice decreases. Can this small diagram give an exact future hawk count?",
        [
          "Yes, arrows specify exact population changes",
          "No, other food sources and conditions also matter",
          "Yes, every hawk must disappear",
        ],
        1,
        "A feeding web shows relationships, not a complete quantitative population model.",
        "Check what information the arrows actually encode.",
      ),
      n(
        "Count the direct feeding links shown in the pond web.",
        4,
        "The links are algae→zooplankton, zooplankton→fish, fish→heron and zooplankton→heron.",
        [
          "Count each arrow once.",
          "One organism can have more than one consumer.",
          "There are four distinct arrows.",
        ],
      ),
    ],
    cards: [
      term(
        "What ecological role is played by an organism that builds organic matter from inorganic carbon using an external energy source?",
        ["primary producer", "producer", "autotroph"],
        "Primary producers supply organic matter to food webs.",
      ),
      term(
        "What is the ecological role of organisms that break down dead organic matter and return nutrients to environmental pools?",
        ["decomposer", "decomposers"],
        "Decomposers contribute to nutrient recycling.",
      ),
    ],
  },
  {
    id: "energy-between-levels",
    title: "Why does less energy reach the top?",
    summary: "Calculate trophic transfers using an explicit efficiency assumption.",
    moduleId: "bio-ecology",
    sourceIds: ["bio-trophic"],
    beats: [
      beat(
        "A fraction is transferred",
        "Only some production at one trophic level becomes production at the next. Organisms use energy in metabolism, and not all material is eaten or assimilated.",
        ["10% transfer", pyramid(1000, 10)],
        ["20% transfer", pyramid(1000, 20)],
      ),
      beat(
        "Apply it twice",
        "A transfer percentage applies at each step. Two 10% transfers leave 1% of the initial energy at the third level.",
        ["Three levels", pyramid(2000, 10)],
        ["Four levels", pyramid(2000, 10, 4)],
      ),
      beat(
        "Compare efficiencies",
        "Transfer efficiency varies between systems. A stated 20% is a problem assumption, not a universal law. On the same initial energy, it transfers more than 10%.",
        ["20% transfer", pyramid(5000, 20)],
        ["10% transfer", pyramid(5000, 10)],
      ),
      beat(
        "Work backward",
        "To support a target amount at a consumer level, divide by the assumed transfer fraction to find the required energy at the level below.",
        ["Base 3000 kJ", pyramid(3000, 10)],
        ["Base 6000 kJ", pyramid(6000, 10)],
      ),
    ],
    questions: [
      n(
        "Producers contain 1000 kJ of energy available in the stated accounting. At an assumed 10% transfer, how many kJ reach the next level?",
        100,
        "1000 × 0.10 = 100 kJ.",
        [
          "Convert 10% to a fraction.",
          "Apply the fraction to producer energy.",
          "Multiply 1000 by 0.10.",
        ],
      ),
      n(
        "Starting with 2000 kJ, how many kJ reach level 3 after two assumed 10% transfers?",
        20,
        "2000 × 0.1 × 0.1 = 20 kJ.",
        [
          "Level 3 is two steps above producers.",
          "Apply 10% at each step.",
          "Take one tenth of the energy remaining after the first step.",
        ],
      ),
      n(
        "With 5000 kJ at producers and 20% transfer per step, how many kJ reach level 2?",
        1000,
        "5000 × 0.20 = 1000 kJ.",
        ["Use the stated efficiency.", "20% is one fifth.", "Take one fifth of 5000."],
      ),
      n(
        "A next level needs 300 kJ at an assumed 10% transfer. How many kJ are required in the level below?",
        3000,
        "300/0.10 = 3000 kJ.",
        [
          "Work backward through the transfer.",
          "The required output is one tenth of the input.",
          "Divide 300 by 0.10.",
        ],
      ),
      c(
        "Does every real food web transfer exactly 10% between levels?",
        [
          "Yes, without exception",
          "No, efficiency varies and must be specified or measured",
          "No, energy is always fully transferred",
        ],
        1,
        "The ten-percent value is a useful stated approximation, not an exact universal constant.",
        "Separate a modelling assumption from a measured law.",
      ),
      n(
        "A fourth level is three steps above producers. From 8000 kJ with assumed 10% transfer each step, how many kJ reach level 4?",
        8,
        "8000 → 800 → 80 → 8 kJ.",
        [
          "Count three transfers.",
          "Multiply by 0.10 three times.",
          "Track the sequence 8000, 800, 80, then the final value.",
        ],
      ),
    ],
    cards: [
      card(
        "Producers have 4000 kJ. Under a stated 20% transfer at each step, how many kJ reach level 3?",
        160,
        "4000 × 0.2 × 0.2 = 160 kJ.",
      ),
      card(
        "A consumer level gains 75 kJ at an assumed 15% efficiency. How many kJ were available one level below?",
        500,
        "75/0.15 = 500 kJ.",
      ),
    ],
  },
  {
    id: "population-limits",
    title: "Why can't a population grow forever?",
    summary:
      "Compare proportional growth with resource-limited growth and changing carrying capacity.",
    moduleId: "bio-ecology",
    sourceIds: ["bio-growth"],
    beats: [
      beat(
        "Growth can multiply",
        "Under ideal conditions, a constant proportional growth rate makes increases larger as population size grows. Repeated doubling is one example.",
        [
          "Ideal doubling",
          series("Round", "Population", [
            [0, 10],
            [1, 20],
            [2, 40],
            [3, 80],
          ]),
        ],
        [
          "Limited growth",
          series("Round", "Population", [
            [0, 10],
            [1, 20],
            [2, 32],
            [3, 40],
          ]),
        ],
      ),
      beat(
        "Resources set limits",
        "As resources become scarce, competition can reduce births or increase deaths. In a simple logistic model, net growth approaches zero near carrying capacity.",
        [
          "Capacity near 100",
          series("Time", "Population", [
            [0, 20],
            [1, 40],
            [2, 70],
            [3, 90],
            [4, 100],
          ]),
        ],
        [
          "Capacity near 60",
          series("Time", "Population", [
            [0, 20],
            [1, 35],
            [2, 50],
            [3, 58],
            [4, 60],
          ]),
        ],
      ),
      beat(
        "Balance the rates",
        "A stable population size can hide ongoing births and deaths. Zero net growth means gains and losses balance, not that every organism stops reproducing.",
        [
          "Stable near 80",
          series("Time", "Population", [
            [0, 80],
            [1, 80],
            [2, 80],
            [3, 80],
          ]),
        ],
        [
          "Increasing",
          series("Time", "Population", [
            [0, 80],
            [1, 85],
            [2, 90],
            [3, 95],
          ]),
        ],
      ),
      beat(
        "Capacity can change",
        "Carrying capacity depends on conditions. A drought or habitat loss can reduce the population that the environment supports; it is not a permanent species constant.",
        [
          "Before habitat change",
          series("Time", "Population", [
            [0, 70],
            [1, 85],
            [2, 95],
            [3, 100],
          ]),
        ],
        [
          "Reduced resources",
          series("Time", "Population", [
            [0, 70],
            [1, 65],
            [2, 61],
            [3, 60],
          ]),
        ],
      ),
    ],
    questions: [
      n(
        "In the ideal doubling case, the population starts at 10. What is it after three rounds?",
        80,
        "10 × 2 × 2 × 2 = 80.",
        ["Double once per round.", "After two rounds there are 40.", "Double once more."],
      ),
      q(
        "Name the population limit approached in a simple logistic model under fixed environmental conditions.",
        ["carrying capacity"],
        "Carrying capacity reflects the population supported by those conditions.",
        "Resource competition reduces net growth near this level.",
      ),
      n(
        "A closed population has 12 births and 12 deaths in one interval. What is its net change?",
        0,
        "12 − 12 = 0, although individuals were born and died.",
        [
          "Gains add and losses subtract.",
          "There is no migration in this closed population.",
          "Subtract deaths from births.",
        ],
      ),
      c(
        "After a drought reduces food supply, what may happen to carrying capacity?",
        [
          "It can decrease",
          "It must remain fixed forever",
          "It becomes the same for every species",
        ],
        0,
        "Carrying capacity depends on environmental resources and conditions.",
        "The environment has changed.",
      ),
      n(
        "A closed population starts at 70, with 16 births and 9 deaths. What is its final size?",
        77,
        "70 + 16 − 9 = 77.",
        ["Start with the original population.", "Add births.", "Subtract deaths."],
      ),
      c(
        "Does a smooth logistic curve predict every fluctuation in a wild population?",
        [
          "Yes, exactly",
          "No, weather, interactions and chance can cause departures",
          "Only for populations above one million",
        ],
        1,
        "The curve is a simplified model; real populations can fluctuate or overshoot.",
        "Identify processes omitted from the model.",
      ),
    ],
    cards: [
      card(
        "A closed population of 45 has 13 births and 8 deaths. What is its new size?",
        50,
        "45 + 13 − 8 = 50.",
      ),
      term(
        "What term names the population size an environment can support under specified conditions in a simple growth model?",
        ["carrying capacity"],
        "Carrying capacity depends on the species and current conditions.",
      ),
    ],
  },
  {
    id: "ecological-evidence",
    title: "What would count as evidence?",
    summary:
      "Design fair ecological comparisons and avoid turning correlation into an unsupported cause.",
    moduleId: "bio-ecology",
    sourceIds: ["bio-evidence", "bio-ecosystems"],
    beats: [
      beat(
        "Ask a testable question",
        "A claim about fertiliser and plant growth can be tested by measuring growth in comparable treated and untreated plants. Define the outcome before measuring it.",
        [
          "Fertiliser",
          series("Week", "Mean height (cm)", [
            [0, 5],
            [1, 8],
            [2, 11],
            [3, 14],
          ]),
        ],
        [
          "No fertiliser",
          series("Week", "Mean height (cm)", [
            [0, 5],
            [1, 7],
            [2, 9],
            [3, 11],
          ]),
        ],
      ),
      beat(
        "Subtract a baseline",
        "If groups start at different heights, final height alone can mislead. Compare change from baseline and consider whether groups were comparable before treatment.",
        [
          "Group A",
          series("Week", "Mean height (cm)", [
            [0, 10],
            [1, 12],
            [2, 14],
            [3, 16],
          ]),
        ],
        [
          "Group B",
          series("Week", "Mean height (cm)", [
            [0, 4],
            [1, 7],
            [2, 10],
            [3, 13],
          ]),
        ],
      ),
      beat(
        "Replicate and assign",
        "Random assignment reduces systematic differences between treatment groups. Independent replicates help estimate variability; repeatedly measuring one pot is not the same as using many pots.",
        [
          "Replicate means A",
          series("Week", "Mean height (cm)", [
            [0, 5],
            [1, 8],
            [2, 11],
            [3, 14],
          ]),
        ],
        [
          "Replicate means B",
          series("Week", "Mean height (cm)", [
            [0, 5],
            [1, 7],
            [2, 9],
            [3, 11],
          ]),
        ],
      ),
      beat(
        "Leave room for causes",
        "An observational association can suggest a hypothesis, but does not by itself isolate a cause. Other environmental factors may explain the pattern.",
        [
          "Wetter sites",
          series("Rainfall (relative units)", "Plant height (cm)", [
            [10, 4],
            [20, 8],
            [30, 12],
            [40, 16],
          ]),
        ],
        [
          "Different soil",
          series("Rainfall (relative units)", "Plant height (cm)", [
            [10, 3],
            [20, 5],
            [30, 7],
            [40, 9],
          ]),
        ],
      ),
    ],
    questions: [
      c(
        "Which measurement makes a claim about fertiliser and growth testable?",
        [
          "Change in height over a specified time",
          "Whether the plants seem happier",
          "Whether the gardener likes them",
        ],
        0,
        "A defined measurable outcome allows a reproducible comparison.",
        "Choose an observable quantity and time interval.",
      ),
      n(
        "Group A grows from 10 to 16 cm. How much does its mean height increase, in cm?",
        6,
        "16 − 10 = 6 cm.",
        [
          "Use the same group's baseline.",
          "Subtract initial from final height.",
          "Calculate 16 minus 10.",
        ],
      ),
      q(
        "Comparable pots are allocated to fertiliser or control by chance. Name this allocation method.",
        ["random assignment", "randomisation", "randomization"],
        "Random assignment reduces systematic group differences; independent pots provide replication.",
        "Name how treatments are allocated, not how often height is measured.",
      ),
      c(
        "Taller plants occur at wetter sites. What follows from that observation alone?",
        [
          "Rainfall is proven to be the only cause",
          "Rainfall and height are associated; other causes need checking",
          "Height causes all rainfall",
        ],
        1,
        "The association could reflect rainfall, soil or other related factors.",
        "A correlation does not isolate a cause.",
      ),
      n(
        "A treated group increases by 9 cm and its matched control by 6 cm. What is the difference in growth, in cm?",
        3,
        "9 − 6 = 3 cm greater growth in the treated group.",
        [
          "Compare changes over the same interval.",
          "Use growth, not final height.",
          "Subtract control growth from treatment growth.",
        ],
      ),
      c(
        "Why report variability across independent pots as well as the mean?",
        [
          "It shows how consistent the results are",
          "It makes a control unnecessary",
          "It proves every plant behaves identically",
        ],
        0,
        "Variability reveals whether the mean hides wide differences between replicates.",
        "An average alone does not show the spread.",
      ),
    ],
    cards: [
      card(
        "A treatment group grows from 8 to 19 cm; a control from 8 to 15 cm. What is the difference in growth, in cm?",
        4,
        "Treatment grows 11 cm and control 7 cm; 11 − 7 = 4 cm.",
      ),
      term(
        "What process assigns experimental units to treatments using chance to reduce systematic group differences?",
        ["random assignment", "randomisation", "randomization"],
        "Random assignment reduces systematic allocation bias; replication separately estimates variability.",
      ),
    ],
  },
];
