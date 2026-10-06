import { useState } from "react";

/**
 * Where the learner has put the pet, as fractions of the free space (0 = left/top edge,
 * 1 = right/bottom edge), so it stays in proportion when the window is resized. Remembered in
 * this browser only; null means the default spot (middle of the left edge).
 */
export interface PetPosition {
  fx: number;
  fy: number;
}
const KEY = "discere:pet-position:v1";
const clamp = (value: number) => Math.min(1, Math.max(0, value));

function read(): PetPosition | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null") as PetPosition | null;
    if (value && Number.isFinite(value.fx) && Number.isFinite(value.fy))
      return { fx: clamp(value.fx), fy: clamp(value.fy) };
  } catch {
    /* No stored position; the default spot is used. */
  }
  return null;
}

export function usePetPosition() {
  const [position, setPosition] = useState<PetPosition | null>(read);
  const save = (next: PetPosition | null) => {
    const value = next ? { fx: clamp(next.fx), fy: clamp(next.fy) } : null;
    setPosition(value);
    try {
      if (value) localStorage.setItem(KEY, JSON.stringify(value));
      else localStorage.removeItem(KEY);
    } catch {
      /* The pet still moves for this visit. */
    }
  };
  return { position, save, preview: setPosition };
}

/** The margin kept between the pet and the window edge, in pixels. */
export const PET_MARGIN = 16;

/** Converts a pointer position (the pet's top-left corner) into fractions of the free space. */
export function toFractions(left: number, top: number, size: number): PetPosition {
  const freeX = Math.max(1, window.innerWidth - 2 * PET_MARGIN - size);
  const freeY = Math.max(1, window.innerHeight - 2 * PET_MARGIN - size);
  return { fx: clamp((left - PET_MARGIN) / freeX), fy: clamp((top - PET_MARGIN) / freeY) };
}
