const L = require("./lib.cjs");
const b = L.load();
b.course.introduction.paragraphs = [
  "A web page is delivered as text, and the page on your screen is something the browser builds from that text by fixed rules. It asks a server for the document by its address, reads the HTML in the reply into a tree of elements, matches CSS rules against each element to decide how large it is and where it sits, and then runs the JavaScript, which can change the tree for as long as the page stays open. Because each of those steps follows rules that are written down exactly, much of what a page does can be worked out from its code.",
  "A good deal of what looks arbitrary in web development follows from those rules. A style that seems to be ignored has lost to another rule under a fixed ranking, the expression \"5\" + 3 gives \"53\" because JavaScript joins the two as text when one side is a string, and a handler on a parent element that runs when you click its child is following the path an event takes through the tree. Each of these has an answer that can be reached by reading the code carefully, and once you know the rule you can say what a page will do before you open it, and which line is at fault when it does something else.",
];
L.save(b);
