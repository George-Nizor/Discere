import path from "node:path";
import { DiscereStore } from "../db/store.js";
const databasePath = process.env["DISCERE_DATABASE_PATH"] ?? path.resolve(import.meta.dirname, "../../../../data/discere.sqlite");
const store = new DiscereStore(databasePath);
store.close();
console.log(`Database schema is ready at ${databasePath}`);
