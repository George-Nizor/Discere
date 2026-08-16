import type { TutoringMode } from "@discere/contracts";
const options: Array<{ id: TutoringMode; label: string; description: string }> = [
  { id: "coach", label: "Coach", description: "Questions first, gradual guidance" },
  { id: "assisted", label: "Assisted", description: "Hints available after an attempt" },
  { id: "direct", label: "Direct", description: "Answer reveal with a reflection pause" },
  { id: "exam", label: "Exam", description: "No hints or answer reveal" },
];
export function ModeSelector({ value, onChange }: { value: TutoringMode; onChange: (mode: TutoringMode) => void }) {
  return <fieldset className="mode-selector"><legend>Learning mode</legend>{options.map((option) => <button key={option.id} type="button" className={value === option.id ? "mode-option active" : "mode-option"} onClick={() => onChange(option.id)} aria-pressed={value === option.id}><strong>{option.label}</strong><span>{option.description}</span></button>)}</fieldset>;
}
