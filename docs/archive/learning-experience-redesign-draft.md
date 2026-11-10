# Discere Learning Experience Redesign — Draft

Status: **Draft pending visual-direction approval**  
Example subject used for mockups: **A brief history of the Roman Empire**  
Last updated: 17 August 2026

## 1. Why this redesign exists

The current prototype proves many individual systems, but its learner flow exposes too many of them in one long page. The lesson visual, explanation, tutoring mode, ChatGPT handoff, answer panel, transfer challenge, notebook, and sources appear as adjacent sections. Each component can work independently while the full sequence still feels like a collection of tools rather than a deliberately taught lesson.

The redesign should make the learner experience feel authored. At every moment, the interface should make four things obvious:

- what the learner is trying to understand
- what they should attend to now
- what action they should take next
- how the current activity contributes to durable knowledge

The product should remain broad enough to teach history, engineering, mathematics, science, English, philosophy, and other subjects. Subject-specific interactions should be rendered through a shared set of trusted activity types rather than arbitrary generated interface code.

## 2. Evidence informing the flow

The redesign should use the following findings as product constraints rather than decorative educational language.

### Active participation

The learner should do something meaningful during instruction instead of reading a long explanation and answering only at the end. Active learning is associated with improved performance compared with lecture-only instruction, and Brilliant explicitly prioritises visual representations, manipulation, pretesting, immediate custom feedback, and one concept per lesson.

Product implications:

- place a prediction, classification, ordering, interpretation, or short response inside each lesson segment
- make the interaction answer a real conceptual question
- avoid interaction whose only purpose is to unlock the next screen

Sources:

- Freeman et al., *Active learning increases student performance in science, engineering, and mathematics*: https://doi.org/10.1073/pnas.1319030111
- Brilliant, *About — Visual and interactive*: https://brilliant.org/about/

### Segmentation and cognitive load

Material should be divided into self-paced conceptual beats. Essential words should sit near the relevant visual. Unrelated decoration, duplicated explanation, and large walls of text should be removed.

Product implications:

- teach one conceptual relationship per stage
- keep each explainer segment short enough to read without losing the visual context
- use progressive disclosure for definitions, sources, side notes, and advanced detail
- keep the primary visual and its explanation within the same viewport where practical

Sources:

- Mayer, *Using multimedia for e-learning*: https://doi.org/10.1111/jcal.12197
- Spanjers et al., *Segmentation of Worked Examples*: https://doi.org/10.1002/acp.1832

### Worked guidance followed by independent application

Novices benefit from clear examples and reduced search demands before support is faded. Discere should show the structure of reasoning, then ask the learner to apply it to a nearby case.

Product implications:

- begin difficult activities with a model, annotated example, or partially completed response
- reduce hints as mastery grows
- distinguish guided success from independent success
- include a transfer task after correction or answer reveal

Sources:

- Chen, Retnowati, and Kalyuga, *Element interactivity as a factor influencing worked-example sequences*: https://doi.org/10.1111/bjep.12317
- van Gog, Paas, and van Merriënboer, *Process-Oriented Worked Examples*: https://doi.org/10.1023/B:TRUC.0000021810.70784.b0

### Timely, specific feedback

Feedback should respond to the learner's actual choice or reasoning. It should identify the useful next step without generic praise or judgemental language.

Product implications:

- show feedback immediately after low-stakes interactions
- say what was correct, what needs revision, and what evidence supports that judgement
- identify the first meaningful error rather than rewriting the entire solution
- avoid “Great job”, “Almost there”, and other automatic praise

Source:

- Shute, *Focus on Formative Feedback*: https://doi.org/10.3102/0034654307313795

### Retrieval, spacing, and mixed review

Knowledge should be recalled after time has passed. Flashcards and mastery checks should be connected to lesson concepts and learner evidence, not generated as an isolated pile of trivia.

Product implications:

- finish a lesson with a small retrieval check
- schedule later review outside the lesson
- include free recall, ordering, comparison, image interpretation, and concise explanation alongside flashcards
- mix related concepts when discrimination matters
- let mastery decrease when delayed performance shows forgetting

Sources:

- Carpenter, Pan, and Butler, *The science of effective learning with spacing and retrieval practice*: https://doi.org/10.1038/s44159-022-00089-1
- Roediger and Karpicke, *Test-Enhanced Learning*: https://doi.org/10.1111/j.1467-9280.2006.01693.x
- Firth, Rivers, and Boyle, *A systematic review of interleaving*: https://doi.org/10.1002/rev3.3266
- Khan Academy, *Mastery Challenges*: https://support.khanacademy.org/hc/en-us/articles/360037127892

### Self-explanation and writing

Short explanations and structured writing can expose whether the learner understands relationships between events, evidence, and claims. Long essays should be used deliberately and supported with planning tools.

Product implications:

- ask the learner to explain a relationship in their own words
- provide an argument planner before the essay editor
- keep sources and evidence accessible without crowding the writing space
- assess claim, evidence, reasoning, factual accuracy, and clarity separately
- treat automated essay grades as provisional when confidence is low

Sources:

- Chi et al., *Self-Explanations: How Students Study and Use Examples*: https://doi.org/10.1207/s15516709cog1302_1
- Bangert-Drowns, Hurley, and Wilkinson, *Writing-to-Learn Interventions*: https://doi.org/10.3102/00346543074001029

## 3. Product principles

1. **One dominant task per screen.** The learner should never face the explainer, tutor, quiz, notebook, essay editor, sources, and flashcards at equal visual priority.
2. **The visual carries meaning.** Maps, timelines, diagrams, graphs, artefacts, and manipulable models should answer a learning question.
3. **Explanation and action alternate.** A lesson should not contain a large reading block followed by a separate test block.
4. **Progress follows concepts.** A progress indicator should show the learner moving through ideas, not merely through pages.
5. **Assessment is varied.** Multiple choice is useful for some checks, but free response, sequencing, classification, diagram interpretation, calculation, and writing are equally important.
6. **Review is part of the course.** Flashcards and delayed retrieval belong in a due-review queue connected to mastery.
7. **Generated prose is edited prose.** Learner-facing text must pass the Discere writing-quality pipeline and preserve source claims.
8. **The interface remains mature.** Gamification can reward effort and retrieval without making every action look like a mobile-game economy.
9. **Sources are available without dominating.** Provenance should be one action away during learning and hidden during Exam mode.
10. **Accessibility is structural.** Keyboard operation, readable type, visible focus, reduced motion, descriptive alt text, and non-colour status cues are required.

## 4. Proposed lesson architecture

A standard lesson is a sequence of conceptual beats rather than one long document.

### Beat A — Orient and attempt

- state a concrete question
- show the visual context
- ask for a low-stakes prediction, interpretation, or prior-knowledge response
- do not grade mastery from this first attempt

### Beat B — Explain

- present a concise explanation focused on the attempted question
- annotate the relevant map, timeline, diagram, passage, or artefact
- expose definitions on demand
- keep detail layered rather than front-loaded

### Beat C — Interact

- let the learner manipulate, order, compare, classify, trace, or inspect
- give immediate specific feedback
- require the learner to notice the important relationship

### Beat D — Check understanding

- use an open response or short quiz
- allow mode-governed hints
- record assistance separately from independent evidence

### Beat E — Apply or transfer

- change the case, evidence, values, or perspective
- ask the learner to apply the same concept
- use reduced mastery evidence after an answer reveal

### Beat F — Explain in the learner's own words

- request a concise causal explanation, comparison, or teach-back
- use a small rubric
- identify unsupported claims and the first revision needed

### Beat G — Schedule review

- create due review items from reviewed lesson concepts
- include flashcards only where concise recall is appropriate
- also schedule timeline ordering, map recognition, comparison, and short explanation prompts

## 5. Course-level navigation

The course home should have three clear destinations:

- **Continue learning** — the next conceptual beat in the active course
- **Review due** — delayed retrieval selected from learned concepts
- **Explore course** — the concept map and optional navigation

XP, streak, and mastery can remain visible but should not compete with the current learning task. The interface should show mastery by concept and distinguish recent performance from retained performance.

## 6. Required learning surfaces

### Explainer surface

- one clear learning question
- 150–350 words per segment as a default range, adjusted for subject and level
- one primary visual or source excerpt
- definitions and supporting notes behind disclosure controls
- read-aloud control
- previous/next navigation
- embedded micro-check before moving on when pedagogically useful

### Visual or diagram surface

- full-width or dominant canvas
- labels placed next to the relevant object
- state changes tied to learner actions
- deterministic rendering for exact technical material
- retrieved or generated imagery with source and assurance status
- text alternative and keyboard-equivalent interaction

### Quiz surface

- one question at a time
- free response available wherever feasible
- progress that does not reveal question difficulty or answer pattern
- feedback after each formative question
- no feedback until submission in Exam mode
- end summary organised by concept and assistance level

### Essay studio

- prompt and success criteria
- evidence/source drawer
- optional claim and outline builder
- large uncluttered writing area
- word count and autosave
- rubric preview
- submission confirmation
- feedback by rubric dimension with cited excerpts from the learner's writing

### Review and flashcards

- due count and estimated session length
- one item at a time
- answer hidden until an actual recall attempt or explicit reveal
- confidence captured after answering, not before
- concise corrective feedback
- mixed review formats
- session summary showing remembered, difficult, and forgotten concepts

## 7. Roman Empire mockup lesson

### Lesson title

**The Roman Empire: expansion, stability, and division**

### Intended learning outcomes

The learner should be able to:

- place the beginning of Augustus's rule, Rome's greatest territorial extent, the third-century crisis, the administrative division, and the end of the Western Empire in chronological order
- explain how the empire changed between the Augustan settlement and the fifth century
- distinguish the fall of the Western Roman Empire from the continuation of the Eastern Roman Empire
- use timeline and map evidence to support a short historical argument

### Core explainer content

The Roman Empire conventionally begins with Augustus in 27 BCE, after civil wars transformed the republican system. During the first and second centuries, imperial rule became more stable and Roman territory expanded around the Mediterranean. The empire reached its greatest territorial extent under Trajan in 117 CE.

The empire later faced civil wars, economic disruption, epidemics, and pressure along its frontiers. Diocletian's reforms at the end of the third century divided imperial administration among several rulers. Constantine later reunited the empire and founded Constantinople as a major imperial centre.

The western and eastern courts became increasingly separate. In 476 CE, Romulus Augustulus was deposed in the west, a date often used for the end of the Western Roman Empire. Roman imperial government continued in the east from Constantinople for centuries.

### Diagram

An interactive combined timeline and territorial map with selectable milestones:

- 27 BCE — Augustus becomes the first emperor
- 117 CE — greatest territorial extent under Trajan
- 235–284 CE — third-century crisis
- 284 CE — Diocletian begins major administrative reforms
- 330 CE — Constantinople dedicated
- 395 CE — eastern and western courts become permanently separate after Theodosius I
- 476 CE — Romulus Augustulus deposed in the west

### Quiz examples

- Arrange four major turning points in chronological order.
- Select the statement that correctly distinguishes the Western and Eastern Empires after 476 CE.
- In two sentences, explain why 476 CE is useful as a historical marker but does not represent the disappearance of Roman government everywhere.

### Essay prompt

**Which mattered more to the transformation of the Roman Empire: its territorial scale or its repeated political conflicts?**

The learner should make a defensible claim, use at least three pieces of lesson evidence, acknowledge one complication, and explain why the evidence supports the claim.

### Flashcard and review examples

- Front: When did Augustus begin ruling as Rome's first emperor?  
  Back: 27 BCE.
- Front: What happened under Trajan in 117 CE?  
  Back: The Roman Empire reached its greatest territorial extent.
- Front: Why is 476 CE an incomplete date for “the fall of Rome”?  
  Back: It marks the deposition of the last western emperor traditionally counted in Rome, while Roman imperial government continued in the east.
- Timeline task: Place Augustus, Trajan's maximum extent, Diocletian, Constantinople, and the western deposition in order.
- Short explanation: Give one administrative response to the difficulty of governing the empire's scale.

Example historical source used for the mockup content:

- World History Encyclopedia, *Roman Empire*: https://www.worldhistory.org/Roman_Empire/

## 8. Five visual directions for approval

### Option 1 — Guided Chronicle

A calm, editorial, stage-based lesson. One conceptual beat occupies the centre of the screen. A slim chapter rail shows the learner's place. The primary visual sits beside or immediately beneath the explanation. Quiz, essay, and review open as dedicated stages rather than page sections.

Strengths:

- clearest reading and teaching sequence
- easiest to keep cognitively focused
- broadly reusable across subjects
- comparatively straightforward to implement

Risk:

- can feel slow to learners who want to skim freely

### Option 2 — Historical Atlas

A persistent timeline and map form the main workspace. Selecting a year, region, ruler, or event changes the explanation and available activity. Quiz questions can ask the learner to locate, sequence, or compare directly on the visual. Essay evidence can be pinned from the atlas into an outline.

Strengths:

- strong fit for history, geography, politics, and systems
- visual relationships remain visible during explanation
- supports discovery and comparison

Risk:

- higher implementation cost
- requires a graceful alternative for subjects without spatial or temporal models

### Option 3 — Interactive Story

A Brilliant-inspired sequence where the learner encounters a question before each explanation. The screen is dominated by one interactive visual, decision, or ordering task. Feedback transforms the visual and introduces the next short piece of instruction.

Strengths:

- strongest active-learning rhythm
- memorable and engaging when the interaction is well designed
- naturally avoids long text blocks

Risk:

- requires high-quality authored interactions
- weak generated interactions would quickly feel gimmicky

### Option 4 — Scholar's Desk

A two-pane workspace for deeper study. The left pane holds the lesson narrative and visual. The right pane holds notes, evidence, definitions, and the current question. Learn, Practice, Write, and Review are separate modes within the same desk.

Strengths:

- excellent for history, philosophy, English, and source-based work
- essay writing can keep evidence visible
- suits serious self-directed study

Risk:

- can resemble a productivity application if spacing and hierarchy are weak
- needs careful responsive behaviour on narrow screens

### Option 5 — Museum Journey

An artefact-first visual journey. Each lesson beat is presented like a curated gallery stop, using maps, coins, inscriptions, buildings, portraits, and concise interpretation. Quizzes focus on reading evidence. Essay writing becomes a curator's argument assembled from selected exhibits. Flashcards resemble clean catalogue entries rather than novelty game cards.

Strengths:

- aesthetically distinctive
- makes source evidence central
- naturally supports history and visual humanities

Risk:

- depends on strong image sourcing and licensing
- needs abstraction to work equally well for technical subjects

## 9. Approval rubric

The selected direction should be judged against:

- clarity of the next learning action
- readability and information density
- quality of visual explanation
- ability to alternate explanation and participation
- suitability for quiz, essay, and review modes
- mature aesthetic and restrained gamification
- keyboard and narrow-screen adaptability
- implementation cost
- ability to generalise across subjects

The final design may combine one primary direction with selected elements from another. A hybrid should still have a single dominant interaction model.

## 10. Specification work after approval

Once a visual direction is approved, this draft will be expanded with:

- screen-by-screen interaction specifications
- desktop, tablet, and mobile layouts
- component hierarchy
- navigation state machine
- lesson-beat JSON contracts
- visual and image states
- quiz state and feedback rules
- essay autosave, evidence, rubric, and submission contracts
- spaced-review and flashcard session contracts
- gamification placement and limits
- accessibility acceptance criteria
- animation and reduced-motion behaviour
- migration plan from the existing long lesson page
- test plan and staged implementation backlog

## 11. Immediate implementation constraint

Do not redesign the current React interface until a visual direction is approved. The next code change should begin by separating the learner flow into routable lesson stages and defining stable content contracts, then implement the approved visual system against those boundaries.
