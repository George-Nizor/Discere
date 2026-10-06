/** biome-ignore-all lint/suspicious/noArrayIndexKey: Read-only matrix cells are identified by position; SQL results can contain identical rows and column labels. */
import type { SqlResult, SqlTable as TableData } from "@discere/contracts";
function Cell({ value }: { value: string | number | null }) {
  return value === null ? (
    <>
      <i aria-hidden="true">NULL</i>
      <span className="sr-only">NULL: missing value</span>
    </>
  ) : typeof value === "string" ? (
    <span>{JSON.stringify(value)}</span>
  ) : (
    <>{value}</>
  );
}
export function SqlDataTable({ table }: { table: TableData }) {
  return (
    <div
      className="sql-table-scroll"
      role="region"
      aria-label={table.name + " input table"}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: A bounded table needs keyboard scrolling.
      tabIndex={0}
    >
      <table>
        <caption>
          {table.name} <span>{table.rows.length} rows</span>
        </caption>
        <thead>
          <tr>
            {table.columns.map((c) => (
              <th scope="col" key={c.name}>
                {c.name}
                <small>{c.type.toLowerCase()}</small>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              {row.map((v, j) => (
                <td key={j}>
                  <Cell value={v} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!table.rows.length ? <p className="muted">No rows</p> : null}
    </div>
  );
}
export function SqlResultTable({ result }: { result: SqlResult }) {
  return (
    <div
      className="sql-table-scroll sql-result"
      role="region"
      aria-label="Query result"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: A result table needs keyboard scrolling.
      tabIndex={0}
    >
      <table>
        <caption>
          Your result{" "}
          <span>
            {result.rows.length} {result.rows.length === 1 ? "row" : "rows"}
          </span>
        </caption>
        <thead>
          <tr>
            {result.columns.map((name, i) => (
              <th scope="col" key={i}>
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr key={i}>
              {row.map((v, j) => (
                <td key={j}>
                  <Cell value={v} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!result.rows.length ? <p className="muted">No rows returned</p> : null}
    </div>
  );
}
