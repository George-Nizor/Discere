import { type TutoringMode, TutoringModeSchema } from "@discere/contracts";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

interface ModeContextValue {
  mode: TutoringMode;
  setMode: (mode: TutoringMode) => void;
}

const ModeContext = createContext<ModeContextValue | null>(null);

function storageKey(lessonId: string): string {
  return `discere:tutoring-mode:${lessonId}`;
}

function readStoredMode(lessonId: string): TutoringMode {
  try {
    const parsed = TutoringModeSchema.safeParse(window.localStorage.getItem(storageKey(lessonId)));
    return parsed.success ? parsed.data : "coach";
  } catch {
    return "coach";
  }
}

/**
 * The tutoring mode belongs to the lesson, not to one control: the quiz, the reveal rules and
 * the tutor drawer all read the same value, and it survives a refresh.
 */
export function ModeProvider({ lessonId, children }: { lessonId: string; children: ReactNode }) {
  const [mode, setModeState] = useState<TutoringMode>(() => readStoredMode(lessonId));

  const setMode = useCallback(
    (next: TutoringMode) => {
      setModeState(next);
      try {
        window.localStorage.setItem(storageKey(lessonId), next);
      } catch {
        // Private-mode storage refusal must not stop the lesson.
      }
    },
    [lessonId],
  );

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useTutoringMode(): ModeContextValue {
  const value = useContext(ModeContext);
  if (!value) throw new Error("useTutoringMode must be used inside a ModeProvider.");
  return value;
}
