import path from "node:path";
import { courseDirectories, loadSqlProjects } from "@discere/curriculum";
import type { SqlProjectCollection } from "@discere/contracts";
import type { ContentRepository } from "../content.js";
export class SqlProjectRepository {
  constructor(readonly collections: SqlProjectCollection[]) {}
  static async load(root: string, content: ContentRepository) {
    const collections: SqlProjectCollection[] = [];
    for (const directory of await courseDirectories(root)) {
      const bundle = content.bundles.find((b) => b.course.id === directory);
      if (!bundle || !content.isListed(bundle.course.id)) continue;
      const collection = await loadSqlProjects(path.join(root, directory), bundle);
      if (collection) collections.push(collection);
    }
    return new SqlProjectRepository(collections);
  }
  find(courseId: string, projectId: string) {
    return this.collections
      .find((c) => c.courseId === courseId)
      ?.projects.find((p) => p.id === projectId);
  }
}
