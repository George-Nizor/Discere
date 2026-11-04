// Small wording fixes made after reading every opener again as a learner.
const { load, save, lesson, para } = require("./lib.cjs");
const b = load();
function hookText(id, i, from, to) {
  const block = lesson(b, id).intro.hook.blocks[i];
  if (!block.text.includes(from)) throw new Error(`${id}: text not found: ${from}`);
  block.text = block.text.replace(from, to);
}
hookText(
  "shapes-and-structural-typing",
  0,
  "it makes no difference to the function how that argument was made, whether as an object literal, by a class or by parsing JSON.",
  "it makes no difference to the function whether the argument was built by a class or parsed from JSON.",
);
hookText(
  "types-at-the-edges",
  0,
  "so that j.anything.at.all passes the check and then stops the program with a TypeError.",
  "so that a line such as j.anything.at.all, where j holds the result, passes the check and then stops the program with a TypeError.",
);
hookText(
  "errors-and-concurrency",
  1,
  "and a rejection that nobody handles ends a Node process, and each of these can be found by reading once you know what JavaScript does with a promise at the point where the code stops looking at it.",
  "and a rejection that nobody handles ends a Node process. Each of these can be found by reading, once you know what JavaScript does with a promise at the point where the code stops looking at it.",
);
save(b);
