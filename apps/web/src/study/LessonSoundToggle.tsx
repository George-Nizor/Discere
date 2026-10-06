import { useQueryClient } from "@tanstack/react-query";
import { Volume2, VolumeX } from "../brand/icon-set.js";
import { useState } from "react";
import { updateStudyPreferences } from "../api/endpoints.js";
import { queryKeys, useStudyPreferences } from "../api/queries.js";
import { cacheExperience, useExperience } from "./experience.js";
export function LessonSoundToggle() {
  const { sound, prepare, play } = useExperience();
  const preferences = useStudyPreferences();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(false);
  async function toggle() {
    if (busy) return;
    setBusy(true);
    setFailure(false);
    try {
      const next = await updateStudyPreferences({ sound: !(preferences.data?.sound ?? sound) });
      cacheExperience(next);
      queryClient.setQueryData(queryKeys.studyPreferences, next);
      if (next.sound) {
        prepare();
        play("answer");
      }
    } catch {
      setFailure(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="lesson-sound-control">
      <button
        type="button"
        className="lesson-tool"
        aria-pressed={sound}
        title={sound ? "Sound effects on. Click to mute" : "Sound effects off. Click to turn on"}
        disabled={busy}
        onClick={() => void toggle()}
      >
        {sound ? (
          <Volume2 aria-hidden="true" size={22} />
        ) : (
          <VolumeX aria-hidden="true" size={22} />
        )}
        <span className="lesson-tool-label">Sound</span>
      </button>
      {failure ? (
        <span role="alert" className="sr-only">
          The sound preference could not be saved.
        </span>
      ) : null}
    </span>
  );
}
