import {
  arc,
  beat,
  card,
  choose,
  irony,
  numeric,
  passage,
  term,
  word,
  type TeachingLesson,
} from "./definition.js";

export const romeoActs = arc("Romeo and Juliet by act, after Freytag", [
  ["Act 1: the feud, the feast", 3, "-", "+"],
  ["Act 2: the garden, the wedding", 6, "+", "+"],
  ["Act 3: Tybalt dies; the wedding night", 10, "+", "-"],
  ["Act 4: the Friar's potion", 6, "-", "+"],
  ["Act 5: the tomb", 1, "+", "-"],
]);
export const romeoScenes = arc("Romeo and Juliet, eight scenes", [
  ["1.5 The feast", 3, "-", "+"],
  ["2.2 The balcony", 5, "+", "+"],
  ["2.6 The wedding", 6, "+", "+"],
  ["3.1 Tybalt killed", 8, "+", "-"],
  ["3.5 The parting", 10, "+", "-"],
  ["4.1 The Friar's plan", 6, "-", "+"],
  ["5.1 News in Mantua", 3, "+", "-"],
  ["5.3 The tomb", 1, "-", "-"],
]);
export const heist = arc("A heist in six scenes", [
  ["The plan", 2, "-", "+"],
  ["The crew", 4, "+", "+"],
  ["Inside the vault", 7, "+", "+"],
  ["The alarm", 10, "+", "-"],
  ["The chase", 6, "-", "-"],
  ["The split", 3, "-", "+"],
]);

const emmaMiserable =
  "The hair was curled, and the maid sent away, and Emma sat down to think and be miserable.";

export const proseLessons: TeachingLesson[] = [
  {
    id: "point-of-view",
    title: "Who sees and who speaks",
    summary:
      "Distinguish first- from third-person narration and hear an omniscient narrator's irony. Recognise free indirect discourse in Austen.",
    moduleId: "lang-prose",
    sourceIds: ["lang-os-point-of-view", "lang-wp-free-indirect", "lang-pg-emma", "lang-pg-pride"],
    beats: [
      beat(
        "First person and third",
        "Grammatical person tells you where the narrator stands. A first-person narrator is a character who says 'I', as Poe's does: 'why will you say that I am mad?' A third-person narrator stands outside the story and calls the characters 'he' and 'she'. Emma opens in the third person, and the word 'seemed' already hints that this narrator knows more than Emma does.",
        [
          "Austen, Emma",
          passage(
            "Austen, Emma, chapter 1",
            "narration",
            "{narration Emma Woodhouse, handsome, clever, and rich, with a comfortable home and happy disposition, seemed to unite some of the best blessings of existence;}",
          ),
        ],
        [
          "Poe",
          passage(
            "Poe, 'The Tell-Tale Heart'",
            "narration",
            "{narration True!—nervous—very, very dreadfully nervous I had been and am; but why will you say that I am mad?}",
          ),
        ],
      ),
      beat(
        "A narrator who knows more",
        "An omniscient narrator can generalise beyond any one mind. Pride and Prejudice opens with a 'truth universally acknowledged' and reveals in the next paragraph whose truth it is: the 'surrounding families', who regard a rich newcomer as 'the rightful property' of their daughters. The narrator borrows the neighbourhood's voice in order to expose it, and the wanting runs the other way from what the sentence claims.",
        [
          "The opening",
          passage(
            "Austen, Pride and Prejudice, chapter 1",
            "narration",
            "{irony It is a truth universally acknowledged,} that a single man in possession of a good fortune must be in want of a wife.",
          ),
        ],
        [
          "The next paragraph",
          passage(
            "Austen, Pride and Prejudice, chapter 1",
            "narration",
            "this truth is so well fixed in the minds of the surrounding families, that he is considered as {irony the rightful property} of some one or other of their daughters.",
          ),
        ],
      ),
      beat(
        "Free indirect discourse",
        "Free indirect discourse renders a character's thought in the narrator's grammar, third person and past tense, while keeping the character's idiom and feeling. 'It was a wretched business indeed!' is Emma's exclamation, not the narrator's verdict: 'indeed' and the exclamation mark are hers. Austen moves in and out of Emma's mind without signalling the shift, so readers share her mistakes before they recognise them as mistakes.",
        [
          "After the proposal",
          passage(
            "Austen, Emma, chapter 16",
            "narration",
            "{narration " + emmaMiserable + "}",
            "{free_indirect It was a wretched business indeed!}",
            "{free_indirect Such a blow for Harriet!}",
          ),
        ],
        [
          "Speech and thought",
          passage(
            "Austen, Emma, chapter 16",
            "narration",
            "{direct_speech “If I had not persuaded Harriet into liking the man, I could have borne any thing.”}",
            "{free_indirect How she could have been so deceived!}",
          ),
        ],
      ),
      beat(
        "Sorting the three modes",
        "Two questions sort the modes: who is speaking, and whose words are these? Quotation marks and 'I' mark direct speech. Actions reported from outside, such as 'the maid sent away', are narration. A third-person sentence that carries the character's own exclamation, question or idiom, such as 'How she could have been so deceived!', is free indirect discourse.",
        [
          "Three sentences",
          passage(
            "Austen, Emma, chapter 16",
            "narration",
            "{direct_speech (1) “If I had not persuaded Harriet into liking the man, I could have borne any thing.”}",
            "{narration (2) " + emmaMiserable + "}",
            "{free_indirect (3) How she could have been so deceived!}",
          ),
        ],
        [
          "Emma's verdict",
          passage(
            "Austen, Emma, chapter 16",
            "narration",
            "{free_indirect Such an overthrow of every thing she had been wishing for!}",
            "{narration She looked back as well as she could;} {free_indirect but it was all confusion.}",
          ),
        ],
      ),
    ],
    questions: [
      word(
        "Austen opens Emma: 'Emma Woodhouse … seemed to unite some of the best blessings of existence.' In which grammatical person is this narration?",
        ["third"],
        "Third person: the narrator names Emma and refers to her as 'she', standing outside the story.",
        "Does the narrator say 'I', or describe Emma from outside?",
      ),
      choose(
        "Whose view does 'It is a truth universally acknowledged, that a single man in possession of a good fortune must be in want of a wife' express?",
        [
          "The narrator, voicing a neighbourhood's assumption with irony",
          "Mr Bennet, speaking to his wife",
          "Elizabeth Bennet, in her private thoughts",
        ],
        0,
        "The narrator states the assumption as if it were universal; the next paragraph shows it belongs to families with daughters to marry.",
        "No character has yet appeared when the sentence is spoken.",
      ),
      word(
        "After Mr Elton's proposal Austen writes: 'Emma sat down to think and be miserable. It was a wretched business indeed!' The second sentence is Emma's own exclamation, in the third person and past tense, with no 'she thought' and no quotation marks. What is this technique called?",
        ["free indirect"],
        "Free indirect discourse, also called free indirect style or speech: the narrator's grammar carries the character's voice.",
        "Compare it with 'She thought that it was a wretched business'. Which part has been dropped, and what does that make the reported thought?",
      ),
      numeric(
        "(1) “If I had not persuaded Harriet into liking the man, I could have borne any thing.” (2) … Emma sat down to think and be miserable. (3) How she could have been so deceived! Give the number of the sentence that is free indirect discourse.",
        3,
        "Sentence 3: Emma's exclamation in the third person and past tense, with no reporting verb. Sentence 1 is direct speech; sentence 2 is narration.",
        [
          "Direct speech sits inside quotation marks.",
          "Plain narration reports actions from outside.",
          "Look for a character's exclamation in the third person.",
        ],
      ),
      word(
        "Turn the direct thought 'I have been a fool' into free indirect discourse about Emma. Which pronoun replaces 'I'?",
        ["she"],
        "'She had been a fool!' The person shifts to the third and the tense moves back, but the exclamation stays Emma's.",
        "Free indirect discourse uses the narrator's grammatical person, not the character's.",
      ),
      choose(
        "Which feature most reliably marks free indirect discourse?",
        [
          "A character's own exclamations and idiom in third-person past tense, with no reporting verb",
          "Quotation marks around a character's words",
          "A first-person narrator addressing the reader",
        ],
        0,
        "Free indirect discourse keeps the narrator's person and tense but drops the reporting verb, so the character's idiom enters the narration directly.",
        "Think about what is missing compared with 'she thought that'.",
      ),
    ],
    cards: [
      term(
        "In which grammatical person does a narrator write who is also a character and says 'I'?",
        ["first"],
        "First person: the narrator is inside the story and says 'I'.",
      ),
      term(
        "What does free indirect discourse leave out that indirect speech such as 'she thought that it was hopeless' includes?",
        ["reporting verb", "reporting clause", "she thought"],
        "The reporting verb (the reporting clause 'she thought that').",
      ),
    ],
  },
  {
    id: "irony-and-reliability",
    title: "Irony and unreliable narrators",
    summary:
      "Tell verbal, dramatic and situational irony apart, and read past a narrator whose account gives itself away.",
    moduleId: "lang-prose",
    sourceIds: [
      "lang-wp-irony",
      "lang-wp-unreliable",
      "lang-pg-caesar",
      "lang-pg-romeo",
      "lang-pg-poe",
    ],
    beats: [
      beat(
        "Saying the opposite",
        "Verbal irony says one thing and means another, and the audience must be able to hear the gap. Antony calls Brutus 'an honourable man' four times in these lines, each time after evidence that Caesar was not ambitious: the captives' ransoms, the refused crown. By the last repetition the word has turned against Brutus, and the crowd has done the turning.",
        [
          "Antony's refrain",
          passage(
            "Shakespeare, Julius Caesar, 3.2 (selected lines)",
            "irony",
            "For Brutus is {irony:a an honourable man},",
            "So are they all, all honourable men,",
            "But Brutus says he was ambitious,",
            "And Brutus is {irony:a an honourable man}.",
            "Yet Brutus says he was ambitious;",
            "And Brutus is {irony:a an honourable man}.",
            "Yet Brutus says he was ambitious;",
            "And sure he is {irony:a an honourable man}.",
          ),
        ],
        [
          "What is said and meant",
          irony(
            "Julius Caesar, 3.2",
            "Mark Antony",
            "For Brutus is an honourable man.",
            "Brutus is honourable, and so his charge that Caesar was ambitious must be true.",
            "Brutus helped kill Caesar, and each repetition invites the crowd to doubt the word.",
          ),
        ],
      ),
      beat(
        "The audience knows",
        "Dramatic irony depends on unequal knowledge. Romeo marvels that death 'hath had no power yet upon thy beauty', and the audience knows why: Juliet is not dead. Every line he speaks means more to us than to him. Duncan's praise of Macbeth's home, 'This castle hath a pleasant seat', works the same way, spoken by a king the audience knows will be murdered inside it.",
        [
          "Romeo in the tomb",
          irony(
            "Romeo and Juliet, 5.3",
            "Romeo",
            "Death that hath suck\u2019d the honey of thy breath, / Hath had no power yet upon thy beauty.",
            "Juliet is dead, and her beauty is death's strange mercy.",
            "Juliet has taken the Friar's sleeping potion and is about to wake.",
          ),
        ],
        [
          "Duncan arrives",
          irony(
            "Macbeth, 1.6",
            "Duncan",
            "This castle hath a pleasant seat.",
            "The castle is a welcoming place to rest.",
            "Macbeth and Lady Macbeth have resolved to murder Duncan there that night.",
          ),
        ],
      ),
      beat(
        "When events turn",
        "Situational irony lies in events: an outcome reverses the intention or expectation that produced it. Romeo steps in to make peace and so gives Tybalt his opening, and his reply to the dying Mercutio, 'I thought all for the best', names the gap between purpose and result. Situational irony needs no speaker and no hidden knowledge, only an outcome that turns against its cause.",
        [
          "Mercutio's wound",
          irony(
            "Romeo and Juliet, 3.1",
            "Romeo",
            "I thought all for the best.",
            "Stepping between the fighters will stop the duel.",
            "Tybalt's thrust under Romeo's arm kills Mercutio: the peace-making makes the death possible.",
          ),
        ],
        [
          "Antony's refrain",
          irony(
            "Julius Caesar, 3.2",
            "Mark Antony",
            "And sure he is an honourable man.",
            "Brutus is honourable.",
            "Antony means the opposite, and the crowd hears it.",
          ),
        ],
      ),
      beat(
        "A narrator to distrust",
        "An unreliable narrator gives an account the reader learns to doubt, often from evidence inside the telling. Poe's narrator protests his calm in sentences broken by dashes and repetition, and he offers his acute hearing ('I heard many things in hell') as proof of sanity. The reader reads past him and assembles a second story from what he lets slip. Wayne Booth named the type in The Rhetoric of Fiction (1961).",
        [
          "Poe's opening",
          passage(
            "Poe, 'The Tell-Tale Heart'",
            "irony",
            "{irony True!—nervous—very, very dreadfully nervous I had been and am;} but why will you say that I am mad?",
            "I heard all things in the heaven and in the earth. I heard many things in hell. {irony How, then, am I mad?}",
          ),
        ],
        [
          "Poe's motive",
          passage(
            "Poe, 'The Tell-Tale Heart'",
            "irony",
            "Object there was none. Passion there was none. {irony I loved the old man.} He had never wronged me.",
          ),
        ],
      ),
    ],
    questions: [
      numeric(
        "In the eight lines shown from Antony's funeral speech, how many times is Brutus called 'an honourable man'?",
        4,
        "Four. Each repetition follows evidence against the charge of ambition, so the praise turns into accusation: verbal irony.",
        [
          "Look for the exact phrase with the singular 'man'.",
          "'All honourable men' refers to the conspirators as a group; leave it out.",
          "Count each line that applies the phrase to Brutus, including the one that calls him 'he'.",
        ],
      ),
      word(
        "Romeo, in the tomb, believes Juliet is dead; the audience knows she has taken a sleeping potion and will wake. What kind of irony arises when the audience knows what a character does not?",
        ["dramatic"],
        "Dramatic irony: the audience's knowledge exceeds the character's, so his words carry a meaning he cannot hear.",
        "It is named after the form in which it is most at home: plays.",
      ),
      word(
        "Romeo steps between Mercutio and Tybalt to stop the fight, and Tybalt's thrust under his arm kills Mercutio. The intervention causes the death it was meant to prevent. Which kind of irony is this?",
        ["situational"],
        "Situational irony: the outcome reverses the intention that produced it.",
        "The irony lies in how events turn out, not in what anyone says or knows.",
      ),
      word(
        "Poe's narrator insists he is sane while describing a murder in frantic, broken sentences. What term describes a narrator whose account readers have reason to distrust?",
        ["unreliable"],
        "An unreliable narrator: the telling itself, with its dashes and protests, gives evidence against what it claims.",
        "It is the opposite of a narrator whose word you can trust.",
      ),
      word(
        "Austen's narrator calls it 'a truth universally acknowledged' that a rich single man 'must be in want of a wife'; the novel shows it is the families who want the man. Which kind of irony does the sentence use: dramatic, situational or verbal?",
        ["verbal"],
        "Verbal irony: the statement says one thing and means its reverse.",
        "The irony lives in the wording of a statement.",
      ),
      choose(
        "In a play, the audience has watched a character poison the wine. The host then raises a glass and toasts his guest's long life. Which kind of irony is at work?",
        ["Dramatic irony", "Situational irony", "Verbal irony"],
        0,
        "Dramatic irony: the audience knows about the poison and the host does not, so his toast means something he cannot hear.",
        "Ask who knows about the poison.",
      ),
    ],
    cards: [
      term(
        "Which kind of irony occurs when a speaker says the opposite of what is meant?",
        ["verbal"],
        "Verbal irony: the words say one thing and mean another.",
      ),
      term(
        "Which kind of irony arises when an outcome reverses the intention that produced it?",
        ["situational"],
        "Situational irony: events turn against the purpose that set them going.",
      ),
    ],
  },
  {
    id: "structure-and-scenes",
    title: "Structure: arcs and turning scenes",
    summary:
      "Map a play onto Freytag's pyramid, find its climax, and count the scenes that turn a value from hope to loss or back.",
    moduleId: "lang-prose",
    sourceIds: ["lang-pg-freytag", "lang-wp-structure", "lang-pg-romeo"],
    beats: [
      beat(
        "Freytag's pyramid",
        "Gustav Freytag's Die Technik des Dramas (1863) divides a five-act play into five parts: introduction, rise, climax, return or fall, catastrophe. In Romeo and Juliet he traces the rise through four stages (the masked ball, the garden, the wedding, Tybalt's death) and sets the climax in Act 3, from Juliet's 'Gallop apace, you fiery-footed steeds' to Romeo's farewell. Everything after that descends towards the tomb.",
        ["By act", romeoActs],
        ["By scene", romeoScenes],
      ),
      beat(
        "Exposition and the first impulse",
        "The opening part, which English critics usually call the exposition, sets out the world before the action starts. For Freytag that means an Italian city where swords are worn and quarrels flare; the heads of the two houses; a prince who keeps the peace with difficulty. It ends at what he calls the exciting moment, the impulse that starts the action: Romeo and his friends deciding to go to the Capulet feast.",
        ["By act", romeoActs],
        ["A heist", heist],
      ),
      beat(
        "Scenes that turn",
        "A play turns scene by scene as well as act by act. Give each scene a value for the protagonists, hope or loss, at its start and its end. A scene that changes the value turns; one that does not builds or confirms. On this reading of Romeo and Juliet the turns cluster after the wedding: Tybalt's death, the parting, the potion, the false news in Mantua. The tomb opens in loss and stays there.",
        ["Romeo and Juliet", romeoScenes],
        ["A heist", heist],
      ),
      beat(
        "Find the climax",
        "Freytag's pyramid gives a quick test for any plot: find the highest point, where the protagonist's fortunes stop rising and start to fall. In this heist the alarm is the climax; the chase and the split are falling action, and the last scene works as the catastrophe or resolution. Comedies use the same shape with the ending reversed, rising again to a marriage or a reunion.",
        ["A heist", heist],
        ["Romeo and Juliet", romeoActs],
      ),
    ],
    questions: [
      numeric(
        "Romeo and Juliet has five acts. In which act does Freytag place its climax, the high point after which the action turns against the lovers?",
        3,
        "Act 3. Freytag treats Tybalt's death as the end of the rise and the scene group from 'Gallop apace' to Romeo's farewell as the climax.",
        [
          "Freytag's pyramid puts the climax in the middle of a five-act play.",
          "Find the act in which Romeo kills Tybalt and the lovers part.",
          "Count the acts up to that point.",
        ],
      ),
      word(
        "Name the part of Freytag's pyramid that introduces the place, the time and the people before the conflict begins.",
        ["exposition", "introduction"],
        "The exposition, Freytag's 'Einleitung' or introduction.",
        "It comes first and explains the situation.",
      ),
      numeric(
        "The diagram gives eight scenes of Romeo and Juliet, each opening and closing with a value for the lovers, + or −. A scene turns when its closing value differs from its opening value. How many of the eight scenes turn?",
        5,
        "Five: 1.5, 3.1, 3.5, 4.1 and 5.1. The balcony, the wedding and the tomb hold their value.",
        [
          "Read each scene's opening and closing sign.",
          "A scene that opens + and closes + does not turn.",
          "Count the scenes whose two signs differ.",
        ],
      ),
      numeric(
        "The diagram plots how high the action has climbed in each of six numbered scenes of a heist story. Which scene is the climax?",
        4,
        "Scene 4, the alarm: the action peaks there and every later scene descends.",
        [
          "Freytag's climax is the highest point of the pyramid.",
          "Compare the heights of the scene markers.",
          "Give the scene's number, counting from the left.",
        ],
      ),
      word(
        "In Freytag's scheme, what is the final part of a tragedy, in which the hero falls, called?",
        ["catastrophe", "denouement"],
        "The catastrophe, Freytag's 'Katastrophe'; in other plots the same position is called the denouement or resolution.",
        "The Greek word means an overturning.",
      ),
      choose(
        "Romeo is banished at the end of 3.1, and Juliet takes the Friar's potion in Act 4. Where do these events sit on Freytag's pyramid?",
        ["Falling action", "Rising action", "Exposition"],
        0,
        "Falling action: after the climax, events carry the lovers down towards the catastrophe.",
        "Do they come before or after the climax?",
      ),
    ],
    cards: [
      card(
        "A story's five scenes run: + to +, + to −, − to −, − to +, + to +. How many scenes turn?",
        2,
        "Two: the second (+ to −) and the fourth (− to +).",
      ),
      term(
        "Name the part of Freytag's pyramid between the climax and the catastrophe.",
        ["falling", "return", "fall"],
        "The falling action, which Freytag calls the return or fall.",
      ),
    ],
  },
];
