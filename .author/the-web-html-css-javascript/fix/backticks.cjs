// Lesson text has no inline-code formatting: write code names plainly.
const L = require("./lib.cjs");
const b = L.load();
let n = 0;
function walk(v, key) {
  if (typeof v === "string") {
    if (key === "svg") return v;
    return v.replace(/`([^`]+)`/gu, (_, code) => (n++, code));
  }
  if (Array.isArray(v)) return v.map((x) => walk(x, key));
  if (v && typeof v === "object") {
    for (const k of Object.keys(v)) v[k] = walk(v[k], k);
  }
  return v;
}
b.lessons = walk(b.lessons, "lessons");
b.questions = walk(b.questions, "questions");
L.save(b);
console.log("backticks removed:", n);
