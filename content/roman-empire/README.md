# The Rise of the Roman Empire

A three-lesson history course, written to prove that nothing in Discere's delivery path is
shaped around electronics. It uses the same bundle schema, the same writing gate, the same
answer authorities, and the same journey contract as the physics course.

## Lessons

1. **The rise of the Roman Empire** — the republic, its breakdown, and the settlement of
   27 BCE. Retrieved map of the empire at its greatest extent; timeline from 753 BCE to 117 CE.
2. **Expansion and the provinces** — conquest, governors, and the road network. Retrieved
   photograph of the Via Appia; timeline from 312 BCE to 117 CE. Essay on roads and
   administration.
3. **Life in the city, and what outlasted it** — public building, the extension of citizenship,
   and 476 CE. Retrieved photograph of the Colosseum; timeline from 80 CE to 476 CE. Essay on
   what survived.

## Inventory

| Item                   | Count |
| ---------------------- | ----- |
| Concepts               | 9     |
| Lessons                | 3     |
| Questions              | 13    |
| — multiple choice      | 4 (31%, limit 35%) |
| — numeric (dated year) | 3     |
| — short written        | 6     |
| Authored flashcards    | 8     |
| Essay topics           | 2     |
| Timeline activities    | 3     |
| Retrieved images       | 3     |
| Sources                | 9     |

## Dates used

Every date in this course is a standard one. Where a date is traditional rather than documented,
the prose says so.

| Year    | Event                                             |
| ------- | ------------------------------------------------- |
| 753 BCE | Traditional founding of Rome                      |
| 509 BCE | Republic established                              |
| 312 BCE | Via Appia begun                                   |
| 264 BCE | First Punic War begins                            |
| 146 BCE | Carthage destroyed                                |
| 58 BCE  | Campaigns in Gaul begin                           |
| 49 BCE  | Caesar crosses the Rubicon                        |
| 44 BCE  | Caesar assassinated                               |
| 31 BCE  | Battle of Actium                                  |
| 27 BCE  | Octavian receives the name Augustus               |
| 43 CE   | Invasion of Britain                               |
| 80 CE   | Colosseum inaugurated                             |
| 106 CE  | Dacia annexed                                     |
| 117 CE  | Greatest territorial extent, at Trajan's death    |
| 212 CE  | Antonine Constitution extends citizenship         |
| 330 CE  | Constantinople dedicated                          |
| 476 CE  | Romulus Augustulus deposed; no western successor  |

## Images

Three images retrieved from Wikimedia Commons by `scripts/retrieve-images.ts`, all under
licences that permit redistribution with attribution:

| File                             | Subject                        | Creator            | Licence       |
| -------------------------------- | ------------------------------ | ------------------ | ------------- |
| `roman-empire-extent-117ce.png`  | The empire in 117 CE           | Tataryn            | CC BY-SA 3.0  |
| `via-appia-roman-road.jpg`       | Paved Via Appia outside Rome   | Livioandronico2013 | CC BY-SA 4.0  |
| `colosseum-rome.jpg`             | The Colosseum from outside     | Diliff             | CC BY-SA 2.5  |

Full provenance, including the landing page, retrieval date, and a SHA-256 of the downloaded
bytes, is in `assets/provenance.json` and repeated on each lesson so the interface can print the
attribution beside the picture. Regenerate with:

```bash
npx tsx scripts/retrieve-images.ts roman-empire
```

## Generated material

Lesson 3 was drafted by the authoring pipeline and reviewed in
[`review/city-life-and-legacy.md`](review/city-life-and-legacy.md). The review found accepted
ideas written as whole sentences, which the validator refused to merge; they were shortened
before the merge succeeded, and the title and stage titles were put into the course's sentence
case. Lessons 1 and 2 were authored directly against the same gates.

## Sources

Historical claims cite the Wikipedia articles on the Roman Republic, Augustus, the Roman Empire,
Roman roads, and the fall of the western empire, together with OpenStax *World History Volume 1*.
Every source record carries its licence and access date.
