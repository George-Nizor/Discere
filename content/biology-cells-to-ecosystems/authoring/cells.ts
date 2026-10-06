import {
  beat,
  q,
  c,
  n,
  card,
  term,
  cell,
  membrane,
  series,
  type TeachingLesson,
} from "./definition.js";
export const cells: TeachingLesson[] = [
  {
    id: "inside-a-cell",
    title: "A world inside a cell",
    summary: "Connect cell structures to their jobs and distinguish bacteria from eukaryotes.",
    moduleId: "bio-cells",
    sourceIds: ["bio-prokaryotes", "bio-eukaryotes"],
    beats: [
      beat(
        "Find the boundary",
        "A plasma membrane separates a cell from its surroundings and controls exchange. Both a typical animal cell and a bacterium have one.",
        ["Animal", cell("animal")],
        ["Bacterium", cell("bacterium")],
      ),
      beat(
        "Where is the DNA?",
        "In a eukaryotic cell, most DNA sits inside a membrane-bound nucleus. A bacterium has DNA in a nucleoid region, without that surrounding nuclear membrane. Its ribosomes make proteins.",
        ["Bacterium", cell("bacterium")],
        ["Leaf cell", cell("plant")],
      ),
      beat(
        "Two energy jobs",
        "Chloroplasts capture light energy in photosynthetic leaf cells. Mitochondria help transfer energy from fuel into ATP. Leaf cells have both.",
        ["Leaf cell", cell("plant")],
        ["Animal", cell("animal")],
      ),
      beat(
        "Support outside",
        "A plant cell wall lies outside the plasma membrane and helps resist expansion. It does not replace the membrane's role in controlling exchange.",
        ["Leaf cell", cell("plant")],
        ["Animal", cell("animal")],
      ),
    ],
    questions: [
      q(
        "Name the boundary that controls exchange in both illustrated animal and bacterial cells.",
        ["plasma membrane", "cell membrane"],
        "Both cells exchange substances across a plasma membrane.",
        "Inspect the boundary around each cell.",
      ),
      c(
        "The bacterium has no membrane-bound nucleus. Where is its DNA?",
        ["It has no DNA", "In a nucleoid region", "Inside a chloroplast"],
        1,
        "A bacterial nucleoid contains DNA without a surrounding nuclear membrane.",
        "Absence of a nucleus is not absence of genetic material.",
      ),
      c(
        "Which pair can occur together in the illustrated photosynthetic leaf cell?",
        [
          "Chloroplasts and mitochondria",
          "Chloroplasts but never mitochondria",
          "Mitochondria but never chloroplasts",
        ],
        0,
        "Photosynthetic leaf cells capture light and also carry out respiration.",
        "The two organelles perform different jobs.",
      ),
      q(
        "Name the supporting structure outside the plant cell membrane.",
        ["cell wall"],
        "The cell wall provides external support; the membrane remains inside it.",
        "Inspect the outermost layer of the leaf cell.",
      ),
      c(
        "A root cell is alive but has no chloroplasts. Which conclusion follows?",
        [
          "It cannot be a plant cell",
          "Not every plant cell photosynthesises",
          "It cannot release energy from fuel",
        ],
        1,
        "Many plant cells, including many root cells, lack chloroplasts and use sugars supplied by other tissues.",
        "Consider the cell's location and job.",
      ),
      c(
        "Which observation most directly identifies a cell as eukaryotic?",
        ["A plasma membrane", "DNA somewhere inside", "DNA enclosed in a membrane-bound nucleus"],
        2,
        "A membrane-bound nucleus distinguishes eukaryotic organisation from bacterial organisation.",
        "Choose the distinctive structure, not a shared feature.",
      ),
    ],
    cards: [
      term(
        "What is the name of the membrane-bound compartment containing most DNA in a typical animal cell?",
        ["nucleus"],
        "The nucleus encloses most of the cell's DNA.",
      ),
      term(
        "Which organelle captures light energy in a green leaf cell?",
        ["chloroplast", "chloroplasts"],
        "Chloroplasts carry out photosynthesis; mitochondria serve a different energy role.",
      ),
    ],
  },
  {
    id: "diffusion-and-membranes",
    title: "Which way will molecules move?",
    summary: "Predict net diffusion from concentration and membrane permeability.",
    moduleId: "bio-cells",
    sourceIds: ["bio-transport"],
    beats: [
      beat(
        "Follow the difference",
        "Molecules move in both directions. If a membrane permits a solute to cross, unequal concentrations cause a net movement toward the less concentrated side.",
        ["12 left, 4 right", membrane(12, 4, "solute")],
        ["4 left, 12 right", membrane(4, 12, "solute")],
      ),
      beat(
        "Share the amount",
        "With equal fixed volumes and a freely crossing solute, equilibrium has equal concentrations. The total amount of solute stays constant.",
        ["10 left, 6 right", membrane(10, 6, "solute")],
        ["12 left, 8 right", membrane(12, 8, "solute")],
      ),
      beat(
        "Check the gate",
        "A concentration difference cannot move a substance through a barrier that blocks it. Permeability is part of the prediction.",
        ["Solute passes", membrane(12, 4, "solute")],
        ["Neither passes", membrane(12, 4, "neither")],
      ),
      beat(
        "Motion continues",
        "Equal concentrations mean no net diffusion. Individual molecules still cross both ways at equal average rates.",
        ["8 left, 8 right", membrane(8, 8, "solute")],
        ["12 left, 4 right", membrane(12, 4, "solute")],
      ),
    ],
    questions: [
      c(
        "Equal volumes contain 12 solute units on the left and 4 on the right. Solute can cross. What is the initial net direction?",
        ["Left to right", "Right to left", "No net movement"],
        0,
        "The concentration is initially higher on the left, so net solute movement is to the right.",
        "Compare amounts only because the volumes are equal.",
      ),
      n(
        "Two fixed equal volumes contain 10 and 6 units of freely crossing solute. How many units are on each side at equilibrium?",
        8,
        "The 16 units divide equally: 16/2 = 8.",
        [
          "Keep the total solute constant.",
          "Add 10 and 6.",
          "Divide the total between two equal volumes.",
        ],
      ),
      c(
        "The barrier blocks both solute and water. What happens to the initial 12:4 solute amounts?",
        ["They become 8:8", "They stay 12:4", "They become 4:12"],
        1,
        "Neither substance can cross this barrier, so the amounts stay as given.",
        "Check permeability before following a gradient.",
      ),
      n(
        "At equal concentration, 8 units are on each side. How many solute units are in the whole two-compartment system?",
        16,
        "8 + 8 = 16 units; diffusion does not destroy solute.",
        [
          "Count both compartments.",
          "There are eight units in each.",
          "Add the two equal amounts.",
        ],
      ),
      c(
        "At diffusion equilibrium, which statement is accurate?",
        [
          "Every molecule stops",
          "Molecules cross both ways with no net flow",
          "All molecules move in one direction",
        ],
        1,
        "Equilibrium is dynamic: opposite flows balance on average.",
        "Distinguish no net change from no motion.",
      ),
      n(
        "A separate equal-volume system starts with 14 solute units on one side and 2 on the other. How many units must move net from the concentrated side to reach equilibrium?",
        6,
        "Each side finishes with 8. The concentrated side loses 14 − 8 = 6.",
        [
          "Find the equilibrium amount first.",
          "The total is 16 across two equal volumes.",
          "Subtract the equilibrium amount from 14.",
        ],
      ),
    ],
    cards: [
      card(
        "Two equal fixed volumes start with 18 and 6 units of a permeable solute. How many units end up on each side?",
        12,
        "24 units divide between two equal volumes, giving 12 each.",
      ),
      term(
        "What word names net spreading of a freely moving substance down its concentration gradient?",
        ["diffusion"],
        "Diffusion produces a net flow down a concentration gradient.",
      ),
    ],
  },
  {
    id: "water-across-a-membrane",
    title: "When only water can cross",
    summary: "Predict osmosis without confusing solute amount with concentration.",
    moduleId: "bio-cells",
    sourceIds: ["bio-transport"],
    beats: [
      beat(
        "Water follows a gradient",
        "Osmosis is net water movement across a selectively permeable membrane. With equal pressure, water initially moves toward the side with more concentrated impermeant solute.",
        ["4 left, 12 right", membrane(4, 12, "water")],
        ["12 left, 4 right", membrane(12, 4, "water")],
      ),
      beat(
        "Keep the solute",
        "Water crosses this membrane but solute cannot. The solute amounts stay fixed while volumes change, so concentrations change.",
        ["6 left, 12 right", membrane(6, 12, "water")],
        ["6 left, 12 right; blocked", membrane(6, 12, "neither")],
      ),
      beat(
        "Compare ratios",
        "Concentration is amount divided by volume. Doubling water volume while keeping solute amount fixed halves the concentration.",
        ["4 left, 12 right", membrane(4, 12, "water")],
        ["8 left, 8 right", membrane(8, 8, "water")],
      ),
      beat(
        "Know the model's limit",
        "The movable partition here allows volume change without building pressure. Real cell walls and pressure differences can oppose osmotic water movement.",
        ["Movable partition", membrane(12, 6, "water")],
        ["Impermeable barrier", membrane(12, 6, "neither")],
      ),
    ],
    questions: [
      q(
        "Water can cross but solute cannot. Equal volumes contain 4 solute units left and 12 right at equal pressure. Name the side that initially gains water.",
        ["right"],
        "The right side has the higher impermeant-solute concentration and initially gains water.",
        "Compare concentration, then follow water.",
      ),
      c(
        "As water enters the right compartment, what happens to its 12 solute units?",
        ["They disappear", "They cross to the left", "They remain on the right"],
        2,
        "The membrane blocks solute; only its concentration changes.",
        "The membrane's selectivity stays the same.",
      ),
      n(
        "A compartment contains 12 solute units in volume 2. What is its concentration in units per volume?",
        6,
        "Concentration = 12/2 = 6 units per volume.",
        ["Use amount divided by volume.", "The amount is 12 and volume is 2.", "Divide 12 by 2."],
      ),
      c(
        "Why can the model's two volumes change while its total solute remains constant?",
        ["Water crosses and solute stays", "Solute is converted to water", "New solute is created"],
        0,
        "Changing water distribution changes volumes without changing solute amount.",
        "Follow each substance separately.",
      ),
      n(
        "A compartment contains 8 units of trapped solute. Its volume increases from 1 to 2. By what factor is its concentration multiplied?",
        0.5,
        "Concentration changes from 8 to 4, a factor of 4/8 = 0.5.",
        [
          "Calculate concentration before and after.",
          "The solute amount is unchanged.",
          "Divide the new concentration by the old one.",
        ],
      ),
      c(
        "A plant cell wall builds an opposing pressure as water enters. Which prediction is justified?",
        [
          "Water must keep entering without limit",
          "Pressure can reduce or stop net water entry",
          "The membrane must disappear",
        ],
        1,
        "Water movement depends on both solute concentration and pressure; the simple partition model omits this opposition.",
        "The real cell includes a force missing from the model.",
      ),
    ],
    cards: [
      term(
        "Name the net movement of water across a selectively permeable membrane driven by a water-potential difference.",
        ["osmosis"],
        "Osmosis describes net water movement, not solute diffusion.",
      ),
      card(
        "A closed compartment has 15 solute units in volume 3. Calculate concentration in units per volume.",
        5,
        "15/3 = 5 units per volume.",
      ),
    ],
  },
  {
    id: "enzymes-and-evidence",
    title: "Make a reaction easier",
    summary: "Read enzyme data and distinguish catalysis, saturation and fair comparisons.",
    moduleId: "bio-cells",
    sourceIds: ["bio-enzymes", "bio-evidence"],
    beats: [
      beat(
        "Lower the barrier",
        "Enzymes speed reactions by lowering activation energy. They are regenerated during the reaction rather than used up as fuel.",
        [
          "Enzyme added",
          series("Time (min)", "Product (units)", [
            [0, 0],
            [1, 12],
            [2, 24],
            [3, 36],
          ]),
        ],
        [
          "No enzyme",
          series("Time (min)", "Product (units)", [
            [0, 0],
            [1, 2],
            [2, 4],
            [3, 6],
          ]),
        ],
      ),
      beat(
        "Read a temperature curve",
        "Temperature can increase reaction rate over one range and reduce it over another. High temperatures can disrupt an enzyme's shape; the best range depends on the enzyme.",
        [
          "Enzyme A",
          series("Temperature (°C)", "Rate (units/min)", [
            [10, 2],
            [25, 8],
            [40, 12],
            [55, 3],
          ]),
        ],
        [
          "Enzyme B",
          series("Temperature (°C)", "Rate (units/min)", [
            [10, 1],
            [25, 3],
            [40, 7],
            [55, 11],
          ]),
        ],
      ),
      beat(
        "A limited set of sites",
        "With a fixed amount of enzyme, increasing substrate can eventually produce little extra rate. Many active sites are already occupied.",
        [
          "Fixed enzyme",
          series("Substrate (units)", "Rate (units/min)", [
            [1, 2],
            [2, 4],
            [4, 7],
            [8, 8],
          ]),
        ],
        [
          "More enzyme",
          series("Substrate (units)", "Rate (units/min)", [
            [1, 2],
            [2, 4],
            [4, 8],
            [8, 14],
          ]),
        ],
      ),
      beat(
        "Change one cause",
        "To test an enzyme's effect, compare otherwise matched conditions with and without it. Replication helps reveal how variable the measurements are.",
        [
          "Enzyme added",
          series("Time (min)", "Product (units)", [
            [0, 0],
            [1, 9],
            [2, 18],
            [3, 27],
          ]),
        ],
        [
          "Matched control",
          series("Time (min)", "Product (units)", [
            [0, 0],
            [1, 3],
            [2, 6],
            [3, 9],
          ]),
        ],
      ),
    ],
    questions: [
      q(
        "Name the energy barrier that an enzyme lowers.",
        ["activation energy"],
        "An enzyme provides a reaction pathway with lower activation energy.",
        "The barrier must be crossed for a reaction to proceed.",
      ),
      n(
        "For Enzyme A, what measured rate is shown at 40°C, in units per minute?",
        12,
        "The 40°C observation has rate 12 units/min.",
        [
          "Select the 40°C observation.",
          "Read rate on the vertical axis.",
          "Use the plotted value, not a universal optimum.",
        ],
      ),
      q(
        "At high substrate concentration, many active sites are occupied. Which substance limits the maximum rate in this example?",
        ["enzyme"],
        "The fixed amount of enzyme limits how many substrate molecules can be processed at once.",
        "Ask which component supplies active sites.",
      ),
      n(
        "After 3 minutes, the matched enzyme sample has 27 product units and the control 9. What is the difference?",
        18,
        "27 − 9 = 18 extra product units in this comparison.",
        [
          "Compare the same elapsed time.",
          "Read both values at three minutes.",
          "Subtract the control from the enzyme sample.",
        ],
      ),
      c(
        "A high-temperature treatment lowers one enzyme's activity. What is a plausible explanation?",
        [
          "Its active-site shape has changed",
          "Every enzyme works best at that temperature",
          "Heat always increases enzyme activity",
        ],
        0,
        "High temperature can denature an enzyme and disrupt binding or catalysis.",
        "A protein's shape matters to its function.",
      ),
      c(
        "Which experiment best tests an enzyme's effect?",
        [
          "Change enzyme, temperature and pH together",
          "Compare matched replicated samples differing only in enzyme addition",
          "Compare different organisms at unrelated times",
        ],
        1,
        "Holding other conditions constant isolates enzyme addition, while replication estimates variability.",
        "Separate the tested factor from other possible causes.",
      ),
    ],
    cards: [
      term(
        "What is the energy barrier that enzymes lower?",
        ["activation energy", "activation-energy"],
        "Enzymes lower activation energy; they do not supply the reaction's energy.",
      ),
      card(
        "A treated sample makes 35 product units; its matched control makes 11 in the same time. What is the difference?",
        24,
        "35 − 11 = 24 product units.",
      ),
    ],
  },
];
