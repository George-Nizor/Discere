# Discere
## ChatGPT-Native Learning Workspace Prototype — Complete Build Specification

**Version:** 0.1  
**Date:** 15 August 2026  
**Owner:** George  
**Intended implementer:** Luna coding model  
**Status:** Build-ready prototype specification  
**Primary environment:** ChatGPT Work on the web, using a personal developer-mode plugin  
**Working title:** Discere

---

# 0. Implementation mandate

Build a functioning personal learning application that runs as a ChatGPT-native plugin with:

1. A fullscreen React learning workspace rendered inside ChatGPT.
2. A local MCP server that owns curriculum data, progress, attempts, guardrail state, visual rendering, exports, and persistence.
3. A packaged learning skill that controls tutoring behaviour, output style, grading, question generation, accountability, and visual selection.
4. No OpenAI model API calls.
5. No browser automation or scraping of chatgpt.com.
6. No paid third-party services.
7. A local-first, single-user prototype that safely starts and stops and consumes no resources after shutdown.
8. An initial structured course in introductory electronics and circuits.
9. An experimental custom-topic path proving that the architecture can later support mathematics, engineering, physics, English, philosophy, computing, biology, chemistry, history, economics, and other subjects.

Do not replace this architecture with a standalone chatbot. The purpose of the plugin is to use the user’s existing ChatGPT Pro access while adding a purpose-built interface, durable state, deterministic checks, and structured learning workflows.

Do not silently omit a requested feature. When an exact capability cannot be completed because the ChatGPT host does not expose it, implement the fallback described in this specification and document the result in `docs/compatibility-report.md`.

Do not include placeholder buttons, fake analytics, fake content generation, or controls that do nothing.

---

# 1. Product summary

Discere is a personal learning workspace built around ChatGPT. ChatGPT supplies tutoring, reasoning, vision, web research, and conversational generation. The plugin supplies the product structure that a normal chat lacks:

- subject and course organisation
- lesson progression
- guided and direct-answer modes
- answer-reveal friction
- quizzes and free-response tests
- essay tasks and rubrics
- handwritten-work submission
- flashcards and spaced repetition
- deterministic validation for calculations
- retrieved and generated visuals
- progress and mastery tracking
- source records
- NotebookLM export packs
- consistent, human-sounding output rules

The prototype must feel like a coherent learning application rather than a collection of disconnected MCP tools.

## 1.1 Core architectural rule

Generative work happens through the ChatGPT conversation and the packaged Discere skill.

The MCP server must never call the OpenAI Responses API, Chat Completions API, Realtime API, image API, speech API, or embeddings API. The server may call free public information services such as Openverse, provided the request is disclosed and can be disabled.

## 1.2 Why this form is required

The product is intended to leverage the user’s ChatGPT Pro subscription. ChatGPT and OpenAI API billing are separate. Therefore:

- the plugin sends learning requests into the ChatGPT conversation
- ChatGPT reasons and generates the response
- the model calls Discere MCP tools to read or update state
- the fullscreen workspace renders authoritative server data
- deterministic local code handles calculations, timing, persistence, review scheduling, and visual rendering

---

# 2. Verified platform assumptions and constraints

Luna must perform a compatibility spike before building the full application. The following capabilities are expected from the current ChatGPT plugin/MCP Apps platform, but every one must be feature-detected and tested in the target account.

## 2.1 Expected capabilities

The target account should support:

- ChatGPT Developer Mode for Pro accounts on the web
- personal plugins backed by a remote or tunneled MCP server
- MCP streamable HTTP or supported tunnel connections
- an iframe-hosted plugin UI
- fullscreen display requests
- MCP tool calls from the component
- follow-up messages from the component into the ChatGPT conversation
- component-scoped state
- file upload from the component
- exposing uploaded image file IDs to the model through widget state
- opening approved external links

Expected host interfaces include the MCP Apps bridge and current ChatGPT compatibility extensions such as:

```ts
window.openai?.requestDisplayMode({ mode: "fullscreen" })
window.openai?.callTool(name, args)
window.openai?.sendFollowUpMessage({ prompt, scrollToBottom })
window.openai?.uploadFile(file, { library?: boolean })
window.openai?.setWidgetState({
  modelContent,
  privateContent,
  imageIds
})
window.openai?.openExternal({ href })
```

Prefer the standards-based MCP Apps bridge where an equivalent exists. Use `window.openai` only for ChatGPT-specific extensions or compatibility.

## 2.2 Host limitations to design around

The widget runs in an isolated iframe with a content security policy.

Do not assume access to:

- the full ChatGPT DOM
- conversation scraping
- browser automation
- the user’s ChatGPT authentication token
- arbitrary browser APIs
- clipboard access
- local filesystem paths
- a direct subscription-backed TTS endpoint
- direct invocation of NotebookLM’s consumer generation features
- durable cross-session state in `localStorage`
- access to generated image files inside the widget unless the host explicitly returns usable file IDs

Business state must live on the MCP server. Widget state is only for presentation and model-visible image references.

## 2.3 Connection approach

For the personal prototype, support these connection methods in this order:

1. **OpenAI Secure MCP Tunnel**, when available to the account.
2. **A temporary HTTPS development tunnel**, documented as a fallback.
3. **A deployed HTTPS endpoint**, only when the user chooses to deploy later.

The prototype must not require public marketplace submission.

Secure MCP Tunnel may require a Platform runtime API key for transport. It must not make model API calls. The README must clearly distinguish tunnel authentication from model API usage.

## 2.4 Compatibility spike gate

Before implementing the full product, create a minimal server and widget that verifies:

- [ ] `open_workspace` appears as a tool
- [ ] the tool returns the widget
- [ ] the widget can request fullscreen
- [ ] the widget can call another MCP tool
- [ ] the widget can send a follow-up message
- [ ] the follow-up causes the model to call a plugin tool
- [ ] a canvas PNG can be uploaded
- [ ] the uploaded file ID can be added to `imageIds`
- [ ] the model can inspect the uploaded image on the next turn
- [ ] widget state survives an ordinary rerender
- [ ] authoritative state survives closing and reopening the widget
- [ ] external links can be opened
- [ ] speech synthesis availability is known
- [ ] the selected tunnel or endpoint works reliably

Record every result in `docs/compatibility-report.md`.

Do not progress beyond the spike until the first ten items work. Speech synthesis may use the specified fallback.

---

# 3. Goals, non-goals, and definition of success

## 3.1 Product goals

The prototype must demonstrate that a ChatGPT-native application can:

1. Teach a structured curriculum.
2. Answer arbitrary learning questions.
3. guide the learner without immediately revealing answers.
4. reveal answers through explicit, modest friction when needed.
5. generate and administer quizzes.
6. assess written responses and workings.
7. accept a digital-notepad image for vision-based feedback.
8. keep progress, attempts, assistance use, and mastery separate.
9. produce flashcards and schedule reviews.
10. retrieve open reference images with attribution.
11. render exact diagrams without relying on image generation.
12. ask ChatGPT to generate an illustrative image when appropriate.
13. produce a source pack for NotebookLM.
14. read displayed text aloud when the host browser supports it.
15. maintain a deliberately human, plain, non-formulaic writing style.

## 3.2 Prototype subject

The curated prototype subject is:

> Foundations of Electronics and Circuits

This subject is selected because it tests conceptual tutoring, calculations, diagrams, troubleshooting, visual examples, physical workings, and practical exercises.

## 3.3 Experimental breadth

The home screen must also include an **Explore any topic** entry point.

This path may create a lightweight course plan for a user-supplied topic, but it must be visibly marked:

- `Structured` for bundled and validated courses
- `Generated` for model-created courses
- `Source-backed` only when sources are stored
- `Experimental` when deterministic validation is unavailable

Generated courses must use the same data schema as bundled courses so they can be promoted to curated courses later.

## 3.4 Non-goals for version 0.1

Do not build:

- a public multi-user SaaS
- payment or subscriptions
- social features
- classroom administration
- a marketplace
- native mobile applications
- an adversarial anti-cheat system
- automatic consumer NotebookLM control
- a standalone OpenAI API chatbot
- automatic ChatGPT voice-mode activation
- mains-voltage or high-energy electronics instruction
- a general symbolic mathematics engine beyond the included validators
- a complete curriculum for every subject
- user-authored plugin code execution
- arbitrary shell execution from model input

## 3.5 Definition of success

The prototype is successful when a user can:

1. Open Discere from a ChatGPT Work conversation.
2. enter fullscreen.
3. select the electronics course.
4. begin a lesson.
5. ask for an explanation.
6. receive a response in the workspace that passes the style linter.
7. answer a free-response calculation.
8. receive deterministic correctness and model-generated feedback.
9. request hints without seeing the final answer.
10. deliberately reveal the answer through the friction flow.
11. complete a transfer question after revealing.
12. draw workings on the notepad and receive image-based assessment.
13. run a quiz in Exam mode.
14. review flashcards.
15. search for an open reference image with attribution.
16. render an exact circuit diagram.
17. request an illustrative generated image through ChatGPT.
18. export the current unit as a NotebookLM pack.
19. close the app, stop the server, restart it, and retain progress.
20. shut all processes down with one command.

---

# 4. User experience principles

## 4.1 General feel

The interface should resemble a clean technical notebook and learning desk.

Use:

- a light default theme
- white or slightly warm-white background
- near-black text
- restrained grey dividers
- one functional accent colour
- generous spacing
- strong typography
- diagrams and learning content as the visual focus
- subtle progress indicators
- minimal animation

Avoid:

- card soup
- dashboards filled with boxes
- gradients
- glassmorphism
- oversized marketing headings
- decorative status panels
- repeated labels
- excessive icons
- circular containers around unrelated controls
- fake AI orb imagery
- dark mode as the default
- generic “AI assistant” language

## 4.2 Writing feel

The tutor should sound like a capable person who is concentrating on the learner’s actual problem.

It should:

- answer directly at the requested depth
- use concrete examples
- vary sentence and paragraph length naturally
- ask one useful question at a time in Coach mode
- acknowledge uncertainty plainly
- avoid automatic praise
- avoid rhetorical filler
- avoid artificial balance
- avoid forced three-item lists
- avoid negative parallelisms
- avoid em dashes
- avoid restating a conclusion several times
- avoid headings when a short paragraph is clearer
