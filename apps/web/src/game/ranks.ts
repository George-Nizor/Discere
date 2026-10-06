/** Achievement ranks are numbered, so they never share a name with a league. */
export const RANK_LABELS = ["I", "II", "III", "IV", "V"] as const;
export const rankLabel = (rank: number) => RANK_LABELS[rank - 1] ?? String(rank);

export const RARITY_NAMES = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
} as const;

export const ITEM_NAMES = {
  "streak-freeze": ["streak freeze", "streak freezes"],
  "xp-boost": ["XP boost", "XP boosts"],
  "quest-swap": ["quest swap", "quest swaps"],
} as const;

export function itemPhrase(id: keyof typeof ITEM_NAMES, count: number) {
  return `${count} ${ITEM_NAMES[id][count === 1 ? 0 : 1]}`;
}
