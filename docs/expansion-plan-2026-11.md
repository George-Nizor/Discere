# Expansion plan, November 2026

Status: written and released, 3 November 2026 (Discere 1.4.0 to 1.9.0). Approved 3 November 2026. George kept every course in A to D, and from E only First aid,
using freely available Red Cross materials. Chess is covered by another app. The card pass
(section 1) is deferred to after the first expansion wave. Curricula are researched in
`docs/curricula/`.

## 0. Release 1.3.0 first, so George can test in Instrumenta

Instrumenta installs whatever the `release` workflow publishes when a `v<version>` tag is pushed.
That workflow builds, packages, smoke-tests and publishes; it does not run the unit test suite.
`main` is still 1.2.0, and every change from this session is on `claude/brave-feynman-dgj9g0`.

1. Bump `package.json` to **1.3.0** and record the release in `docs/implementation-status.md`.
   The release contains:
   - all twenty courses written from the curriculum;
   - hover terms, bold and italic in lessons;
   - self-rated recall for explanation cards;
   - "Next lesson" buttons;
   - no eyebrow labels;
   - percentages accepted on probability answers.
2. Open a pull request from the branch into `main`. George merges it, or tells me to.
3. Tag `v1.3.0` on `main` and push the tag. Watch the release workflow and report the outcome.
4. George updates Discere in Instrumenta and plays a few lessons. This is the first time the
   rewritten lessons will be seen in the running app, so this step comes before more content.

## 1. Review-card pass (small, before or alongside the first expansion wave)

There are 464 cards and they were not rewritten. Most are fine as cards: short, exact and
answerable. Some share the old problems:

- clipped backs ("The first entry gives x = 7.");
- convoluted fronts;
- terms the new lessons no longer teach;
- a few known errors (Milton's "waite").

The pass: one Sonnet agent per course checks every card against that course's new lessons.

- It rewrites backs as one clear sentence that gives the reason.
- It fixes or replaces cards whose terms the lessons no longer teach.
- It keeps card ids, so review history stays intact.
- It keeps every numeric and naming answer, and the `recall: "self"` flags.

The same checks as the lessons apply: validation, reused-answer check, review rebind. It ships as
1.3.1.

## 2. Where the new courses come from

**roadmap.sh.** The repository's licence allows personal use only and forbids republishing its
content in any form. Roadmaps are therefore used only as a topic checklist: which topics a role
needs. Lessons are written from primary and openly licensed sources (official documentation,
OpenStax, MDN under CC BY-SA, OWASP, Kubernetes docs under CC BY, the Python docs and so on). No
roadmap text is copied into this repository.

**Notion, Life HQ → Learning.** 63 tracks. The Architecture course pack lists the roadmap.sh
entry points George already uses:

- System Design
- Software Design and Architecture
- AI Agents
- AI Engineer
- Vibe Coding
- API Design
- DevOps
- DevSecOps
- MLOps
- Game Developer
- Backend
- Cyber Security

**Excluded, as George asked:** tool courses, meaning Blender, FreeCAD, KiCad, Aseprite and the
Godot editor. Also excluded:

- vendor certifications (DP-700, AWS Solutions Architect), whose concepts go into vendor-neutral
  courses instead;
- external courses that live on their own platforms (Claude Academy, Boot.dev, AWS generative AI);
- framework-specific roadmaps (React, Vue, Angular, Next.js, Spring Boot, Django, Laravel, Rails,
  ASP.NET, WordPress, Flutter, Android and iOS).

## 3. Proposed course list (for George to cut before anything starts)

The twenty existing courses stay. A star (\*) extends an existing course rather than standing
alone.

### A. Software and systems (roadmap.sh, plus the Architecture, AI, Data and Cloud lanes)

| # | Course | Draws on |
| --- | --- | --- |
| A1 | Data structures and algorithms\* | roadmap Computer Science, DSA; CS Basics |
| A2 | How computers and networks work | Notion "Computing & networking foundations"; roadmap CS, Linux |
| A3 | Linux and the command line | roadmap Linux, Shell/Bash |
| A4 | Git and version control | roadmap Git and GitHub |
| A5 | The web: HTML, CSS and JavaScript | roadmap Frontend, HTML, CSS, JavaScript |
| A6 | TypeScript and Node.js | roadmap TypeScript, Node.js |
| A7 | Backend development and API design | roadmap Backend, API Design |
| A8 | Databases and data modelling\* | roadmap PostgreSQL, MongoDB, Redis; Notion "SQL & data modelling" |
| A9 | System design | roadmap System Design; Notion track |
| A10 | Software design and architecture | roadmap Software Design & Architecture, Software Architect; Notion 60-module Architecture course |
| A11 | DevOps and delivery: CI/CD, containers, Kubernetes, infrastructure as code | roadmap DevOps, Docker, Kubernetes, Terraform; Notion DevSecOps |
| A12 | Cloud fundamentals (vendor-neutral, AWS as the worked example) | roadmap AWS, Cloudflare; Notion cloud lane |
| A13 | Cybersecurity | roadmap Cyber Security, DevSecOps; Notion track |
| A14 | Data engineering: pipelines, warehouses, lakehouses | roadmap Data Engineer; Notion lane (DP-700 concepts) |
| A15 | Analytics engineering and data governance | Notion track; roadmap Data Analyst, BI Analyst |
| A16 | Machine learning, from models to MLOps | roadmap AI and Data Scientist, MLOps |
| A17 | AI engineering: LLMs, prompting, RAG and evaluation | roadmap AI Engineer, Prompt Engineering |
| A18 | AI agents and agent architecture | roadmap AI Agents; Notion track and Architecture labs |
| A19 | AI-assisted engineering and code review | roadmap Vibe Coding, Code Review; Notion track |
| A20 | UX and human–computer interaction | roadmap UX Design; Notion track |
| A21 | Game design and game programming patterns (engine-neutral) | roadmap Game Developer; Notion Game design |
| A22 | Systems programming: memory, operating systems, C and Rust\* | roadmap C++, Rust; Notion "Rust & lower-level" |
| A23 | Software testing and quality | roadmap QA |
| A24 | Technical writing | roadmap Technical Writer |

Optional, if wanted: Product management and Engineering management (roadmap.sh).

### B. Making and engineering (Notion "Making" lane, without the tool tracks)

| # | Course |
| --- | --- |
| B1 | Mechanisms and machine design\* (extends Engineering) |
| B2 | Materials and manufacturing |
| B3 | Control theory |
| B4 | Mechatronics and robotics, including microcontrollers\* (extends Electronics) |
| B5 | Industrial and product design |
| B6 | Small buildings and architectural design |

### C. Maths and science, second courses (Notion plus the existing backlog)

| # | Course |
| --- | --- |
| C1 | Statistical and causal inference (Notion "Experimental reasoning & causal inference") |
| C2 | Earth and environmental science |
| C3 | Physics II: waves, electricity and magnetism, thermodynamics |
| C4 | Trigonometry\* (Notion "Geometry & trigonometry"; Geometry has little trigonometry) |
| C5 | Calculus II: series and differential equations |

### D. Humanities, communication and creative theory

| # | Course |
| --- | --- |
| D1 | History |
| D2 | Linguistics |
| D3 | Decision theory |
| D4 | Reading and research |
| D5 | Writing longer pieces (Notion "Writing course") |
| D6 | Speaking, argument and debate |
| D7 | Creative and game writing |
| D8 | Music theory |
| D9 | Sound and audio fundamentals (concepts, not a tool) |
| D10 | Drawing and visual-art fundamentals (perspective, value, colour) |

### E. Sport and life skills: George to decide

These are physical skills. An app can teach the knowledge but not the practice:

- First aid
- Chess (a good fit, since boards are deterministic figures)
- Strength, conditioning and running (training principles)
- Brazilian jiu-jitsu (principles and positions)
- Shooting and outdoor skills
- Painting and miniature painting

Recommendation: include Chess and First aid. Leave the rest out, or make them short "principles"
courses.

That is roughly 45–50 new courses, which is far more than the twenty that exist today, so they
go in waves.

## 4. How a new course is made

The existing pipeline rewrites courses that already have lessons, figures and questions. A new
course needs these extra steps:

1. **Outline.** One page per course: objective, audience, prerequisites (linked to existing
   courses), 8–16 lessons with their concepts, skills and misconceptions, licensed sources, and
   the figure types each lesson needs. George approves outlines a wave at a time before any
   lesson is written.
2. **Scaffold.** Turn the outline into a bundle (course, modules, concepts, lesson stubs, sources)
   with the existing `pnpm author` tooling, extended for this.
3. **Author.** A Sonnet agent per course, using `docs/writing-calibration/authoring-brief.md`
   adapted for a course with no existing question pool. Voice A for technical courses, voice B
   for humanities.
4. **Check.** The same gates as the rewrite:
   - validation;
   - every answer recomputed;
   - facts written from memory listed and checked;
   - citations complete and the course publishable;
   - a course test that recomputes the keys;
   - a review record and a review page.
5. **Release.** One version per wave, so George can test each wave in Instrumenta.

**Platform work needed first, for wave 1:**

- **Figures for software topics.** Request traces, sequence diagrams, network paths and
  architecture boxes can be drawn with the existing `svg_figure`, so no new figure type is
  required at first.
- **Code practice.** Python, SQL and Rust can already run in the sandbox. JavaScript,
  TypeScript and shell courses would start with code-reading questions. Running JavaScript and
  shell code needs new sandboxed runners, which would be a separate decision (see ADR 0006 for
  Rust).

## 5. Proposed waves

Curricula for all 46 courses are in `docs/curricula/` (review page: `docs/curricula/index.html`).
The waves follow the prerequisites the curricula set, so no course is written before a course it
builds on.

| Wave | Courses | Why first |
| --- | --- | --- |
| 1 | A2 Computers and networks, A9 System design, A10 Software design and architecture, A16 Machine learning, A17 AI engineering, A18 AI agents | George's active lanes in Notion; AI agents builds on AI engineering, which builds on machine learning |
| 2 | A1 DSA, A3 Linux, A4 Git, A7 Backend and APIs, A8 Databases, A13 Cybersecurity | Foundations the later software courses lean on |
| 3 | A11 DevOps, A12 Cloud, A14 Data engineering, A15 Analytics engineering, A23 Testing | DevOps needs Linux and Git; analytics needs data engineering |
| 4 | A5 Web, A6 TypeScript and Node, A19 AI-assisted engineering, A20 UX, A21 Game design, A22 Systems programming, A24 Technical writing | AI-assisted engineering needs Git and Testing |
| 5 | B1–B6 Making | |
| 6 | C4 Trigonometry first, then C1, C2, C3 and C5 | Physics II and Calculus II use trigonometry |
| 7 | D1–D10 Humanities and creative | |
| 8 | E First aid | Needs its figures checked against current Red Cross and IFRC guidance before writing |

Each wave is about 5–7 courses, which means roughly 3–4 million Sonnet tokens plus checking. The
weekly usage limit was hit once during the rewrite, so a wave is about what one week allows.

**Before a wave is written:** every curriculum's sources were written from memory, because the
research session could not reach outside sites (a few data and web sources were read from their
GitHub repositories). The writer, or a session with those hosts allowed, opens each source, confirms
its licence, and checks the `unverified` list before any lesson cites it.
