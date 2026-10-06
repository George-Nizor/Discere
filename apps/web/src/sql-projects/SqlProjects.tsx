import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Database, Check } from "lucide-react";
import { Link } from "react-router";
import { getSqlProjects, sqlProjectsKey, sqlSessionPath } from "./api.js";
export function SqlProjects({ courseId }: { courseId: string }) {
  const query = useQuery({
    queryKey: sqlProjectsKey(courseId),
    queryFn: () => getSqlProjects(courseId),
  });
  if (query.isPending) return null;
  if (query.error)
    return (
      <p className="muted">
        Projects could not load.{" "}
        <button type="button" className="text-button" onClick={() => void query.refetch()}>
          Retry
        </button>
      </p>
    );
  if (!query.data?.projects.length) return null;
  return (
    <section className="sql-project-list" aria-labelledby="sql-projects-title">
      <h2 id="sql-projects-title">
        <Database size={20} aria-hidden="true" /> Write your own queries
      </h2>
      <p>Build a report. Run it, inspect the result, then check it against changing data.</p>
      <ol>
        {query.data.projects.map((p) => (
          <li key={p.id}>
            <Link
              to={
                p.sessionId
                  ? sqlSessionPath(p.sessionId)
                  : "/courses/" + encodeURIComponent(courseId) + "/sql-projects/" + p.id
              }
            >
              <span>
                <strong>{p.title}</strong>
                <small>
                  {p.completed} / {p.taskCount} tasks
                </small>
              </span>
              {p.finished ? (
                <Check aria-label="Complete" size={19} />
              ) : (
                <ArrowRight aria-hidden="true" size={19} />
              )}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
