import path from "node:path";
import { ContentRepository } from "../content.js";
import { DiscereStore } from "../db/store.js";
const databasePath = process.env["DISCERE_DATABASE_PATH"] ?? path.resolve(import.meta.dirname, "../../../../data/discere.sqlite");
const content = await ContentRepository.load(ContentRepository.defaultPath());
const store = new DiscereStore(databasePath);
store.initialiseConcepts(content.bundle.concepts);
store.close();
console.log(`Seeded ${content.bundle.concepts.length} concepts.`);
