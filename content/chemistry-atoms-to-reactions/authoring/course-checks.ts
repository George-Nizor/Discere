import type {
  CourseCheckDefinition,
  CourseCheckVisual,
} from "../../../packages/contracts/src/index.js";
import { atom, batch, formula, lewis } from "./definition.js";
import { chemistryLessons } from "./lessons.js";

type Problem = [string, CourseCheckVisual, number, string, string];
const visual = (model: ReturnType<typeof atom>): CourseCheckVisual => ({
  type: "chemistry",
  model,
});
const table = (rows: string[][]): CourseCheckVisual => ({
  type: "table",
  columns: ["Quantity", "Given"],
  rows,
});
const sets: Problem[][] = [
  [
    [
      "An electrically neutral atom has atomic number 17. How many electrons does it contain?",
      table([
        ["Atomic number", "17"],
        ["Net charge", "0"],
      ]),
      17,
      "Atomic number gives 17 protons; neutrality requires 17 electrons.",
      "electrons",
    ],
    [
      "Sodium-23 has atomic number 11. How many neutrons are in its nucleus?",
      table([
        ["Mass number", "23"],
        ["Atomic number", "11"],
      ]),
      12,
      "Neutrons = 23 − 11 = 12.",
      "neutrons",
    ],
    [
      "An ion contains 12 protons and 11 electrons. Enter its signed charge.",
      visual(atom(12, 12, 11)),
      1,
      "Charge = 12 − 11 = +1.",
      "e",
    ],
    [
      "Neutral sulfur has 16 electrons. With the first two shells holding 2 and 8, how many electrons occupy its third shell?",
      visual(atom(16, 16)),
      6,
      "16 − 2 − 8 = 6 outer electrons.",
      "electrons",
    ],
    [
      "A sample contains three Mg²⁺ ions. How many Cl⁻ ions are needed to make its total charge zero?",
      table([
        ["Magnesium ions", "3 at +2 each"],
        ["Chloride charge", "−1"],
      ]),
      6,
      "The three magnesium ions total +6, requiring six chloride ions.",
      "ions",
    ],
    [
      "In the Lewis structure of O₂, each oxygen has two lone pairs. How many nonbonding electrons are there in the molecule?",
      visual(lewis("O2")),
      8,
      "Four lone pairs contain eight nonbonding electrons.",
      "electrons",
    ],
    [
      "How many atoms of all elements are in 4 H₂O molecules?",
      visual(formula("H2O", 4)),
      12,
      "Each molecule contains three atoms, so 4 × 3 = 12.",
      "atoms",
    ],
    [
      "Using C = 12 u and H = 1 u, find the formula mass of CH₄ in u.",
      visual(formula("CH4")),
      16,
      "12 + 4 × 1 = 16 u.",
      "u",
    ],
    [
      "Using M(CO₂) = 44 g/mol, how many moles are in 88 g of CO₂?",
      table([
        ["Mass", "88 g"],
        ["Molar mass", "44 g/mol"],
      ]),
      2,
      "88/44 = 2 mol.",
      "mol",
    ],
    [
      "Balance ? H₂ + O₂ → 2 H₂O. Find the H₂ coefficient.",
      table([
        ["Reactants", "? H₂ + O₂"],
        ["Products", "2 H₂O"],
      ]),
      2,
      "Two waters contain four H atoms, requiring two H₂.",
      "",
    ],
    [
      "For CH₄ + 2 O₂ → CO₂ + 2 H₂O, find the water yield in mol from 4 mol CH₄ with excess O₂.",
      table([
        ["CH₄ available", "4 mol"],
        ["CH₄ : H₂O", "1 : 2"],
      ]),
      8,
      "The water-to-methane ratio is 2:1, giving 8 mol.",
      "mol",
    ],
    [
      "For 2 H₂ + O₂ → 2 H₂O, start with 3 mol H₂ and 3 mol O₂. Find the theoretical water yield in mol.",
      visual(batch("water", 3, 3)),
      3,
      "Hydrogen supports 1.5 molar batches, yielding 3 mol water.",
      "mol",
    ],
  ],
  [
    [
      "A neutral atom contains 14 electrons and 14 neutrons. What is its atomic number?",
      table([
        ["Electrons", "14"],
        ["Neutrons", "14"],
        ["Net charge", "0"],
      ]),
      14,
      "Neutrality gives 14 protons, so the atomic number is 14.",
      "protons",
    ],
    [
      "Magnesium has atomic number 12. One isotope has 13 neutrons. Find its mass number.",
      visual(atom(12, 13)),
      25,
      "Mass number = 12 + 13 = 25.",
      "particles",
    ],
    [
      "An ion contains 15 protons and 18 electrons. Enter its signed charge.",
      visual(atom(15, 16, 18)),
      -3,
      "15 − 18 = −3.",
      "e",
    ],
    [
      "Neutral silicon has 14 electrons. How many are in its outer shell for shell populations 2, 8, then the remainder?",
      visual(atom(14, 14)),
      4,
      "14 − 2 − 8 = 4.",
      "electrons",
    ],
    [
      "Ca²⁺ and O²⁻ form a neutral solid. In the simplest formula, how many calcium ions accompany one oxide ion?",
      table([
        ["Calcium charge", "+2"],
        ["Oxide charge", "−2"],
      ]),
      1,
      "One +2 charge cancels one −2 charge.",
      "ions",
    ],
    [
      "NH₃ has three single bonds. How many shared electrons are in those bonds altogether?",
      visual(lewis("NH3")),
      6,
      "Three shared pairs contain six electrons.",
      "electrons",
    ],
    [
      "How many hydrogen atoms are in 4 CH₄ molecules?",
      visual(formula("CH4", 4)),
      16,
      "4 × 4 = 16 hydrogen atoms.",
      "atoms",
    ],
    [
      "Use Mg = 24 u and O = 16 u. Find the formula mass of MgO in u.",
      visual(formula("MgO")),
      40,
      "24 + 16 = 40 u.",
      "u",
    ],
    [
      "Using M(H₂O) = 18 g/mol, find the mass of 0.5 mol H₂O in grams.",
      visual({ kind: "amount", species: "H2O", moles: 0.5 }),
      9,
      "0.5 × 18 = 9 g.",
      "g",
    ],
    [
      "Balance 2 N₂ + ? H₂ → 4 NH₃. Find the H₂ coefficient.",
      table([
        ["Reactants", "2 N₂ + ? H₂"],
        ["Products", "4 NH₃"],
      ]),
      6,
      "Four NH₃ contain twelve H atoms, requiring six H₂.",
      "",
    ],
    [
      "For N₂ + 3 H₂ → 2 NH₃, how many moles of H₂ are needed to produce 10 mol NH₃?",
      table([
        ["NH₃ required", "10 mol"],
        ["H₂ : NH₃", "3 : 2"],
      ]),
      15,
      "10 × 3/2 = 15 mol H₂.",
      "mol",
    ],
    [
      "For N₂ + 3 H₂ → 2 NH₃, start with 3 mol N₂ and 6 mol H₂. How many moles of N₂ remain after complete reaction?",
      visual(batch("ammonia", 3, 6)),
      1,
      "Six mol H₂ consume two mol N₂, leaving 1 mol N₂.",
      "mol",
    ],
  ],
  [
    [
      "An ion of an element has 10 electrons and charge +3. What is the element's atomic number?",
      table([
        ["Electrons", "10"],
        ["Charge", "+3"],
      ]),
      13,
      "Protons − 10 = 3, so there are 13 protons.",
      "protons",
    ],
    [
      "A sample contains equal numbers of atoms with approximate masses 20 u and 22 u. Find the average mass in u.",
      table([
        ["Light atoms", "50% at 20 u"],
        ["Heavy atoms", "50% at 22 u"],
      ]),
      21,
      "0.5 × 20 + 0.5 × 22 = 21 u.",
      "u",
    ],
    [
      "Chlorine has atomic number 17. How many electrons are in a Cl⁻ ion?",
      table([
        ["Atomic number", "17"],
        ["Charge", "−1"],
      ]),
      18,
      "The −1 charge requires one extra electron: 18.",
      "electrons",
    ],
    [
      "Neutral nitrogen has 7 electrons. How many valence electrons does it have?",
      visual(atom(7, 8)),
      5,
      "The first shell has two, leaving five in the outer shell.",
      "electrons",
    ],
    [
      "Four Al³⁺ ions combine with O²⁻ ions. How many oxide ions are needed for zero total charge?",
      table([
        ["Aluminium ions", "4 at +3 each"],
        ["Oxide charge", "−2"],
      ]),
      6,
      "The positive charge is +12; six oxide ions supply −12.",
      "ions",
    ],
    [
      "The Lewis structure of N₂ has a triple bond and one lone pair on each nitrogen. How many valence electrons are shown altogether?",
      visual(lewis("N2")),
      10,
      "Six shared electrons plus four lone-pair electrons give ten.",
      "electrons",
    ],
    [
      "How many atoms of all elements are represented by 3 MgCl₂ formula units?",
      visual(formula("MgCl2", 3)),
      9,
      "Each formula unit contains one Mg and two Cl: 3 × 3 = 9.",
      "atoms",
    ],
    [
      "Use Ca = 40 u and Cl = 35.5 u. Find the formula mass of CaCl₂ in u.",
      visual(formula("CaCl2")),
      111,
      "40 + 2 × 35.5 = 111 u.",
      "u",
    ],
    [
      "Using M(NH₃) = 17 g/mol, find the mass of 2.5 mol NH₃ in grams.",
      visual({ kind: "amount", species: "NH3", moles: 2.5 }),
      42.5,
      "2.5 × 17 = 42.5 g.",
      "g",
    ],
    [
      "Balance 4 Mg + ? O₂ → 4 MgO. Find the O₂ coefficient.",
      table([
        ["Reactants", "4 Mg + ? O₂"],
        ["Products", "4 MgO"],
      ]),
      2,
      "Four MgO require four O atoms, supplied by two O₂.",
      "",
    ],
    [
      "For 2 Mg + O₂ → 2 MgO, how many moles of O₂ are needed to produce 7 mol MgO?",
      table([
        ["MgO required", "7 mol"],
        ["O₂ : MgO", "1 : 2"],
      ]),
      3.5,
      "7 × 1/2 = 3.5 mol O₂.",
      "mol",
    ],
    [
      "For CH₄ + 2 O₂ → CO₂ + 2 H₂O, start with 2 mol CH₄ and 7 mol O₂. How many moles of O₂ remain after complete reaction?",
      visual(batch("methane", 2, 7)),
      3,
      "Two mol CH₄ consume four mol O₂, leaving three mol O₂.",
      "mol",
    ],
  ],
];
const ids = ["starting-point", "mixed-challenge", "later-applications"],
  kinds = ["placement", "checkpoint", "transfer"] as const;
export const chemistryChecks: CourseCheckDefinition[] = sets.map((problems, set) => ({
  id: ids[set]!,
  kind: kinds[set]!,
  title: ["Find your starting point", "Put the ideas together", "Use it after a break"][set]!,
  description: "Twelve fresh problems across atoms, bonds and reaction quantities.",
  requiredLessonIds: set ? chemistryLessons.map((l) => l.id) : [],
  ...(set === 2 ? { afterCheckId: ids[1]!, delayDays: 7 } : {}),
  items: problems.map(([prompt, visual, value, workedAnswer, unit], i) => {
    const lesson = chemistryLessons[i]!;
    return {
      lessonId: lesson.id,
      visual,
      question: {
        id: "chem-check-" + ids[set] + "-" + lesson.id,
        conceptIds: ["chem-" + lesson.id],
        sourceIds: lesson.sourceIds,
        prompt,
        responseType: "numeric",
        difficulty: 1,
        hints: [],
        answerAuthority: {
          kind: "numeric",
          value,
          unit,
          absoluteTolerance: 1e-6,
          relativeTolerance: 0,
          workedAnswer,
        },
      },
    };
  }),
}));
