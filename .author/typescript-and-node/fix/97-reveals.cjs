// Reveals written for the old question forms: bring three of them in line with the new questions.
const { load, save, step } = require("./lib.cjs");
const b = load();
function setReveal(lessonId, stepId, text) {
  step(b, lessonId, stepId).reveal = [{ kind: "paragraph", text }];
}
setReveal(
  "transforming-types",
  "predict-keyof",
  "The next screen puts a second operator beside keyof, square brackets, which read the type of one property instead of its name.",
);
setReveal(
  "packages-versions-and-tests",
  "count-failing-tests",
  "A failing assertion makes node --test report the expected and the actual value, and the command ends with exit code 1.",
);
setReveal(
  "a-typed-service",
  "count-the-valid",
  "A refused body gives ok: false with a message that names the field, so the client can see what to change.",
);
save(b);
