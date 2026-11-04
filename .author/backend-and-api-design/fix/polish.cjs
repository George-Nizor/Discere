const { load, save, step, paras } = require("./lib.cjs");
const b = load();
step(b, "json-representations", "count-valid").reveal = paras(
  "The next screen sets out the rules of the grammar, and the figure shows three that catch people out.",
);
step(b, "versioning-and-change", "count-breaking").reveal = paras(
  "The changes that only add something are left out of the list.",
);
step(b, "layers-and-background-work", "count-emails-3").reveal = paras(
  "The remembered set of orders is what keeps each order to a single email.",
);
b.course.introduction.paragraphs[1] = b.course.introduction.paragraphs[1].replace(
  "only if the method promised that a repeat changes nothing more,",
  "only if the method promised that a repeat leaves the server as one copy would,",
);
save(b);
