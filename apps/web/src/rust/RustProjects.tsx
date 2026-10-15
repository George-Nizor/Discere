import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, SquareTerminal } from "lucide-react";
import { Link } from "react-router";
import {
  getRustProjects,
  rustPlaygroundPath,
  rustProjectPath,
  rustProjectsKey,
  rustSessionPath,
} from "./api.js";

/** The course page's list of Rust projects, with the playground beside them. */
export function RustProjects({ courseId }: { courseId: string }) {
  const query = useQuery({
    queryKey: rustProjectsKey(courseId),
    queryFn: () => getRustProjects(courseId),
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
    <section className="python-project-list" aria-labelledby="rust-projects-title">
      <h2 id="rust-projects-title">
        <SquareTerminal size={20} aria-hidden="true" /> Write your own programs
      </h2>
      <p>Write Rust in the editor, run it, and check it against tests.</p>
      <ol>
        {query.data.projects.map((p) => (
          <li key={p.id}>
            <Link to={p.sessionId ? rustSessionPath(p.sessionId) : rustProjectPath(courseId, p.id)}>
              <span>
                <strong>{p.title}</strong>
                <small>
                  {p.completed} / {p.taskCount} programs
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
        <li>
          <Link to={rustPlaygroundPath}>
            <span>
              <strong>Rust playground</strong>
              <small>Write and run any program. Nothing is graded.</small>
            </span>
            <ArrowRight aria-hidden="true" size={19} />
          </Link>
        </li>
      </ol>
    </section>
  );
}
