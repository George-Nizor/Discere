import type { Source } from "@discere/contracts";
import "./SourcePanel.css";

export function SourcePanel({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;
  return (
    <aside className="source-panel" aria-labelledby="source-panel-title">
      <div>
        <p className="eyebrow">Reference material</p>
        <h2 id="source-panel-title">Where this lesson comes from</h2>
      </div>
      <div className="source-list">
        {sources.map((source) => (
          <a key={source.id} className="source-card" href={source.url} target="_blank" rel="noreferrer">
            <strong>{source.title}</strong>
            <span>{source.publisher}</span>
            <small>{source.licence}</small>
          </a>
        ))}
      </div>
    </aside>
  );
}
