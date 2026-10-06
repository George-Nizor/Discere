import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Code2, Check } from "lucide-react";
import { Link } from "react-router";
import { getPythonProjects, pythonProjectsKey, pythonSessionPath } from "./api.js";
export function PythonProjects({ courseId }: { courseId: string }) {
  const query = useQuery({
    queryKey: pythonProjectsKey(courseId),
    queryFn: () => getPythonProjects(courseId),
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
    <section className="python-project-list" aria-labelledby="python-projects-title">
      <h2 id="python-projects-title">
        <Code2 size={20} aria-hidden="true" /> Write your own programs
      </h2>
      <p>Write Python, inspect its output and check it against changing inputs.</p>
      <ol>
        {query.data.projects.map((p) => (
          <li key={p.id}>
            <Link
              to={
                p.sessionId
                  ? pythonSessionPath(p.sessionId)
                  : "/courses/" + encodeURIComponent(courseId) + "/python-projects/" + p.id
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
