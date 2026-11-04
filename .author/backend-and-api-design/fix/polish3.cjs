const { load, save, cutLead } = require("./lib.cjs");
const b = load();
cutLead(b, "methods-and-safety", "name-the-method");
save(b);
