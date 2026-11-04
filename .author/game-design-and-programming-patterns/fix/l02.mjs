import { setOpener, setLead, toChoice, save } from "./lib.mjs";
const L = "feedback-and-game-feel";

setOpener(L, [
  "A game running at 60 frames per second redraws the screen sixty times in each second, so it can answer a button press only on one of those redraws and never between them. The delay before the character visibly responds therefore comes in whole frames, and careful players can feel the difference between a jump that leaves the ground on the next frame and one that leaves six frames later. They seldom blame the timing, and describe the character instead, as heavy, floaty or loose.",
  "Designers call this quality **game feel**, and they measure the start of a response in frames, which can be converted to milliseconds when two frame rates have to be compared. What follows the start, layers of feedback and a short grace window around the press, decides whether the response is also readable and forgiving.",
]);

for (const id of ["frame-time-guess", "hundred-ms", "audit-the-flash", "name-the-grace", "same-delay-two-rates"])
  setLead(L, id, []);

toChoice("gamdpp-feedback-and-game-feel-frame-time-60", {
  prompt:
    "A game runs at 60 frames per second, so the screen is redrawn sixty times in each second. About how long does one frame last?",
  options: [
    {
      label: "About 1.7 milliseconds",
      why: "A second holds 1000 milliseconds, and those are shared among sixty frames. Each frame gets about ten times more than 1.7 milliseconds.",
    },
    { label: "About 17 milliseconds" },
    {
      label: "About 60 milliseconds",
      why: "Sixty is the number of frames in a second, not the length of one. At 60 milliseconds a frame, only about 17 frames would fit in a second.",
    },
    {
      label: "About 170 milliseconds",
      why: "At 170 milliseconds a frame, only about six frames would fit in a second, far fewer than sixty.",
    },
  ],
  correct: 1,
  onCorrect:
    "A frame is one sixtieth of a second, which is 16.7 ms to one decimal place. At 30 frames per second a frame lasts twice as long, 33.3 ms, and at 120 half as long, 8.3 ms.",
  hints: [
    "A frame is one sixtieth of a second.",
    "One second is 1000 milliseconds, shared out among the sixty frames.",
  ],
});

save();
