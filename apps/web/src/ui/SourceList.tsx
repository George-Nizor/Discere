import type { Source } from "@discere/contracts";
import { useId } from "react";

/** A list longer than this starts closed, so it never pushes the screen's own content away. */
const OPEN_LIMIT = 6;

/**
 * The sources a lesson or a course cites: the title as a link, then who published it and its
 * licence. A source whose address stopped working is still listed, without a link, and says so.
 * Links open outside the app: in the installed app the launcher hands a new-window request to the
 * system browser, and in a browser they open a new tab.
 */
export function SourceList({ sources, className }: { sources: Source[]; className?: string }) {
  const titleId = useId();
  if (!sources.length) return null;
  const list = (
    <ul className="source-list">
      {sources.map((source) => {
        const unreachable = source.checked?.status === "unreachable";
        return (
          <li key={source.id}>
            {unreachable ? (
              <span className="source-title">{source.title}</span>
            ) : (
              <a className="source-title" href={source.url} rel="noreferrer noopener" target="_blank">
                {source.title}
              </a>
            )}
            <span className="source-detail">
              {source.publisher}. {source.licence.replace(/\.$/u, "")}.
              {unreachable ? " Its link no longer works." : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
  return (
    <section className={`sources${className ? ` ${className}` : ""}`} aria-labelledby={titleId}>
      <h2 id={titleId}>Sources</h2>
      {sources.length > OPEN_LIMIT ? (
        <details>
          <summary>Show all {sources.length} sources</summary>
          {list}
        </details>
      ) : (
        list
      )}
    </section>
  );
}
