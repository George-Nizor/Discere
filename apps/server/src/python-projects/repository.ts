import path from "node:path";
import { courseDirectories, loadPythonProjects } from "@discere/curriculum";
import type { PythonProjectCollection } from "@discere/contracts";
import type { ContentRepository } from "../content.js";
export class PythonProjectRepository {
  constructor(readonly collections: PythonProjectCollection[]) {}
  static async load(root: string, content: ContentRepository) {
    const collections: PythonProjectCollection[] = [];
    for (const directory of await courseDirectories(root)) {
      const bundle = content.bundles.find((b) => b.course.id === directory);
      if (!bundle || !content.isListed(bundle.course.id)) continue;
      const collection = await loadPythonProjects(path.join(root, directory), bundle);
      if (collection) collections.push(collection);
    }
    return new PythonProjectRepository(collections);
  }
  find(courseId: string, projectId: string) {
    return this.collections
      .find((c) => c.courseId === courseId)
      ?.projects.find((p) => p.id === projectId);
  }
}
