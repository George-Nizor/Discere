import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { courseIcons } from "./course-icons.js";

const root = path.resolve(import.meta.dirname, "..");
for (const [id, svg] of Object.entries(courseIcons)) {
  const assets = path.join(root, "content", id, "assets");
  await mkdir(assets, { recursive: true });
  await writeFile(path.join(assets, "cover.svg"), svg, "utf8");
  console.log("Illustrated " + id);
}
