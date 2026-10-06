import { BoostActivationSchema, QuestSwapSchema } from "@discere/contracts";
import { requestJson } from "../api/client.js";

/** Switches on one XP boost from the inventory. The server refuses if one is already running. */
export async function activateBoost() {
  return BoostActivationSchema.parse(
    await requestJson("/api/study/boost", { method: "POST", body: "{}" }),
  );
}

/** Spends one quest swap to replace an unfinished quest for today. */
export async function swapQuest(questId: string) {
  return QuestSwapSchema.parse(
    await requestJson(`/api/study/quests/${encodeURIComponent(questId)}/swap`, {
      method: "POST",
      body: "{}",
    }),
  );
}
