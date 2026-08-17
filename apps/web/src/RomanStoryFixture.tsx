import { useState } from "react";

type FixtureStage = "explainer" | "interactive_visual" | "quiz" | "essay" | "review";

const stages: Array<{ id: FixtureStage; label: string }> = [
  { id: "explainer", label: "Explainer" },
  { id: "interactive_visual", label: "Diagram / visual" },
  { id: "quiz", label: "Quiz / check" },
  { id: "essay", label: "Essay studio" },
  { id: "review", label: "Flashcards / review" },
];

const choices: Array<[string, string]> = [
  ["punic", "The Punic Wars"],
  ["caesar", "The assassination of Julius Caesar"],
  ["augustus", "The reign of Augustus"],
  ["carthage", "The fall of Carthage"],
];

const defaultStage = { id: "explainer" as FixtureStage, label: "Explainer" };

export function RomanStoryFixture() {
  const [index, setIndex] = useState(0);
  const [timeline, setTimeline] = useState(1);
  const [choice, setChoice] = useState("");
  const [shortResponse, setShortResponse] = useState("");
  const [essay, setEssay] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const stage = stages[index] ?? defaultStage;
  const canContinue = stage.id !== "quiz" || (choice === "augustus" && shortResponse.trim().length > 10);

  return (
    <div className="story-app roman-fixture">
      <aside className="story-rail" aria-label="Visual QA fixture navigation">
        <a className="story-mark" href="/" aria-label="Discere home">D</a>
        <nav>
          <a className="story-rail-link active" aria-label="Fixture" href="/qa/roman">◇</a>
          <a className="story-rail-link" aria-label="Courses" href="/courses">⌂</a>
        </nav>
        <span className="story-profile" role="img" aria-label="QA fixture">QA</span>
      </aside>

      <main className="story-main">
        <header className="story-header">
          <div>
            <span className="story-breadcrumb">Roman Empire visual QA</span>
            <p className="story-stage-label">{stage.label}</p>
          </div>
          <div className="story-progress">
            <span>{index + 1} / {stages.length}</span>
            <span className="story-progress-line"><i style={{ width: `${((index + 1) / stages.length) * 100}%` }} /></span>
          </div>
          <a className="story-exit" href="/">Exit fixture</a>
        </header>

        <section className="story-content">
          <div className="story-content-header">
            <p className="story-kicker">The Roman Empire: expansion, stability, and division</p>
            <h1>{stage.label}</h1>
          </div>

          {stage.id === "explainer" ? (
            <section className="story-explainer roman-explainer">
              <div className="story-explainer-copy">
                <div className="story-prose">
                  <p>Rome began as a small settlement on the Italian peninsula. After civil wars transformed the republican system, Augustus began ruling in 27 BCE as the first Roman emperor.</p>
                  <p>Imperial rule became more stable during the first and second centuries, and Roman territory expanded around the Mediterranean. Later rulers faced political conflict, pressure on frontiers, and the difficulty of governing a large empire.</p>
                </div>
                <aside className="story-takeaway">
                  <span aria-hidden="true">☆</span>
                  <div><strong>Key takeaway</strong><p>Roman imperial government changed over time and continued in the east after the western deposition in 476 CE.</p></div>
                </aside>
                <button className="story-primary" type="button" onClick={() => setIndex(1)}>Continue <span aria-hidden="true">→</span></button>
              </div>
              <figure className="story-explainer-visual">
                <div className="roman-date-card"><strong>27 BCE</strong><span>Augustus begins ruling as Rome's first emperor.</span></div>
                <figcaption>A concrete starting point for the story.</figcaption>
              </figure>
            </section>
          ) : null}

          {stage.id === "interactive_visual" ? (
            <section className="story-interactive roman-visual">
              <div className="story-interactive-heading">
                <div><p className="story-kicker">Deterministic fixture map</p><h2>Expansion of the Roman Empire</h2><p>Select a milestone to see how scale and administration changed.</p></div>
                <span className="roman-year">{timeline === 0 ? "27 BCE" : timeline === 1 ? "117 CE" : "476 CE"}</span>
              </div>
              <div className="roman-map">
                <svg role="img" aria-label="A simplified deterministic map showing Roman territory expanding and later dividing" viewBox="0 0 720 300"><title>Roman territory timeline map</title><path d="M70 160 C120 90 210 80 270 120 C340 65 430 85 480 130 C560 92 645 130 660 185 C570 215 500 230 408 205 C310 250 180 232 70 160Z" fill={timeline === 0 ? "#a8d9b5" : timeline === 1 ? "#0b8f3c" : "#75b989"} opacity=".8" /><path d="M310 120 C370 100 430 112 470 145 L430 205 L350 198Z" fill="#0b6d32" opacity={timeline === 2 ? ".95" : ".35"} /><circle cx="365" cy="160" r="7" fill="#101311" /><text x="382" y="165" fontSize="14" fill="#101311">Rome</text></svg>
              </div>
              <fieldset className="roman-timeline"><legend>Roman Empire timeline</legend>{["27 BCE", "117 CE", "476 CE"].map((label, item) => <button key={label} type="button" className={timeline === item ? "active" : ""} onClick={() => setTimeline(item)}>{label}</button>)}</fieldset>
              <p className="story-feedback correct" role="status">{timeline === 0 ? "Augustus establishes the imperial settlement." : timeline === 1 ? "Under Trajan, Rome reaches its greatest territorial extent." : "476 CE marks the deposition of the last western emperor traditionally counted in Rome; imperial government continues in the east."}</p>
              <button className="story-primary" type="button" onClick={() => setIndex(2)}>Continue to the check <span aria-hidden="true">→</span></button>
            </section>
          ) : null}

          {stage.id === "quiz" ? (
            <section className="story-quiz roman-quiz">
              <div className="story-quiz-main">
                <h2>Which event best marks the conventional transition from Republic to Empire?</h2>
                <div className="roman-choices">{choices.map(([id, label]) => <button key={id} type="button" className={choice === id ? "selected" : ""} onClick={() => setChoice(id)}><strong>{id.toUpperCase()}</strong><span>{label}</span>{choice === id && id === "augustus" ? <span aria-hidden="true">✓</span> : null}</button>)}</div>
                {choice ? <p className={choice === "augustus" ? "story-feedback correct" : "story-feedback"} role="status">{choice === "augustus" ? "Correct. Augustus was granted special powers in 27 BCE and became the first Roman Emperor." : "Review the transition from civil war to Augustus's imperial settlement."}</p> : null}
                <label className="roman-short-response"><span>Why is 476 CE a useful marker but not the end of Roman government everywhere?</span><textarea value={shortResponse} onChange={(event) => setShortResponse(event.currentTarget.value)} rows={4} /></label>
                <button className="story-primary" type="button" disabled={!canContinue} onClick={() => setIndex(3)}>Continue to essay <span aria-hidden="true">→</span></button>
              </div>
            </section>
          ) : null}

          {stage.id === "essay" ? (
            <section className="story-essay roman-essay">
              <div className="story-essay-prompt"><p className="story-kicker">Essay topic</p><h2>Which mattered more to the transformation of the Roman Empire: its territorial scale or its repeated political conflicts?</h2><p>Use at least three pieces of lesson evidence and acknowledge one complication.</p><details className="story-evidence"><summary>Evidence drawer</summary><ul><li>27 BCE — Augustus begins ruling.</li><li>117 CE — greatest territorial extent under Trajan.</li><li>476 CE — western deposition, while eastern government continues.</li></ul></details></div>
              <div className="story-essay-editor"><div className="story-editor-toolbar"><span>{essay.trim() ? essay.trim().split(/\s+/).length : 0} words</span></div><textarea aria-label="Roman Empire essay draft" value={essay} onChange={(event) => setEssay(event.currentTarget.value)} placeholder="Make a clear claim and support it with evidence…" rows={12} /><div className="story-essay-footer"><span>Saved in fixture</span><button className="story-primary" type="button" disabled={essay.trim().length < 20} onClick={() => setIndex(4)}>Save and review <span aria-hidden="true">→</span></button></div></div>
            </section>
          ) : null}

          {stage.id === "review" ? (
            <section className="story-review roman-review"><div className="story-review-card"><span className="story-card-label">{revealed ? "Back" : "Front"}</span><h2>{revealed ? "476 CE marks the deposition of the last western emperor traditionally counted in Rome; Roman imperial government continued in the east." : "Why is 476 CE an incomplete date for the fall of Rome?"}</h2>{!revealed ? <button className="story-primary" type="button" onClick={() => setRevealed(true)}>Reveal answer ↓</button> : <button className="story-primary" type="button" onClick={() => setReviewed(true)}>{reviewed ? "Reviewed" : "Rate as Good"}</button>}</div>{reviewed ? <p className="story-feedback correct" role="status">Review recorded in this visual QA fixture.</p> : null}</section>
          ) : null}
        </section>

        <footer className="story-navigator"><button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)}>← <span>Previous</span></button><div className="story-dots">{stages.map((item, itemIndex) => <button key={item.id} type="button" aria-label={`Go to ${item.label}`} className={itemIndex === index ? "active" : itemIndex < index ? "completed" : ""} onClick={() => setIndex(itemIndex)} />)}</div><button type="button" disabled={index === stages.length - 1 || (index === 2 && !canContinue)} onClick={() => setIndex(index + 1)}><span>Next</span> →</button></footer>
      </main>
    </div>
  );
}
