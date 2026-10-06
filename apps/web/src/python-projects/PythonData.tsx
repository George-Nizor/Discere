/** biome-ignore-all lint/suspicious/noArrayIndexKey: Read-only input and output matrices preserve positional identity and may contain duplicate rows. */
import type { PythonInputs, PythonValue } from "@discere/contracts";

function literal(value: PythonValue): string {
  if (value === null) return "None";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return "[" + value.map(literal).join(", ") + "]";
  return (
    "{" +
    Object.entries(value)
      .map(([key, item]) => JSON.stringify(key) + ": " + literal(item))
      .join(", ") +
    "}"
  );
}
function Matrix({
  name,
  columns,
  rows,
}: {
  name: string;
  columns: string[];
  rows: PythonValue[][];
}) {
  return (
    <div
      className="python-table-scroll"
      role="region"
      aria-label={name}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: A bounded table needs keyboard scrolling.
      tabIndex={0}
    >
      <table>
        <caption>
          {name}{" "}
          <span>
            {rows.length} {rows.length === 1 ? "row" : "rows"}
          </span>
        </caption>
        <thead>
          <tr>
            {columns.map((column, i) => (
              <th scope="col" key={i}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((value, j) => (
                <td key={j}>
                  <code>{literal(value)}</code>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? <p className="muted">No rows</p> : null}
    </div>
  );
}
export function PythonInputData({ inputs }: { inputs: PythonInputs }) {
  return (
    <>
      {Object.entries(inputs).map(([name, value]) => {
        if (
          Array.isArray(value) &&
          value.length &&
          value.every((item) => item !== null && !Array.isArray(item) && typeof item === "object")
        ) {
          const records = value as { [key: string]: PythonValue }[];
          const columns = [...new Set(records.flatMap((item) => Object.keys(item)))];
          return (
            <Matrix
              key={name}
              name={name}
              columns={columns}
              rows={records.map((item) => columns.map((column) => item[column] ?? null))}
            />
          );
        }
        return (
          <figure className="python-input-value" key={name}>
            <figcaption>
              <code>{name}</code>
            </figcaption>
            <pre>
              <code>{literal(value)}</code>
            </pre>
          </figure>
        );
      })}
    </>
  );
}
export function PythonResultData({ result }: { result: PythonValue }) {
  if (
    result !== null &&
    !Array.isArray(result) &&
    typeof result === "object" &&
    Array.isArray(result["columns"]) &&
    result["columns"].every((c) => typeof c === "string") &&
    Array.isArray(result["rows"]) &&
    result["rows"].every(
      (row) => Array.isArray(row) && row.length === (result["columns"] as PythonValue[]).length,
    )
  )
    return (
      <Matrix
        name="Your result"
        columns={result["columns"] as string[]}
        rows={result["rows"] as PythonValue[][]}
      />
    );
  return (
    <section className="python-result-value" aria-label="Your result">
      <h2>Your result</h2>
      <pre>
        <code>{literal(result)}</code>
      </pre>
    </section>
  );
}
