const { load, save, setOpener, lesson } = require("./lib.cjs");
const b = load();
const text = (id, i) => lesson(b, id).intro.hook.blocks[i].text;
const sub = (id, i, from, to) => {
  const t = text(id, i);
  if (!t.includes(from)) throw new Error(`missing in ${id}: ${from}`);
  lesson(b, id).intro.hook.blocks[i].text = t.replace(from, to);
};
sub("anatomy-of-an-http-exchange", 1,
  "Both messages are built from the same parts in the same order, a first line, header fields, a blank line and a body, so a server can read one line by line and know at each point what it is looking at. Once you can read those lines, you can take any request and say what it asks for, what it carries and how large it is, and you can trace each behaviour of the APIs in the rest of the course, such as whether a request may be repeated or a response stored, to a particular line of one of these messages.",
  "Both messages have the same parts in the same order, a first line, header fields, a blank line and a body, so a server can read one line by line and know at each point what it is looking at. Once you can read those lines, you can take any request and say what it asks for, what it carries and how large it is, and you can trace behaviours that later lessons take up, such as whether a request may be repeated or a response stored, to a particular line of one of these messages.");
sub("resources-and-urls", 0,
  "names a thing, here the orders of customer 17, the query after the question mark only narrows what comes back, and the fragment at the end stays in the browser and is never sent.",
  "names a thing, here the orders of customer 17. The query after the question mark only narrows what comes back, and the fragment at the end stays in the browser and is never sent.");
setOpener(b, "json-representations",
  'What a server sends when a client asks for order 42 is text such as {"id": "42", "item": "pen", "qty": 3}, because the order itself cannot travel over a network. That text is a **representation**, an encoding of the order\'s current state, and the encoding most APIs use is JSON, which a program reads by following a strict grammar and then either accepts the whole text or rejects it.',
  lesson(b, "json-representations").intro.hook.blocks[1].text);
sub("authorisation-and-input-trust", 1,
  "Each has its own repair, an ownership check, a parameterised query and an allowlist of fields, and being able to name the repair lets you read a handler, point to the line that trusts too much, and say what should replace it.",
  "Each of the three has its own repair, which is an ownership check, a parameterised query or an allowlist of fields, and being able to name the repair lets you read a handler, point to the line that trusts too much, and say what should replace it.");
sub("versioning-and-change", 1,
  "Changes differ in what they do to an old client, and the difference can be found by asking what that client would do with the response it now receives. Once you can ask that of any change, you can sort proposals into those that can go out at once and those that need a migration, and you can plan a rename or a removal so that clients have time to move.",
  "That definition turns the question into something concrete for any proposed change: take the response a client used to receive, take the one it receives now, and ask what the client does with the difference. A team can still make a breaking change by running a migration, which keeps the old form working for a period that it announces, until nobody depends on it. Knowing how to run that test and plan that migration lets you classify a change as breaking or not, and move an API forward without stranding the clients that cannot move at once.");
save(b);
