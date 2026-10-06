import type { LearningDiagram } from "@discere/contracts";
import { ArrowDown, Database } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

type QuerySpec = Extract<LearningDiagram, { type: "relational_query" }>;
type TableSpec = QuerySpec["inputs"][number];

function DataTable({ table, result = false }: { table: TableSpec; result?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);
  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () => setScrollable(element.scrollWidth > element.clientWidth + 1);
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    return () => observer?.disconnect();
  }, [table]);
  return (
    <div
      ref={container}
      className={"query-table-scroll" + (result ? " query-result" : "")}
      tabIndex={scrollable ? 0 : undefined}
      role="region"
      aria-label={table.name + " table"}
    >
      <table>
        <caption>{table.name}</caption>
        <thead>
          <tr>
            {table.columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.id}>
              {row.cells.map((cell, index) => (
                <td key={table.columns[index]}>
                  {cell === null ? (
                    <span className="query-null" aria-label="NULL, missing value">
                      NULL
                    </span>
                  ) : (
                    String(cell)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.rows.length === 0 ? <p className="query-empty">No rows match.</p> : null}
    </div>
  );
}

export function QueryDiagram({
  spec,
  showResults = true,
}: {
  spec: QuerySpec;
  showResults?: boolean;
}) {
  const [queryId, setQueryId] = useState(spec.initialQueryId);
  const query = spec.queries.find((item) => item.id === queryId) ?? spec.queries[0]!;
  return (
    <div className="learning-diagram query-diagram">
      <div className="query-heading">
        <Database size={17} aria-hidden="true" />
        <span>SQLite</span>
      </div>
      <div className="query-controls" role="group" aria-label="Choose a query">
        {spec.queries.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={query.id === item.id}
            onClick={() => setQueryId(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <pre className="query-code">
        <code>{query.sql}</code>
      </pre>
      {showResults ? (
        <>
          <div className="query-flow" aria-live="polite" aria-atomic="true">
            <ArrowDown size={17} aria-hidden="true" />
            <span>
              {query.result.rows.length} {query.result.rows.length === 1 ? "row" : "rows"} ·{" "}
              {query.result.columns.length}{" "}
              {query.result.columns.length === 1 ? "column" : "columns"}
            </span>
          </div>
          <DataTable key={query.id} table={query.result} result />
        </>
      ) : (
        <div className="query-flow query-result-hidden">
          <ArrowDown size={17} aria-hidden="true" />
          <span>Work out the result from the input data. It appears once you have answered.</span>
        </div>
      )}
      <details className="query-inputs">
        <summary>Input data</summary>
        {spec.inputs.map((table) => (
          <DataTable key={table.name} table={table} />
        ))}
      </details>
    </div>
  );
}
