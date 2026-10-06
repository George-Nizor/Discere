# English: Reading, Writing and Rhetoric

Published: 6 October 2026. Course ID: `english-reading-writing-and-rhetoric`, version 1.0.0.

Twelve connected lessons teach an adult reader to take sentences apart and rebuild them, to test
an argument, to scan verse and to read prose and drama the way a critic does. The course holds 72
lesson questions, 24 recall cards, twelve concepts and 48 answered visual beats with 96 authored
cases. Three course checks add 36 problems.

The audience is a fluent adult, not a school grammar class. Terms are defined when they first
appear, and every quoted text is in the public domain.

## Sequence and learning behaviour

| Module | Lessons |
| --- | --- |
| The sentence | Inside a clause; Joining two clauses; Actors and actions |
| Argument and rhetoric | Claim, grounds and warrant; Ethos, pathos, logos and kairos; Figures of repetition and balance |
| Reading poetry | Metre and scansion; Sound and image; The sonnet and its turn |
| Reading prose and drama | Who sees and who speaks; Irony and unreliable narrators; Structure: arcs and turning scenes |

Each lesson asks four question-first teaching beats, then two practice questions and two fresh
recall cards. Answers are marked exactly: 26 lesson questions are numeric (count the finite verbs,
the words a revision saves, the syllables in a line, the line of a volta, the number of the
statement that is the warrant); 34 take one word or a short phrase (name the device, the verb, the
person, the figure); 12 (17%) are multiple choice. Short written answers accept listed
equivalents (for example `antimetabole` for chiasmus) and the content test confirms that the
likeliest confusions (metaphor for simile, logos for ethos, `and` for `so`) are marked wrong.

The three course checks each cover all twelve lessons with a new text: placement (optional), a
mixed checkpoint after every lesson, and applications seven days later. Check problems are
numeric or authored choices, as the check schema requires.

## Explorer

One `language_explorer` with nine bounded model kinds, each drawn in the dark theme with a
serif reading face (KaTeX Main, already vendored with KaTeX; no CDN fonts):

| Kind | What the learner does | Revealed after answering |
| --- | --- | --- |
| `clauses` | Swap the mark joining two clauses (comma, semicolon, colon, dash, full stop, comma plus conjunction) and watch the sentence rebuild | Role colours and labels, verb-to-argument arcs, clause kinds, the edited-prose verdict for each mark |
| `voice` | Switch active, passive and actor-removed; the actor chip glides between subject and by-phrase | Word counts for each version |
| `compress` | Tap words to strike them; a meter counts what is left | The authored edit plays: struck words collapse, buried verbs replace their nouns |
| `toulmin` | Read numbered statements | Cards fly into Toulmin's layout with labelled arrows |
| `passage` | Tap words to mark what you notice | Appeals, figures, sound devices, images or narrative modes highlighted; chiasmus and antithesis drawn as arcs |
| `scansion` | Tap once per syllable on a counting pad | Syllables with stress marks and feet; a finite metronome pass lights each beat |
| `sonnet` | Tap a line to light every line that rhymes with it | Rhyme letters, quatrain or octave bands, the volta |
| `irony` | Hear the line as the speaker means it or as the audience hears it | Who knows more |
| `arc` | Walk the plot (finite playback) or scrub scene by scene; heights and +/− values are the givens | Freytag's phases, the climax and the scenes that turn |

Models hold the text and the reading the course adopts (roles, stresses, rhyme sounds, scene
values). Counts, metres, rhyme schemes, verdicts and climaxes are derived by
`packages/activity-engine/src/language.ts`. Before an answer the explorer shows none of the derived
layers; `[data-motion="reduced"]` and `prefers-reduced-motion` stop every animation and remove the
playback buttons while keeping the manual controls. The layouts were checked at 1440×900 and
390×844 in the live app.

## Sources and licences

Prose, examples, problems, drawings and the cover are original Discere work. Sources check facts:

| Source | Use | Licence |
| --- | --- | --- |
| OpenStax, Writing Guide with Handbook, Handbook H3, H4, H6, H9 and section 9.3 | Clauses, comma splices, semicolons, colons, dashes, voice, wordiness, point of view, the four appeals | CC BY-NC-SA 4.0 (licence page and book metadata checked on 6 October), reference only |
| Wikipedia: Stephen Toulmin; Modes of persuasion; Chiasmus; Anaphora; Antithesis; Isocolon; Iambic pentameter; Trochee; Alliteration; Assonance; Metaphor; Sonnet; Volta; Free indirect speech; Unreliable narrator; Irony; Story structure; English passive voice; Nominalization | Definitions and attributions (Toulmin 1958, Richards 1936, Booth 1961, Freytag 1863) | CC BY-SA 4.0, reference only |
| Project Gutenberg eBooks 23, 98, 158, 202, 1041, 1279, 1342, 1513, 1522, 1524, 1533, 1745, 2148, 8824, 12242, 23684, 50616 | Every quotation, checked against the transcription | Public domain; Gutenberg's licence header and trademark are not redistributed |
| Gettysburg Address, Bliss copy | Lincoln quotations, including the Bliss copy's dashes | Public domain |

The brief suggested the OpenStax Writing Guide as a CC BY 4.0 source. Its current licence is
CC BY-NC-SA 4.0, so it is recorded as reference only, like the Physics OpenStax book.

Two readings are the course's own and are labelled as such: the scansion of each line (metrical
stresses, with speech stress discussed in the prose) and the +/− values given to scenes of Romeo
and Juliet. Freytag's own placement of that play's climax (the scene group from "Gallop apace" to
Romeo's farewell, Act 3) was read in the German original.

## Verification

- `packages/curriculum/tests/language-content.test.ts` (42 tests): recomputes all 51 numeric keys
  (26 lesson questions, 7 recall cards, 18 check problems) from the texts and rules
  with its own word counter and hand-listed syllables; marks every written answer, alternative and
  example; checks one accepted option per choice; binds the shipped bundle to the review hash.
- `packages/activity-engine/tests/language.test.ts` (13 tests): joins and verdicts, voice, word
  counts, compression, scansion classes, rhyme schemes and forms, Freytag phases, schema refusals.
- `apps/web/src/journey/activities/LanguageDiagram.test.tsx` (7 tests): concealment before grading,
  keyboard case switching, tap-to-strike, finite beat playback, reduced motion, check visuals.
- `apps/web/e2e/language-course.spec.ts`: five staged browser scenarios modelled on Physics. Written
  but not run by the author (shared fixed ports); the lead runs e2e serially.

Accepted bundle SHA-256:
`b28231894a6c42ffd0d6430d7b949fe6038044f0ec6a2fed238fd4ead78b3c6e`.

Reviewed cover SHA-256:
`bfc8ffcf493ea32fbde742cfdaf5b2fa944041bbe647bd71734fc39b28c637b5`.

This is an editorial review by the authoring agent under delegated authority. There has been no
independent human subject review and no documented learner trial.

Representative captures (from the live dev stack):

- [Roadmap](screens/language/roadmap-1440.png)
- [Clause roles and arcs](screens/language/clause-anatomy-3-post-1440.png)
- [Comma splice verdict](screens/language/joining-clauses-1-post-1440.png)
- [Toulmin layout](screens/language/claim-grounds-warrant-4-post-1440.png)
- [Chiasmus](screens/language/figures-of-speech-3-post-1440.png)
- [Scansion](screens/language/metre-and-scansion-3-post-1440.png)
- [Sonnet volta](screens/language/sonnet-and-volta-3-post-1440.png)
- [Free indirect discourse](screens/language/point-of-view-3-post-1440.png)
- [Freytag arc on a phone](screens/language/structure-and-scenes-3-post-390.png)
- [Roadmap on a phone](screens/language/roadmap-390.png)
