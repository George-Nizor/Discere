const L = require("./lib.cjs");
const b = L.load();
const id = "talking-to-servers";
L.setOpener(b, id, [
  "A page that wants data asks for it with a call such as fetch('/items/42'), gets back a response that carries a status code, some headers and a body, and reads the body as JSON, a text format that looks like a JavaScript object but follows stricter rules. Each of those steps has details that are easy to read wrongly: what counts as success for a request, what survives the trip into text and back, and which replies the browser allows the page's script to read at all.",
  "Once the rules are known you can read a short piece of fetch code and say what happens when the server answers with an error or does not answer at all, what text JSON.stringify writes for a given value, and whether a page will be able to read a reply that comes from another address.",
]);
for (const s of ["a-missing-page", "read-the-status", "what-stringify-keeps", "parse-nested", "which-origin", "count-matching-origins", "dates-in-json"])
  L.cutLead(b, id, s);
// The fact that the question depends on is not taught on the teaching screens, so the lead keeps it.
L.setLead(b, id, "read-twice-try", ["A response body is a stream, and a stream is consumed as it is read."]);

const q = "webhcj-talking-to-servers-";
L.makeChoice(b, q + "read-twice", {
  prompt: "const res = await fetch('/data');   // replies 200 with the body {\"n\":1}\nawait res.json();\nlet b;\ntry { b = await res.json(); } catch (e) { b = e.name; }\nconsole.log(b);\nWhat is printed?",
  options: [
    { label: "TypeError, because the body has already been read", correct: true },
    { label: "{ n: 1 }, because json() can be called again", why: "The first json() call has already consumed the body, so the second call fails and the catch block runs." },
    { label: "SyntaxError, because the second read finds no JSON", why: "The second call fails before any parsing starts, because the body has been used up. The error is a TypeError." },
  ],
  exampleAnswer: "A response body can be read only once. The second call to json() throws a TypeError, whose name is what the catch block stores.",
  hints: [
    "Can a response body be read a second time?",
    "The second read fails, and the catch block stores the name of the error.",
  ],
  onCorrect: "To read a body twice, call response.clone() before reading, and read each copy once.",
});

L.makeChoice(b, q + "predict-stringify", {
  prompt: "console.log(JSON.stringify({ a: undefined, b: () => 1, c: NaN }));\nWhat is printed?",
  options: [
    { label: "All three properties, as {\"a\":null,\"b\":null,\"c\":null}", why: "In an object, a property holding undefined or a function is left out. Those values become null only inside an array." },
    { label: "Only c, as {\"c\":NaN}", why: "NaN has no form in JSON, so stringify writes it as null." },
    { label: "Only c, as {\"c\":null}", correct: true },
    { label: "Nothing, as {}", why: "NaN is not left out. It is written as null, so the property c remains." },
  ],
  exampleAnswer: "stringify leaves out undefined and functions from an object, and writes NaN as null, so only c remains, with the value null.",
  hints: [
    "JSON has no way to write undefined or a function.",
    "NaN has no JSON form either, so it is written as null.",
  ],
  onCorrect: "JSON can express only objects, arrays, strings, numbers, booleans and null.",
});

L.makeChoice(b, q + "count-origins", {
  prompt: "Which of these URLs share an origin with https://a.com/page?\nA  https://a.com/b?x=1\nB  https://a.com:443/c\nC  http://a.com/page\nD  https://shop.a.com/page\nE  https://a.com:8080/page",
  options: [
    { label: "A only", why: "B also shares the origin, because 443 is the default port for https." },
    { label: "A, B and C", why: "C uses http where the page uses https, and the scheme is part of the origin." },
    { label: "A, B and E", why: "E names port 8080, and the port is part of the origin, so it differs from the default 443." },
    { label: "A and B", correct: true },
  ],
  exampleAnswer: "A and B have the same scheme, host and port, since 443 is the default for https. The others differ in scheme, host or port.",
  hints: [
    "Compare the scheme, host and port of each with https://a.com.",
    "A missing port means the default for the scheme.",
    "Paths and queries are not part of the origin.",
  ],
  onCorrect: "The path and the query never affect the origin.",
});

L.makeChoice(b, q + "date-round-trip", {
  prompt: "console.log(typeof JSON.parse(JSON.stringify({ when: new Date(0) })).when);\nWhat is printed?",
  options: [
    { label: "object, because a Date survives the round trip", why: "JSON has no type for dates. stringify writes a Date as text, and parse cannot know that the text was once a date." },
    { label: "string, because stringify writes the Date as text", correct: true },
    { label: "number, because a Date is a count of milliseconds", why: "A Date holds a number of milliseconds inside, but stringify writes it as an ISO text string, so parse gives back text and not a number." },
  ],
  exampleAnswer: "stringify writes a Date as an ISO text string, and parse gives back that string, not a Date, so the type is string.",
  hints: [
    "What does stringify write for a Date?",
    "parse has no way to know the text was a date.",
  ],
  onCorrect: "A date sent as JSON must be rebuilt with new Date(text) on the receiving side.",
});

L.makeChoice(b, q + "check-reject", {
  prompt: "fetch is called on a host that cannot be reached, so no response ever arrives. What happens to the returned promise?",
  options: [
    { label: "It resolves with a Response whose ok is false", why: "That happens when a response arrives with an error status. Here no response arrives at all, so there is nothing to resolve with." },
    { label: "It stays pending until the page is closed", why: "fetch settles when the request fails. With no response the promise rejects, and a try and catch around the await handles it." },
    { label: "It rejects, because the request itself failed", correct: true },
  ],
  exampleAnswer: "With no response, there is nothing to resolve with, so the promise rejects with a TypeError.",
  hints: [
    "Did a response arrive?",
    "A promise rejects when the request itself failed.",
  ],
  onCorrect: "That is the one case where a catch block or try and catch around await will run.",
});

L.makeChoice(b, q + "check-origins", {
  prompt: "Which of these URLs share an origin with http://shop.example.com:8080/a?\nA  http://shop.example.com:8080/b\nB  https://shop.example.com:8080/a\nC  http://shop.example.com/a\nD  http://shop.example.com:8080/c?q=1",
  options: [
    { label: "A and D", correct: true },
    { label: "A, C and D", why: "C leaves the port out, which means the default port 80 for http, and that differs from 8080." },
    { label: "A only", why: "D differs from the page only in its path and query, which are never part of an origin, so it shares the origin." },
    { label: "A, B and D", why: "B uses https where the page uses http, and the scheme is part of the origin." },
  ],
  exampleAnswer: "Only A and D have the same scheme, host and port. B changes the scheme and C drops the port, so the default port 80 differs from 8080.",
  hints: [
    "Compare the scheme, host and port of each.",
    "Leaving the port out means the default for the scheme.",
    "Two differ in the scheme or the port.",
  ],
  onCorrect: "The path and the query do not count toward the origin.",
});
L.save(b);
