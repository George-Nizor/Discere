import type { TutoringMode } from "@discere/contracts";
import { Lock } from "lucide-react";

interface ModeOption {
  id: TutoringMode;
  label: string;
  description: string;
}

export const MODE_OPTIONS: ModeOption[] = [
  { id: "coach", label: "Coach", description: "Hints arrive one step at a time." },
  { id: "assisted", label: "Assisted", description: "Stronger hints and more structure." },
  { id: "direct", label: "Direct", description: "The worked answer opens after a pause." },
  { id: "exam", label: "Exam", description: "No hints, no reveal, no tutor." },
];

export function ModeSelector({
  value,
  onChange,
  locked,
}: {
  value: TutoringMode;
  onChange: (mode: TutoringMode) => void;
  locked: boolean;
}) {
  const active = MODE_OPTIONS.find((option) => option.id === value);
  if (locked) {
    return (
      <p className="mode-locked">
        <Lock aria-hidden="true" size={14} strokeWidth={1.8} />
        <span>
          Mode locked to <strong>{active?.label ?? value}</strong> for this attempt.{" "}
          {active?.description}
        </span>
      </p>
    );
  }
  return (
    <fieldset className="mode-selector">
      <legend className="field-label">Learning mode</legend>
      <div className="mode-options">
        {MODE_OPTIONS.map((option) => (
          <button
            aria-pressed={option.id === value}
            className={option.id === value ? "mode-option mode-option-active" : "mode-option"}
            key={option.id}
            onClick={() => onChange(option.id)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="mode-description">{active?.description}</p>
    </fieldset>
  );
}
