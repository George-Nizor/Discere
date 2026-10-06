import type {
  CourseCheckDefinition,
  CourseCheckVisual,
  BiologyModel,
} from "../../../packages/contracts/src/index.js";
import {
  c,
  n,
  cell,
  membrane,
  series,
  dna,
  division,
  cross,
  population,
  web,
  pyramid,
  type DraftQuestion,
} from "./definition.js";
import { biologyLessons } from "./lessons.js";
type Problem = [DraftQuestion, CourseCheckVisual];
const v = (model: BiologyModel): CourseCheckVisual => ({ type: "biology", model });
const t = (rows: string[][]): CourseCheckVisual => ({
  type: "table",
  columns: ["Quantity", "Given"],
  rows,
});
const qn = (prompt: string, value: number, reason: string, visual: CourseCheckVisual): Problem => [
  n(prompt, value, reason, []),
  visual,
];
const qc = (
  prompt: string,
  labels: string[],
  correct: number,
  reason: string,
  visual: CourseCheckVisual,
): Problem => [c(prompt, labels, correct, reason, ""), visual];
const sets: Problem[][] = [
  [
    qc(
      "A bacterium makes proteins but lacks a membrane-bound nucleus. Which structure makes its proteins?",
      ["Ribosomes", "Chloroplasts", "Cell wall"],
      0,
      "Bacterial ribosomes synthesise proteins; a nucleus is not required for ribosomes to function.",
      v(cell("bacterium")),
    ),
    qn(
      "Equal fixed volumes contain 16 and 8 units of a freely crossing solute. How many units are on each side at equilibrium?",
      12,
      "(16 + 8)/2 = 12 units per side.",
      v(membrane(16, 8, "solute")),
    ),
    qc(
      "A membrane passes water but blocks sugar. Equal volumes contain 9 sugar units left and 3 right at equal pressure. Which way is initial net water movement?",
      ["Left to right", "Right to left", "No net movement"],
      1,
      "Water moves net toward the higher impermeant-solute concentration, on the left.",
      v(membrane(9, 3, "water")),
    ),
    qc(
      "Adding enzyme increases initial product formation in a matched reaction. What has the enzyme most directly changed?",
      ["The activation barrier", "The identity of the elements", "The total number of atoms"],
      0,
      "Catalysis provides a pathway with lower activation energy; it conserves atoms.",
      v(
        series("Time (min)", "Product (units)", [
          [0, 0],
          [1, 5],
          [2, 10],
          [3, 15],
        ]),
      ),
    ),
    qc(
      "A plant gains carbon in newly synthesised sugars. Which input supplies that carbon?",
      ["Light", "CO₂", "O₂"],
      1,
      "CO₂ provides the carbon atoms used to construct sugars.",
      t([
        ["Process", "Photosynthesis"],
        ["Inputs", "Light, CO₂ and water"],
      ]),
    ),
    qn(
      "Complete aerobic oxidation of five glucose molecules yields how many CO₂ molecules?",
      30,
      "Five glucose contain 5 × 6 = 30 carbon atoms, yielding 30 CO₂.",
      t([
        ["Carbon atoms per glucose", "6"],
        ["Glucose molecules", "5"],
      ]),
    ),
    qc(
      "The template is 5′-CGTA-3′. Which is its aligned complementary strand, read left to right?",
      ["3′-GCAT-5′", "3′-CGTA-5′", "3′-ATGC-5′"],
      0,
      "C pairs with G, G with C, T with A and A with T; aligned directions oppose.",
      v(dna("CGTA")),
    ),
    qn(
      "A cell with 6 chromosomes completes normal mitosis and cytokinesis. How many chromosomes does each daughter have?",
      6,
      "Each daughter retains six chromosomes.",
      v(division("mitosis", 3, 0)),
    ),
    qn(
      "A diploid cell has 4 homologous pairs. How many chromosomes are in each normal haploid meiotic product?",
      4,
      "One chromosome from each of four pairs gives four.",
      v(division("meiosis", 4, 0)),
    ),
    qn(
      "In an AA × Aa cross with complete dominance, what percentage of offspring is expected to have the recessive phenotype?",
      0,
      "Each offspring receives A from the AA parent, so none is aa.",
      v(cross("AA", "Aa")),
    ),
    qc(
      "Compare CGTA with CCTA. What changed?",
      ["One base was substituted", "One base was inserted", "One base was deleted"],
      0,
      "Only the second position changed, from G to C; the length is unchanged.",
      t([
        ["Original", "CGTA"],
        ["Changed", "CCTA"],
      ]),
    ),
    qc(
      "Heritable blue organisms consistently leave more reproducing descendants than gold organisms in a controlled environment. What mechanism does this support?",
      ["Natural selection", "Directed need-based mutation", "No possible population change"],
      0,
      "Differential reproductive success associated with a heritable variant supports selection.",
      v(population([25, 25], [40, 10])),
    ),
    qc(
      "In the pond web, which arrow indicates the heron eating small fish?",
      ["Heron → small fish", "Small fish → heron", "Algae → small fish"],
      1,
      "Food-to-consumer arrows run from small fish to heron.",
      v(web("pond")),
    ),
    qn(
      "Producers supply 6000 kJ. Assume 15% transfer at each of two steps. How many kJ reach level 3?",
      135,
      "6000 × 0.15 × 0.15 = 135 kJ.",
      v(pyramid(6000, 15)),
    ),
    qc(
      "A population approaches a plateau as food becomes scarce. Which explanation fits?",
      [
        "Density-dependent limits reduce net growth",
        "Reproduction has become mathematically impossible",
        "Energy no longer matters",
      ],
      0,
      "Competition and other density-dependent factors can reduce net growth near resource limits.",
      v(
        series("Time", "Population", [
          [0, 15],
          [1, 28],
          [2, 40],
          [3, 48],
          [4, 50],
        ]),
      ),
    ),
    qn(
      "A treatment group grows from 6 to 15 cm, and a control from 6 to 10 cm. What is the treatment-minus-control growth difference in cm?",
      5,
      "Treatment growth is 9 cm and control growth is 4 cm: difference 5 cm.",
      t([
        ["Treatment: start → end", "6 → 15 cm"],
        ["Control: start → end", "6 → 10 cm"],
      ]),
    ),
  ],
  [
    qc(
      "A leaf cell both captures light and respires. Which organelles match those two jobs?",
      [
        "Chloroplasts and mitochondria",
        "Cell wall and nucleus only",
        "Ribosomes and cell wall only",
      ],
      0,
      "Chloroplasts capture light; mitochondria support aerobic energy transfer.",
      v(cell("plant")),
    ),
    qn(
      "Equal fixed volumes start with 17 and 7 solute units. Solute can cross. How many units move net from the concentrated side before equilibrium?",
      5,
      "The equilibrium amount is 12; 17 − 12 = 5 units move net.",
      v(membrane(17, 7, "solute")),
    ),
    qn(
      "A compartment has 18 units of impermeant solute. Its volume increases from 2 to 3. What is the final concentration in units per volume?",
      6,
      "Final concentration is 18/3 = 6.",
      t([
        ["Solute amount", "18 units"],
        ["Initial volume", "2"],
        ["Final volume", "3"],
      ]),
    ),
    qc(
      "A fixed enzyme sample stops gaining much rate as substrate rises. Which change could increase its maximum rate under otherwise suitable conditions?",
      ["Add more active enzyme", "Remove all substrate", "Raise temperature without limit"],
      0,
      "More active enzyme supplies more catalytic sites; unbounded heating can damage it.",
      v(
        series("Substrate (units)", "Rate (units/min)", [
          [1, 3],
          [2, 6],
          [4, 9],
          [8, 10],
        ]),
      ),
    ),
    qn(
      "Using 6 CO₂ per glucose in the simplified photosynthesis accounting, how many CO₂ molecules are required for four glucose molecules?",
      24,
      "4 × 6 = 24 CO₂ molecules.",
      t([
        ["CO₂ per glucose", "6"],
        ["Glucose formed", "4"],
      ]),
    ),
    qc(
      "A living root cell receives sugar but no light. Which process can transfer fuel energy into ATP?",
      ["Cellular respiration", "Only photosynthesis", "Only evaporation"],
      0,
      "Root cells can respire using fuel supplied by the plant.",
      t([
        ["Cell", "Living root cell"],
        ["Available inputs", "Sugar and oxygen"],
        ["Light", "Absent"],
      ]),
    ),
    qn(
      "A cell has 8 chromosomes, each with two sister chromatids after replication. How many DNA molecules are present?",
      16,
      "8 × 2 = 16 DNA molecules.",
      v(division("mitosis", 4, 1)),
    ),
    qn(
      "Five cells each divide once by normal mitosis and cytokinesis. How many cells result?",
      10,
      "5 × 2 = 10 cells.",
      t([
        ["Starting cells", "5"],
        ["Completed divisions per cell", "1"],
      ]),
    ),
    qc(
      "At the end of meiosis I, which relationship normally remains?",
      [
        "Sister chromatids are still joined",
        "Both homologues stay in every daughter",
        "DNA must be absent",
      ],
      0,
      "Meiosis I separates homologues; joined sisters normally separate during meiosis II.",
      v(division("meiosis", 2, 2)),
    ),
    qn(
      "For Aa × Aa with complete dominance, what percentage of offspring is expected to show the dominant phenotype?",
      75,
      "AA and both Aa pairings show the dominant phenotype: 3/4 = 75%.",
      v(cross("Aa", "Aa")),
    ),
    qc(
      "A DNA substitution is observed in a noncoding region. What can be concluded from the sequence change alone?",
      [
        "Its biological effect needs more evidence",
        "It is necessarily fatal",
        "It must improve fitness",
      ],
      0,
      "Sequence context and function determine effects; a substitution alone does not establish benefit or harm.",
      t([
        ["Original fragment", "TTACGA"],
        ["Changed fragment", "TTATGA"],
      ]),
    ),
    qn(
      "A population changes from 12 blue and 48 gold to 36 blue and 24 gold. By how many percentage points does blue frequency increase?",
      40,
      "It rises from 20% to 60%, a 40-point increase.",
      v(population([12, 48], [36, 24])),
    ),
    qc(
      "Which process returns nutrients from dead material to environmental pools?",
      ["Decomposition", "Destruction of every atom", "Recycling all energy as sunlight"],
      0,
      "Decomposers contribute to nutrient recycling; energy flow is different.",
      v(web("meadow")),
    ),
    qn(
      "An upper level requires 180 kJ. At a stated 20% transfer from the level directly below, how many kJ must that lower level supply?",
      900,
      "180/0.20 = 900 kJ.",
      t([
        ["Required upper-level energy", "180 kJ"],
        ["Transfer efficiency", "20%"],
      ]),
    ),
    qn(
      "A closed population starts at 120 and records 25 births and 17 deaths. What is its final size?",
      128,
      "120 + 25 − 17 = 128.",
      t([
        ["Initial population", "120"],
        ["Births", "25"],
        ["Deaths", "17"],
        ["Migration", "None"],
      ]),
    ),
    qc(
      "Twenty pots are randomly assigned to fertiliser or control. Why is random assignment useful?",
      [
        "It reduces systematic allocation differences",
        "It guarantees every measurement is identical",
        "It removes the need for a control",
      ],
      0,
      "Chance allocation reduces systematic pre-existing group differences; replication is still needed.",
      t([
        ["Experimental units", "20 comparable pots"],
        ["Treatments", "Fertiliser or control"],
        ["Assignment", "Random"],
      ]),
    ),
  ],
  [
    qc(
      "A living plant cell lacks chloroplasts but contains mitochondria and a nucleus. Which statement is justified?",
      ["It may be a nonphotosynthetic plant cell", "It cannot be alive", "It must be a bacterium"],
      0,
      "Some plant cells lack chloroplasts while retaining other eukaryotic structures.",
      t([
        ["Present", "Nucleus and mitochondria"],
        ["Absent", "Chloroplasts"],
        ["Organism", "Plant"],
      ]),
    ),
    qc(
      "A solute is more concentrated outside a cell, but cannot cross its membrane. Does its gradient alone guarantee solute entry?",
      [
        "No, permeability also matters",
        "Yes, every concentration gradient forces entry",
        "Yes, even through an impermeable barrier",
      ],
      0,
      "A blocked substance cannot cross by simple diffusion merely because a gradient exists.",
      v(membrane(5, 15, "neither")),
    ),
    qc(
      "Water has entered a walled cell and pressure builds inside. Why might net entry slow?",
      [
        "Pressure can oppose osmotic movement",
        "The wall creates new solute atoms",
        "Water has stopped moving at all",
      ],
      0,
      "Water movement depends on pressure as well as solute conditions.",
      t([
        ["Membrane", "Permeable to water"],
        ["Internal pressure", "Increasing"],
        ["Cell wall", "Resists expansion"],
      ]),
    ),
    qn(
      "A treatment makes 42 product units in 6 minutes, while its matched control makes 12. What is the difference in average production rate, in units per minute?",
      5,
      "The average rates are 7 and 2 units/min, giving a difference of 5.",
      t([
        ["Treatment product", "42 units"],
        ["Control product", "12 units"],
        ["Elapsed time", "6 minutes"],
      ]),
    ),
    qc(
      "A plant grows in mass under light. Why is light alone not a complete explanation for its new carbon-containing material?",
      [
        "Light supplies energy, while carbon atoms come from matter such as CO₂",
        "Light creates carbon atoms",
        "Plants need no matter inputs",
      ],
      0,
      "Energy capture and atom supply are distinct; photosynthesis incorporates CO₂ carbon.",
      t([
        ["Observation", "New plant material"],
        ["Light", "Available"],
        ["Carbon-containing gas", "CO₂"],
      ]),
    ),
    qn(
      "A sealed aerobic system drops from 32 to 20 oxygen units in four minutes, while a blank stays unchanged. What is its average oxygen consumption rate in units per minute?",
      3,
      "(32 − 20)/4 = 3 units/min.",
      t([
        ["Oxygen: start → end", "32 → 20"],
        ["Duration", "4 minutes"],
        ["Blank change", "0"],
      ]),
    ),
    qc(
      "One DNA molecule is labelled in both original strands and replicates once in unlabelled material. What does each resulting molecule contain?",
      [
        "One labelled old strand and one unlabelled new strand",
        "Two labelled old strands",
        "No old strand",
      ],
      0,
      "Semiconservative replication pairs an old strand with a newly made strand.",
      v(dna("GCTA")),
    ),
    qn(
      "Two starting cells each complete four ideal rounds of division. How many cells result?",
      32,
      "2 × 2⁴ = 32 cells.",
      t([
        ["Starting cells", "2"],
        ["Rounds", "4"],
        ["Each round", "Every cell divides once"],
      ]),
    ),
    qn(
      "Two normal haploid gametes each carry 7 chromosomes. How many chromosomes are present just after fertilisation?",
      14,
      "7 + 7 = 14 chromosomes.",
      t([
        ["Gamete 1", "7 chromosomes"],
        ["Gamete 2", "7 chromosomes"],
      ]),
    ),
    qn(
      "For Aa × aa, what percentage of offspring is expected to be heterozygous?",
      50,
      "Half the pairings are Aa and half aa, so 50% are heterozygous.",
      v(cross("Aa", "aa")),
    ),
    qc(
      "After a habitat changes, an existing heritable variant becomes common. Which statement is consistent with mutation and selection?",
      [
        "Selection can favour variants already present",
        "The habitat must have ordered exactly that mutation",
        "Every mutation happens because it is needed",
      ],
      0,
      "Selection sorts heritable variation; a useful result does not imply a mutation was directed by need.",
      v(population([8, 32], [28, 12])),
    ),
    qc(
      "A storm randomly leaves a few survivors with a different variant frequency. Which mechanism best fits this information?",
      ["Genetic drift", "Guaranteed adaptive improvement", "An individual's intentional evolution"],
      0,
      "Random sampling through a small surviving group can change variant frequencies by drift.",
      v(population([30, 30], [4, 16])),
    ),
    qn(
      "In the meadow web, how many arrows lie along the route grass → grasshopper → frog → hawk?",
      3,
      "The route has three feeding transfers.",
      v(web("meadow")),
    ),
    qn(
      "With producer energy 12000 kJ and assumed 5% transfer per step, how many kJ reach level 3?",
      30,
      "12000 × 0.05 × 0.05 = 30 kJ.",
      v(pyramid(12000, 5)),
    ),
    qc(
      "A habitat loses half its food-producing area. Which claim about carrying capacity is most defensible?",
      [
        "It may decrease, and its new value needs evidence",
        "It is a fixed property of the species",
        "It must increase exactly twofold",
      ],
      0,
      "Capacity depends on resources and conditions; the exact response requires data.",
      t([
        ["Change", "Food-producing area decreases"],
        ["Other conditions", "Not fully measured"],
      ]),
    ),
    qn(
      "Treatment plants grow from 9 to 24 cm, while controls grow from 11 to 20 cm. What is the difference in growth, in cm?",
      6,
      "Treatment growth is 15 cm, control growth is 9 cm; 15 − 9 = 6.",
      t([
        ["Treatment: start → end", "9 → 24 cm"],
        ["Control: start → end", "11 → 20 cm"],
      ]),
    ),
  ],
];
const ids = ["starting-point", "mixed-challenge", "later-applications"],
  kinds = ["placement", "checkpoint", "transfer"] as const;
export const biologyChecks: CourseCheckDefinition[] = sets.map((problems, set) => ({
  id: ids[set]!,
  kind: kinds[set]!,
  title: ["Find your starting point", "Put the ideas together", "Use it after a break"][set]!,
  description: "Sixteen fresh problems connecting cells, inheritance and ecosystems.",
  requiredLessonIds: set ? biologyLessons.map((l) => l.id) : [],
  ...(set === 2 ? { afterCheckId: ids[1]!, delayDays: 7 } : {}),
  items: problems.map(([question, visual], i) => {
    const lesson = biologyLessons[i]!;
    return {
      lessonId: lesson.id,
      visual,
      question: {
        ...question,
        hints: [],
        id: "bio-check-" + ids[set] + "-" + lesson.id,
        conceptIds: ["bio-" + lesson.id],
        sourceIds: lesson.sourceIds,
      },
    };
  }),
}));
