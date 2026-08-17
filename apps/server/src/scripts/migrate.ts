import path from "node:path";
import { DiscereStore } from "../db/store.js";
import { ensureNotebookSchema } from "../notebook.js";

const databasePath = process.env["DISCERE_DATABASE_PATH"] ?? path.resolve(import.meta.dirname, "../../../../data/discere.sqlite");
const store = new DiscereStore(databasePath);
ensureNotebookSchema(store.database);
store.close();
console.log(`Database schema is ready at ${databasePath}`);
