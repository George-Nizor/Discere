import type { CourseCheckVisual } from "@discere/contracts";
export function QueryCheckVisual({
  visual,
}: {
  visual: Extract<CourseCheckVisual, { type: "query" }>;
}) {
  return (
    <div className="check-query">
      <div className="check-query-tables">
        {visual.tables.map((table) => (
          <section
            key={table.name}
            className="check-query-table"
            aria-label={table.name + " input table"}
            // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users must be able to scroll the bounded input table.
            tabIndex={0}
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
                {table.rows.map((row, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: Given rows never reorder, and duplicates are meaningful.
                  <tr key={i}>
                    {row.map((cell, col) => (
                      <td key={table.columns[col]}>
                        {cell === null ? (
                          <span className="check-null">
                            <span aria-hidden="true">NULL</span>
                            <span className="sr-only">NULL: missing value</span>
                          </span>
                        ) : typeof cell === "string" ? (
                          <span className="check-string">{JSON.stringify(cell)}</span>
                        ) : (
                          cell
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
      <figure className="check-program">
        <figcaption>SQL · SQLite</figcaption>
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users must be able to scroll a long query. */}
        <pre tabIndex={0} role="region" aria-label="SQL query">
          <code>{visual.sql}</code>
        </pre>
      </figure>
    </div>
  );
}
