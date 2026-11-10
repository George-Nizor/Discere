import { afterEach, describe, expect, it, vi } from "vitest";

const engine = vi.hoisted(() => ({
  burst: vi.fn(),
  centre: vi.fn(() => ({ x: 0, y: 0 })),
  embers: vi.fn(),
  floatText: vi.fn(),
  pulse: vi.fn(),
  rain: vi.fn(),
  ring: vi.fn(),
  shake: vi.fn(),
  stars: vi.fn(),
}));
vi.mock("./engine.js", () => engine);

import { celebrateAnswer } from "./celebrate.js";

afterEach(() => {
  delete document.documentElement.dataset["celebrations"];
  vi.clearAllMocks();
});

describe("celebrateAnswer", () => {
  it("draws particles and a pulse when celebrations are on", () => {
    const play = vi.fn();
    celebrateAnswer({ correct: true, firstTry: true, xp: 5, origin: null, play });
    expect(engine.burst).toHaveBeenCalled();
    expect(engine.pulse).toHaveBeenCalled();
    expect(play).toHaveBeenCalled();
  });

  it("keeps the sound and draws nothing when celebrations are off", () => {
    document.documentElement.dataset["celebrations"] = "off";
    const play = vi.fn();
    celebrateAnswer({ correct: true, firstTry: true, xp: 5, origin: null, play });
    celebrateAnswer({ correct: false, firstTry: false, xp: 0, origin: null, play });
    for (const effect of Object.values(engine)) {
      if (effect !== engine.centre) expect(effect).not.toHaveBeenCalled();
    }
    expect(play).toHaveBeenCalledWith(expect.stringMatching(/^(answer|combo)$/), expect.any(Number));
    expect(play).toHaveBeenCalledWith("miss", expect.any(Number));
  });
});
