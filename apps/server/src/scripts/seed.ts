import { resolveDatabasePath } from "@discere/paths";
import { ContentRepository } from "../content.js";
import { DiscereStore } from "../db/store.js";
const databasePath = resolveDatabasePath(process.env["DISCERE_DATABASE_PATH"]);
const content = await ContentRepository.load(ContentRepository.defaultPath());
const store = new DiscereStore(databasePath);
store.initialiseConcepts(content.bundle.concepts);
store.close();
console.log(`Seeded ${content.bundle.concepts.length} concepts.`);
