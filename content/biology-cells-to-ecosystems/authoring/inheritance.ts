import {
  beat,
  q,
  c,
  n,
  card,
  term,
  division,
  cross,
  dna,
  population,
  type TeachingLesson,
} from "./definition.js";
export const inheritance: TeachingLesson[] = [
  {
    id: "meiosis-and-gametes",
    title: "Halve a chromosome set",
    summary: "Distinguish homologues from sister chromatids and follow two meiotic divisions.",
    moduleId: "bio-inheritance",
    sourceIds: ["bio-meiosis"],
    beats: [
      beat(
        "Pairs and sets",
        "A diploid cell has two chromosome sets. Homologous chromosomes carry corresponding genes, though they may carry different alleles. Meiosis reduces two sets to one.",
        ["Two homologous pairs", division("meiosis", 2)],
        ["Three homologous pairs", division("meiosis", 3)],
      ),
      beat(
        "Separate homologues",
        "In meiosis I, homologous chromosomes separate. At its end, each daughter has one chromosome from each pair, still made of joined sister chromatids.",
        ["DNA copied", division("meiosis", 3, 1)],
        ["First division complete", division("meiosis", 3, 2)],
      ),
      beat(
        "Separate sisters",
        "Meiosis II separates sister chromatids without another preceding DNA replication. The simplified model ends with four haploid cells.",
        ["After first division", division("meiosis", 2, 2)],
        ["After second division", division("meiosis", 2, 3)],
      ),
      beat(
        "Restore two sets",
        "At fertilisation, two haploid chromosome sets combine. This restores diploidy. Crossing over and chromosome assortment also make sexual offspring genetically varied.",
        ["Haploid products", division("meiosis", 3, 3)],
        ["Diploid starting cell", division("meiosis", 3, 0)],
      ),
    ],
    questions: [
      n(
        "A diploid cell has 3 homologous pairs. How many chromosomes does it contain before DNA replication?",
        6,
        "Three pairs contain 3 × 2 = 6 chromosomes.",
        ["Each pair contains two homologues.", "There are three pairs.", "Multiply three by two."],
      ),
      q(
        "Which chromosome relationship is separated during meiosis I: name the paired chromosomes.",
        ["homologous chromosomes", "homologues", "homologs"],
        "Homologous chromosomes separate first; sister chromatids remain joined.",
        "The pair contains corresponding chromosomes from the two sets.",
      ),
      n(
        "A starting cell has 4 chromosomes in 2 pairs. After the two meiotic divisions, how many chromosomes does each final cell have?",
        2,
        "Each final haploid cell has one from each pair: two chromosomes.",
        [
          "Meiosis reduces two chromosome sets to one.",
          "The starting cell has two homologous pairs.",
          "Take one chromosome from each pair.",
        ],
      ),
      n(
        "Two gametes each contain 3 chromosomes. How many chromosomes are in their diploid fertilisation product?",
        6,
        "3 + 3 = 6 chromosomes.",
        [
          "Fertilisation combines the two sets.",
          "Each gamete supplies three chromosomes.",
          "Add the two contributions.",
        ],
      ),
      n(
        "How many additional DNA-replication rounds normally occur between meiosis I and meiosis II?",
        0,
        "No additional replication occurs; the second division separates existing sister chromatids.",
        [
          "Trace the copied chromosomes through both divisions.",
          "Meiosis begins with one replication round.",
          "The DNA is divided again without being recopied.",
        ],
      ),
      c(
        "Why can siblings inherit different chromosome combinations?",
        [
          "Chromosomes assort and exchange segments during meiosis",
          "Each parent has no genetic variation",
          "Fertilisation always uses identical gametes",
        ],
        0,
        "Assortment and crossing over produce varied gametes; the simple count diagram omits crossover.",
        "Chromosome counts can match while genetic combinations differ.",
      ),
    ],
    cards: [
      card(
        "A diploid starting cell has 10 chromosomes in 5 pairs. How many chromosomes are in each normal haploid meiotic product?",
        5,
        "A haploid cell has one chromosome from each of the five pairs.",
      ),
      term(
        "What term describes a cell with one chromosome set?",
        ["haploid"],
        "Haploid means one set; diploid means two.",
      ),
    ],
  },
  {
    id: "predicting-inheritance",
    title: "What could the offspring inherit?",
    summary: "Use a single-gene cross while separating genotype, phenotype and probability.",
    moduleId: "bio-inheritance",
    sourceIds: ["bio-inheritance"],
    beats: [
      beat(
        "One allele per gamete",
        "In this diploid single-gene model, an Aa parent forms A and a gametes with equal probability. Each offspring receives one allele from each parent.",
        ["Aa × aa", cross("Aa", "aa")],
        ["AA × aa", cross("AA", "aa")],
      ),
      beat(
        "Four equal pairings",
        "Crossing Aa with Aa gives four equally likely pairings: AA, Aa, Aa and aa. The repeated Aa squares represent separate ways to get that genotype.",
        ["Aa × Aa", cross("Aa", "Aa")],
        ["Aa × aa", cross("Aa", "aa")],
      ),
      beat(
        "A trait is not a genotype",
        "With complete dominance, AA and Aa share the dominant phenotype. The recessive phenotype requires aa in this model.",
        ["AA × aa", cross("AA", "aa")],
        ["aa × aa", cross("aa", "aa")],
      ),
      beat(
        "Chances are not quotas",
        "A 25% probability applies to each independent offspring. Four offspring need not include exactly one recessive individual.",
        ["Aa × Aa", cross("Aa", "Aa")],
        ["AA × Aa", cross("AA", "Aa")],
      ),
    ],
    questions: [
      q(
        "What term describes the Aa parent, which carries two different alleles at this locus?",
        ["heterozygous", "heterozygote"],
        "Aa is heterozygous; its two different alleles can segregate into gametes.",
        "The term contrasts with homozygous.",
      ),
      n(
        "For Aa × Aa, what percentage of offspring is expected to have genotype aa?",
        25,
        "One of four equally likely pairings is aa: 1/4 = 25%.",
        [
          "Inspect all four pairings.",
          "Count the aa squares.",
          "Convert one out of four to a percentage.",
        ],
      ),
      c(
        "With A completely dominant, which genotypes have the dominant phenotype?",
        [
          "Two dominant alleles or one of each",
          "Only two recessive alleles",
          "No alleles at this locus",
        ],
        0,
        "One A allele is enough for the dominant phenotype in this model.",
        "Keep genotype letters separate from the expressed trait.",
      ),
      c(
        "Four offspring are produced from Aa × Aa. Which statement is justified?",
        ["Exactly one must be aa", "Each has a 25% chance of aa", "None can be aa"],
        1,
        "Independent random outcomes do not enforce a fixed family quota.",
        "A probability predicts a long-run pattern.",
      ),
      n(
        "For Aa × aa, what percentage of offspring is expected to show the recessive phenotype?",
        50,
        "Two of four equally likely pairings are aa: 50%.",
        [
          "The aa parent always passes a.",
          "The Aa parent passes a half the time.",
          "Convert one half to a percentage.",
        ],
      ),
      q(
        "In this model, Aa and AA share a phenotype. What term describes A relative to a?",
        ["dominant"],
        "A is dominant in this genotype-to-phenotype relationship; that does not establish its frequency or fitness effect.",
        "Name the expression relationship, not a population frequency.",
      ),
    ],
    cards: [
      card(
        "In an AA × aa cross, what percentage of offspring are heterozygous under the single-gene model?",
        100,
        "Every offspring receives A from one parent and a from the other, so all are Aa.",
      ),
      term(
        "What word describes a genotype with two different alleles at one locus?",
        ["heterozygous", "heterozygote"],
        "Aa is heterozygous; AA and aa are homozygous.",
      ),
    ],
  },
  {
    id: "mutation-and-variation",
    title: "Where does a new variant come from?",
    summary: "Distinguish DNA change from directed need and identify what can be inherited.",
    moduleId: "bio-inheritance",
    sourceIds: [
      "bio-mutation",
      "bio-meiosis",
      "bio-evolution",
      "bio-population-genetics",
      "bio-evolution-evidence",
    ],
    beats: [
      beat(
        "Change the sequence",
        "A mutation changes DNA sequence. A substitution replaces one base with another; insertions and deletions add or remove bases.",
        ["Original ATCG", dna("ATCG")],
        ["Changed ATGG", dna("ATGG")],
      ),
      beat(
        "Count the change",
        "Two sequences can differ at a single position without changing length. Sequence change alone does not tell you whether a biological effect is harmful, neutral or helpful.",
        ["Original AATG", dna("AATG")],
        ["Changed AACG", dna("AACG")],
      ),
      beat(
        "Pass it onward",
        "In sexually reproducing animals, a mutation in the cell lineage that forms gametes can reach offspring. A mutation confined to an ordinary body cell generally does not.",
        ["Copy a body-cell sequence", dna("CCAT")],
        ["Copy a changed sequence", dna("CTAT")],
      ),
      beat(
        "Variation before selection",
        "Mutations do not arise because an organism needs a particular useful change. Selection acts on existing heritable differences; its outcome depends on the environment.",
        ["Blue becomes more common", population([20, 20], [30, 10])],
        ["Gold becomes more common", population([20, 20], [10, 30])],
      ),
    ],
    questions: [
      q(
        "ATCG changes to ATGG without changing length. Name this type of single-base change.",
        ["substitution", "base substitution"],
        "The third base was substituted: C became G.",
        "No base was inserted or removed.",
      ),
      n(
        "Compare AATG with AACG. How many displayed positions differ?",
        1,
        "Only position three differs: T became C.",
        [
          "Align the sequences from the left.",
          "Compare A/A, A/A, T/C and G/G.",
          "Count mismatched positions.",
        ],
      ),
      q(
        "Name the reproductive cell type that can carry a DNA mutation directly into an offspring at fertilisation.",
        ["gamete", "sperm", "egg"],
        "A contributing gamete can carry a DNA variant into the offspring.",
        "Ordinary skin cells do not contribute DNA at fertilisation.",
      ),
      c(
        "A useful variant becomes more frequent after an environmental change. Which explanation avoids a directed-mutation error?",
        [
          "Organisms created exactly the mutation they needed",
          "Existing heritable variants differed in reproductive success",
          "Every individual rewrote its DNA on purpose",
        ],
        1,
        "Selection can change the frequency of existing variants; need does not direct a specific helpful mutation.",
        "Separate the origin of variation from its sorting.",
      ),
      c(
        "What can you conclude from a single DNA substitution alone?",
        [
          "It must be harmful",
          "It must improve survival",
          "Its biological effect needs additional evidence",
        ],
        2,
        "Effects depend on sequence context and environment; some substitutions have little detectable effect.",
        "A changed letter does not specify a phenotype.",
      ),
      n(
        "Compare the aligned sequences TCGATA and TCAACA. How many positions differ?",
        2,
        "Positions 3 and 5 differ; the other four agree.",
        [
          "Keep both sequences aligned.",
          "Check each of six positions.",
          "Count only the G/A and T/C differences.",
        ],
      ),
    ],
    cards: [
      term(
        "What is the general term for a change in DNA sequence?",
        ["mutation"],
        "A mutation changes DNA sequence; its effect depends on context.",
      ),
      card(
        "Compare GGTACC with GATATC. How many aligned positions differ?",
        2,
        "Positions 2 and 5 differ.",
      ),
    ],
  },
  {
    id: "natural-selection",
    title: "A population changes over generations",
    summary:
      "Connect heritable variation and reproductive success without confusing change with proof of cause.",
    moduleId: "bio-inheritance",
    sourceIds: ["bio-evolution", "bio-population-genetics", "bio-evolution-evidence"],
    beats: [
      beat(
        "Count a frequency",
        "Frequency is a fraction of a population. If 10 of 40 organisms carry the blue variant, its frequency is 25%. Counts and proportions answer different questions.",
        ["Blue increases", population([10, 30], [30, 30])],
        ["Same proportion", population([10, 30], [20, 60])],
      ),
      beat(
        "Follow descendants",
        "Natural selection requires heritable differences associated with different reproductive success. A helpful trait in one environment need not help in another.",
        ["Environment A", population([20, 20], [32, 8])],
        ["Environment B", population([20, 20], [8, 32])],
      ),
      beat(
        "Populations evolve",
        "Selection changes a population's composition over generations. It does not mean an individual develops a needed inherited trait during its own lifetime.",
        ["Generation change", population([15, 35], [30, 20])],
        ["Opposite change", population([35, 15], [20, 30])],
      ),
      beat(
        "Keep alternative causes",
        "A frequency shift alone does not prove selection. Chance sampling, migration and other processes can also alter a population's composition.",
        ["Blue rises", population([20, 20], [26, 14])],
        ["Blue falls", population([20, 20], [14, 26])],
      ),
    ],
    questions: [
      n(
        "In the first case, 10 of 40 organisms initially carry the blue variant. What percentage is blue?",
        25,
        "10/40 × 100 = 25%.",
        [
          "Use blue divided by total.",
          "The total is 10 + 30.",
          "Convert the fraction to a percentage.",
        ],
      ),
      q(
        "Heritable variants consistently leave different numbers of reproducing descendants. Name the evolutionary process described.",
        ["natural selection"],
        "Natural selection changes frequencies through differences in reproductive success associated with heritable traits.",
        "The difference is consistent rather than random sampling.",
      ),
      n(
        "Blue organisms increase from 15 of 50 to 30 of 50. By how many percentage points does blue frequency rise?",
        30,
        "The frequency rises from 30% to 60%, a 30-point increase.",
        [
          "Calculate each frequency using the total of 50.",
          "Convert 15/50 and 30/50 to percentages.",
          "Subtract the earlier percentage from the later one.",
        ],
      ),
      c(
        "A small population's variant frequency changes. Is selection the only possible cause?",
        [
          "Yes, every frequency shift proves selection",
          "No, chance and migration can also matter",
          "No population can change",
        ],
        1,
        "Several evolutionary processes can change frequency; causal evidence is needed.",
        "A pattern can have more than one cause.",
      ),
      c(
        "A once-useful trait becomes disadvantageous after a habitat change. Is this compatible with natural selection?",
        [
          "Yes, reproductive advantage depends on the environment",
          "No, useful traits are always useful",
          "Only if the organism chooses it",
        ],
        0,
        "Selection depends on how traits affect reproduction in the current environment.",
        "Fitness is context dependent.",
      ),
      n(
        "A later population has 18 blue and 42 gold organisms. What percentage is blue?",
        30,
        "18/(18 + 42) × 100 = 30%.",
        ["Find the total population.", "Divide 18 by 60.", "Convert 0.3 to a percentage."],
      ),
    ],
    cards: [
      card(
        "A population contains 27 blue and 63 gold organisms. What percentage is blue?",
        30,
        "27/90 × 100 = 30%.",
      ),
      term(
        "What process changes variant frequencies through chance sampling rather than consistent reproductive advantage?",
        ["genetic drift", "drift"],
        "Genetic drift changes frequencies through random sampling.",
      ),
    ],
  },
];
