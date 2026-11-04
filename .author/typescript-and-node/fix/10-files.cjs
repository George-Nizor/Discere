const { load, save, setHook, clearLead, toChoice } = require("./lib.cjs");
const b = load();
const L = "files-streams-and-buffers";

setHook(b, L, [
  "The price €5 looks like two characters, and written to a file in UTF-8 it takes four bytes, because the euro sign is stored as three. In Node the first number is the string's length and the second is what Buffer.byteLength reports, and a program that treats one as the other goes wrong as soon as someone types a symbol or an accent. Text becomes bytes only through an encoding, and the encoding decides how many.",
  "Those bytes then have to travel from a disk or a network into a program, and the program may be handed a file of several gigabytes. Reading it all at once would need that much memory, so Node offers streams, which carry the data in pieces and ask the sender to wait when the receiver falls behind. Knowing how a string becomes bytes and how bytes move lets you size buffers and limits correctly and handle files that are larger than memory.",
]);

for (const s of [
  "predict-the-size",
  "size-of-a-word",
  "to-base64",
  "chunks-in-a-file",
  "predict-the-returns",
  "find-the-first-false",
  "size-of-a-file",
])
  clearLead(b, L, s);

toChoice(b, "typn-files-streams-and-buffers-predict-bytes", {
  prompt:
    'const s = "héllo";\nThe string has five characters, one of which is an accented letter. How does its size in bytes when written as UTF-8, which Buffer.byteLength(s) reports, compare with s.length?',
  options: [
    "The same, because every character takes one byte.",
    "A little more, because only the accented letter takes more than one byte.",
    "About twice as much, because every character takes two bytes.",
    "Fewer, because a byte is smaller than a character.",
  ],
  correct: 1,
  misconceptions: {
    0: "Only plain ASCII characters take a single byte in UTF-8, and an accented letter takes more.",
    2: "The four plain letters still take one byte each, and only the accented letter takes more.",
    3: "A byte holds a number from 0 to 255 and a character can need several of them, so the size is never smaller than the length.",
  },
  onCorrect:
    "UTF-8 gives each ASCII letter one byte and the accented letter two, so the size is one more than the length.",
  hints: ["Ask how many bytes a plain letter takes.", "Only the accented letter is different."],
});

toChoice(b, "typn-files-streams-and-buffers-false-count", {
  prompt:
    'const w = new Writable({ highWaterMark: 10, write(chunk, enc, cb) { setImmediate(cb); } });\nconsole.log(w.write("12345"), w.write("67890"), w.write("x"));\nThe consumer is slow. What do the three calls return?',
  options: [
    "All three return true, because a stream accepts every write.",
    "The first returns true, and the others return false once the waiting data reaches the limit of ten bytes.",
    "All three return false, because the consumer is slow.",
    "Each call waits until the consumer is ready and then returns true.",
  ],
  correct: 1,
  misconceptions: {
    0: "A stream accepts every write, but it reports through the return value when its buffer has reached the limit.",
    2: "The first write leaves the buffer below the limit, so the stream still has room and reports it.",
    3: "write() never waits for the consumer. It stores the data and returns straight away, with a value that says whether the stream has room.",
  },
  onCorrect:
    "The first write leaves five bytes waiting, which is under the limit, while the second brings the total to ten, and from then on write() returns false.",
  hints: ["Keep a total of the bytes waiting after each write.", "write() returns false when the total reaches the limit."],
});

save(b);
