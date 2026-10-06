import {
  beat,
  card,
  choose,
  numeric,
  passage,
  scan,
  term,
  texts,
  word,
  type TeachingLesson,
} from "./definition.js";

export const scansions = {
  summersDay: scan("Sonnet 18, line 1", "Shall /I com-/pare thee /to a /sum-mer's /day?"),
  hope: scan("Dickinson, 'Hope', line 1", "/Hope is the /thing with /fea-thers"),
  roughWinds: scan("Sonnet 18, line 3", "Rough /winds do /shake the /dar-ling /buds of /May,"),
  temperate: scan("Sonnet 18, line 2", "Thou /art more /love-ly /and more /tem-per-/ate:"),
  shaken: scan("Sonnet 116, line 6", "That /looks on /tem-pests /and is /ne-ver /sha-ken"),
  question: scan("Hamlet, 3.1", "To /be, or /not to /be, that /is the /ques-tion:"),
  double: scan("Macbeth, 4.1", "/Dou-ble, /dou-ble, /toil and /trou-ble;"),
  sings: scan("Dickinson, 'Hope', line 3", "And /sings the /tune with-/out the /words,"),
  perches: scan("Dickinson, 'Hope', line 2", "That /per-ches /in the /soul,"),
  waite: scan(
    "Milton, 'When I consider', line 14",
    "They /al-so /serve who /on-ly /stand and /waite.",
  ),
  mists: scan("Keats, 'To Autumn', line 1", "/Sea-son of /mists and /mel-low /fruit-ful-/ness,"),
};

export const poetryLessons: TeachingLesson[] = [
  {
    id: "metre-and-scansion",
    title: "Metre and scansion",
    summary:
      "Count syllables and place the beats of iambic pentameter. Hear a feminine ending, and tell a rising iamb from a falling trochee.",
    moduleId: "lang-poetry",
    sourceIds: ["lang-wp-pentameter", "lang-wp-trochee", "lang-pg-sonnets"],
    beats: [
      beat(
        "Count the syllables",
        "Scansion starts with syllables. 'Shall I compare thee to a summer's day?' has ten, and the beats fall on the even ones: I, -pare, to, sum-, day. An unstressed syllable followed by a stressed one is an iamb, and five iambs make iambic pentameter, the line of English verse drama and of the sonnet. Metrical stress need not match speech: 'to' takes a beat here only because of where it stands.",
        ["Sonnet 18", scansions.summersDay],
        ["Dickinson", scansions.hope],
      ),
      beat(
        "Where the beats land",
        "An iambic pentameter line has ten positions alternating weak and strong, so the strong positions are the even-numbered syllables. In 'Rough winds do shake the darling buds of May' the beats land on 'winds', 'shake', 'dar-', 'buds' and 'May'. Spoken English rarely gives five equal stresses. 'Rough' is heavy too, and reading it with weight against the metre is part of the line's force.",
        ["Sonnet 18, line 3", scansions.roughWinds],
        ["Sonnet 18, line 2", scansions.temperate],
      ),
      beat(
        "A feminine ending",
        "A line can carry an extra unstressed syllable after its last beat. 'That looks on tempests and is never shaken' ends 'NE-ver SHA-ken', and the final '-ken' trails off. This is a feminine ending. The line is still pentameter, because it keeps five beats; Hamlet's 'To be, or not to be, that is the question' has the same shape, and its unresolved last syllable suits an unresolved question.",
        ["Sonnet 116", scansions.shaken],
        ["Hamlet", scansions.question],
      ),
      beat(
        "Rising and falling feet",
        "Reverse the iamb and you have a trochee, stressed then unstressed. The witches in Macbeth chant in trochaic tetrameter, four falling feet: DOU-ble DOU-ble TOIL and TROU-ble. Set that beside Dickinson's iambic 'And sings the tune without the words', also eight syllables and four beats. The count is the same, but one line falls and the other rises, and Shakespeare gives his supernatural speakers a metre unlike the iambic speech of his human characters.",
        ["Macbeth", scansions.double],
        ["Dickinson", scansions.sings],
      ),
    ],
    questions: [
      numeric(
        "How many syllables are in 'Shall I compare thee to a summer's day?'",
        10,
        "Ten: shall / I / com / pare / thee / to / a / sum / mer's / day.",
        [
          "Say the line slowly and tap once for each vowel sound.",
          "'Compare' and 'summer's' have two syllables each.",
          "Every other word has one syllable; add them up.",
        ],
      ),
      numeric(
        "In a regular line of iambic pentameter the beats fall on the even-numbered syllables. Counting from the first syllable, on which syllable does the third beat fall?",
        6,
        "Syllable 6: the beats fall on syllables 2, 4, 6, 8 and 10.",
        [
          "List the syllable positions that carry beats.",
          "The first beat falls on the second syllable.",
          "Each further beat comes two syllables later.",
        ],
      ),
      numeric(
        "How many syllables are in 'That looks on tempests and is never shaken'?",
        11,
        "Eleven. '-ken' is an extra unstressed syllable after the last beat on 'sha-': a feminine ending.",
        [
          "Tap once for each vowel sound.",
          "'Tempests', 'never' and 'shaken' have two syllables each.",
          "Notice what follows the last beat on 'sha-'.",
        ],
      ),
      word(
        "The witches chant 'Double, double, toil and trouble': DOU-ble DOU-ble TOIL and TROU-ble. Each foot falls from stressed to unstressed. Name this foot.",
        ["trochee", "trochaic"],
        "The trochee: stressed then unstressed, the reverse of the iamb. Four trochees make trochaic tetrameter.",
        "Its Greek name means 'running'.",
      ),
      numeric(
        "How many syllables are in Dickinson's 'That perches in the soul'?",
        6,
        "Six: that / per / ches / in / the / soul. Three iambs make iambic trimeter.",
        [
          "Tap once for each vowel sound.",
          "'Perches' has two syllables.",
          "Count the remaining one-syllable words and add them.",
        ],
      ),
      word(
        "A line has four iambic feet, as in 'And sings the tune without the words'. Name its metre: iambic what?",
        ["tetrameter"],
        "Iambic tetrameter: four iambs, eight syllables.",
        "The Greek prefix for four comes before '-meter'.",
      ),
    ],
    cards: [
      card(
        "How many syllables are in Milton's 'They also serve who only stand and waite'?",
        10,
        "Ten: they / al / so / serve / who / on / ly / stand / and / waite. A regular iambic pentameter line.",
      ),
      term(
        "Name the metrical foot with the pattern unstressed then stressed.",
        ["iamb", "iambic"],
        "The iamb, as in 'com-PARE'.",
      ),
    ],
  },
  {
    id: "sound-and-image",
    title: "Sound and image",
    summary:
      "Hear alliteration and assonance. Tell a metaphor from a simile and name the tenor and vehicle of a figure.",
    moduleId: "lang-poetry",
    sourceIds: [
      "lang-wp-alliteration",
      "lang-wp-assonance",
      "lang-wp-metaphor",
      "lang-pg-keats",
      "lang-pg-sonnets",
    ],
    beats: [
      beat(
        "Repeated consonants",
        "Alliteration repeats a consonant sound at the start of nearby words, usually on stressed syllables. Shakespeare's 'sessions of sweet silent thought' has three, and their hiss is the sound of quiet. Keats opens 'To Autumn' with 'mists and mellow', two m sounds that slow the line. Alliteration belongs to sound, not spelling: 'cider' and 'sorrow' alliterate, 'cider' and 'cat' do not.",
        [
          "Sonnet 30",
          passage(
            "Shakespeare, Sonnet 30, line 1",
            "sound",
            "When to the {alliteration:a sessions} of {alliteration:a sweet} {alliteration:a silent} thought",
          ),
        ],
        [
          "Keats",
          passage(
            "Keats, 'To Autumn', line 1",
            "sound",
            "Season of {alliteration:a mists} and {alliteration:a mellow} fruitfulness,",
          ),
        ],
      ),
      beat(
        "Repeated vowels",
        "Assonance repeats a vowel sound in nearby stressed syllables, whatever the consonants around it. In 'Thou still unravish'd bride of quietness' the long vowel of 'bride' returns in 'qui-', binding the urn's two names together, while 'still' and 'unravish'd' keep the short i. Shakespeare's 'new wail my dear time's waste' sounds the vowel of 'wail' again in 'waste'.",
        [
          "Keats",
          passage(
            "Keats, 'Ode on a Grecian Urn', line 1",
            "sound",
            "Thou still unravish'd {assonance:a bride} of {assonance:a qui}etness,",
          ),
        ],
        [
          "Sonnet 30",
          passage(
            "Shakespeare, Sonnet 30, line 4",
            "sound",
            "And with {assonance:b old} {assonance:b woes} new {assonance:a wail} my dear time's {assonance:a waste}:",
          ),
        ],
      ),
      beat(
        "Like, or is",
        "A simile compares openly, with 'like' or 'as': Burns's love is like a rose, and 'like' keeps the two apart. A metaphor identifies one thing with another: 'Juliet is the sun'. Romeo does not say she resembles the sun; he asserts it and then builds on the assertion, telling the 'fair sun' to 'kill the envious moon'. The metaphor makes a world in which its claim is true.",
        [
          "Burns",
          passage(
            "Burns, 'A Red, Red Rose'",
            "image",
            "O my Luve's {simile like a red, red rose},",
            "That's newly sprung in June;",
          ),
        ],
        [
          "Romeo",
          passage(
            "Shakespeare, Romeo and Juliet, 2.2",
            "image",
            "But soft, what light through yonder window breaks?",
            "It is the east, and {metaphor Juliet is the sun}!",
          ),
        ],
      ),
      beat(
        "Tenor and vehicle",
        "I. A. Richards called the subject of a metaphor its tenor and the borrowed image its vehicle. Dickinson's tenor is hope, and her vehicle is a bird she leaves unnamed at first, letting 'feathers' and 'perches' imply it until 'the little bird' of the second stanza. Wordsworth keeps his comparison explicit: 'I wandered lonely as a Cloud'. Naming tenor and vehicle lets you say exactly what a figure carries across.",
        [
          "Dickinson",
          passage(
            "Dickinson, 'Hope'",
            "image",
            "{metaphor Hope is the thing with feathers}",
            "That perches in the soul,",
          ),
        ],
        [
          "Wordsworth",
          passage(
            "Wordsworth, 'I wandered lonely as a Cloud'",
            "image",
            "I wandered lonely {simile as a Cloud}",
            "That floats on high o'er Vales and Hills,",
          ),
        ],
      ),
    ],
    questions: [
      numeric(
        "In 'When to the sessions of sweet silent thought', how many words begin with the s sound?",
        3,
        "Three: 'sessions', 'sweet' and 'silent'. The hushed s sounds suit a line about silent thought.",
        [
          "Read the line aloud and listen to how each word begins.",
          "Ignore s sounds in the middle or at the end of words.",
          "Check the nouns and adjectives one by one.",
        ],
      ),
      numeric(
        "In Keats's 'Thou still unravish'd bride of quietness', how many words contain the long vowel heard in 'bride'?",
        2,
        "Two: 'bride' and 'quietness' (qui-). 'Still' and 'unravish'd' have the short vowel of 'sit'.",
        [
          "Listen to vowel sounds rather than letters: 'still' has a short vowel.",
          "Say 'quietness' slowly: qui-et-ness.",
          "Count every word whose vowel matches the one in the model word, including that word itself.",
        ],
      ),
      word(
        "Burns: 'O my Luve's like a red, red rose.' The comparison is made with 'like'. Name the figure.",
        ["simile"],
        "A simile: an explicit comparison using 'like' or 'as'.",
        "The figure announces itself as a comparison; its name shares a root with 'similar'.",
      ),
      word(
        "In Dickinson's 'Hope is the thing with feathers / That perches in the soul', hope is pictured as a creature. Which creature is implied?",
        ["bird"],
        "A bird: the feathers, the perching and later the singing belong to it, and the second stanza names 'the little bird'.",
        "It has feathers and perches, and in the next lines it sings.",
      ),
      word(
        "Wordsworth: 'I wandered lonely as a Cloud.' Name the figure.",
        ["simile"],
        "A simile: 'as' makes the comparison between the speaker and the cloud explicit.",
        "Look for the word that announces a comparison.",
      ),
      choose(
        "Romeo: 'It is the east, and Juliet is the sun!' Which statement is accurate?",
        [
          "It is a metaphor: Juliet is identified with the sun",
          "It is a simile, because two things are compared",
          "It is alliteration on the s sound",
        ],
        0,
        "A metaphor: Romeo identifies Juliet with the sun rather than comparing her with 'like' or 'as'.",
        "Is there a 'like' or an 'as'?",
      ),
    ],
    cards: [
      card(
        "How many words in Keats's 'Season of mists and mellow fruitfulness' begin with the m sound?",
        2,
        "Two: 'mists' and 'mellow'.",
      ),
      term(
        "In I. A. Richards's terms, what is the subject a metaphor describes called, as opposed to its vehicle?",
        ["tenor"],
        "The tenor. In 'Juliet is the sun', Juliet is the tenor and the sun the vehicle.",
      ),
    ],
  },
  {
    id: "sonnet-and-volta",
    title: "The sonnet and its turn",
    summary:
      "Read a sonnet's rhyme scheme, tell the Shakespearean form from the Petrarchan, and find the volta where the argument turns.",
    moduleId: "lang-poetry",
    sourceIds: ["lang-wp-sonnet", "lang-wp-volta", "lang-pg-sonnets", "lang-pg-milton"],
    beats: [
      beat(
        "Three quatrains and a couplet",
        "Shakespeare's sonnets have fourteen lines of iambic pentameter in three quatrains and a closing couplet, rhyming ABAB CDCD EFEF GG. Each quatrain brings two new rhymes, so the poem moves through seven rhyme sounds and ends on a pair. In Sonnet 18 the quatrains test the comparison with summer, and the couplet answers it: 'So long lives this, and this gives life to thee.'",
        ["Sonnet 18", texts.sonnet18],
        ["Milton", texts.milton],
      ),
      beat(
        "Octave and sestet",
        "The Italian or Petrarchan sonnet divides into an octave of eight lines rhyming ABBAABBA and a sestet of six, often CDECDE. Two rhyme sounds carry the whole octave. That demands four rhymes on each sound, which Italian supplies easily and English does not. Milton's 'When I consider how my light is spent' keeps the pattern: spent, wide, hide, bent, present, chide, deny'd, prevent.",
        ["Milton", texts.milton],
        ["Sonnet 130", texts.sonnet130],
      ),
      beat(
        "The volta",
        "The volta is the turn: the point where a sonnet changes direction, from problem to answer or from complaint to consolation. In the Petrarchan sonnet it usually falls where the octave gives way to the sestet. Sonnet 29 turns at that point too: eight lines of envy and self-pity, then 'Yet in these thoughts', and the speaker's state rises 'like to the lark at break of day arising'.",
        ["Sonnet 29", texts.sonnet29],
        ["Sonnet 18", texts.sonnet18],
      ),
      beat(
        "Where the turn falls",
        "Shakespeare often delays the turn to the couplet. Sonnet 130 refuses every flattering comparison for three quatrains and turns only with 'And yet by heaven', claiming that his love is as rare as any woman 'belied with false compare'. Milton turns early, in the middle of line 8: 'But patience to prevent / That murmur, soon replies'. Where the turn falls decides how much of the poem argues and how much answers.",
        ["Sonnet 130", texts.sonnet130],
        ["Milton", texts.milton],
      ),
    ],
    questions: [
      numeric(
        "A Shakespearean sonnet rhymes ABAB CDCD EFEF GG. How many different rhyme sounds does that scheme use?",
        7,
        "Seven, A to G: three quatrains bring two new rhymes each, and the couplet adds one.",
        [
          "Each letter stands for one rhyme sound.",
          "List the letters without repeats.",
          "Count the distinct letters from A onward.",
        ],
      ),
      numeric(
        "Milton's sonnet on his blindness opens with an octave rhyming ABBAABBA. How many rhyme sounds does the octave use?",
        2,
        "Two: A (spent, bent, present, prevent) and B (wide, hide, chide, deny'd).",
        [
          "Each letter is one rhyme sound.",
          "Ignore repeats of a letter.",
          "Count the distinct letters in the octave's scheme.",
        ],
      ),
      numeric(
        "At which line does Sonnet 29 turn from despair to consolation?",
        9,
        "Line 9: 'Yet in these thoughts my self almost despising'. 'Yet' turns the poem after two quatrains of complaint.",
        [
          "Find the first word that changes the direction of the argument.",
          "Look at the opening of the third quatrain.",
          "Count the lines down to that word.",
        ],
      ),
      numeric(
        "Sonnet 130 spends its quatrains mocking conventional comparisons. At which line does it turn?",
        13,
        "Line 13: 'And yet by heaven, I think my love as rare'. The couplet carries the turn.",
        [
          "Find the words that reverse the poem's direction.",
          "Look where the closing couplet begins.",
          "Count the lines in the three quatrains, then add one.",
        ],
      ),
      word(
        "Milton turns inside line 8: 'I fondly ask; But patience to prevent / That murmur, soon replies'. Which personified quality answers the speaker?",
        ["patience"],
        "Patience: it interrupts the complaint and answers it in the sestet, ending 'They also serve who only stand and waite.'",
        "Read the words after 'But' in line 8.",
      ),
      choose(
        "How do a Shakespearean sonnet's final two lines usually work?",
        ["As a rhyming couplet (GG)", "As a tercet rhyming CDE", "As two unrhymed lines"],
        0,
        "A rhyming couplet, GG, often carrying the turn or the answer to the quatrains.",
        "The scheme ends with a repeated letter.",
      ),
    ],
    cards: [
      card(
        "How many lines are in the sestet of a Petrarchan sonnet?",
        6,
        "Six; the octave has eight.",
      ),
      term(
        "What is the Italian term for the turn in a sonnet's argument?",
        ["volta"],
        "The volta: the point where the argument changes direction.",
      ),
    ],
  },
];
