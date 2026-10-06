import { readFile } from "node:fs/promises";
import type {
  PythonCall,
  PythonInputs,
  PythonProjectCollection,
  PythonTask,
  PythonValue,
} from "../../../packages/contracts/src/python-project.js";
const bundle = JSON.parse(await readFile(new URL("../bundle.json", import.meta.url), "utf8"));
const tasks: PythonTask[] = [];
function task(
  lessonId: string,
  id: string,
  title: string,
  prompt: string,
  solution: string,
  examples: [PythonInputs, PythonValue][],
  hints: string[],
  correction: string,
  explanation: string,
  call?: PythonCall,
) {
  const lesson = bundle.lessons.find((item: { id: string }) => item.id === lessonId);
  if (!lesson) throw new Error("Missing published Python lesson");
  tasks.push({
    id,
    title,
    prompt,
    lessonId,
    conceptIds: lesson.conceptIds,
    sourceIds: lesson.sourceIds,
    inputs: examples[0]![0],
    starter: call
      ? "# Define the requested function below.\n"
      : "# Use the supplied input variables.\nresult = None\n",
    hints,
    correction,
    solution,
    explanation,
    ...(call ? { call } : {}),
    cases: examples.map(([inputs, expected]) => ({ inputs, expected })),
  });
}
task(
  "run-and-bind",
  "labour-estimate",
  "Build a labour estimate",
  "A repair costs hours × rate plus callout. Calculate the labour subtotal before adding the callout fee. Assign the final amount to result.",
  "subtotal = hours * rate\nresult = subtotal + callout",
  [
    [{ hours: 2, rate: 40, callout: 15 }, 95],
    [{ hours: 5, rate: 18, callout: 0 }, 90],
    [{ hours: 0, rate: 32, callout: 12 }, 12],
  ],
  [
    "Follow which values each assignment needs.",
    "The callout fee is added once, after the hourly calculation.",
  ],
  "Keep the fixed callout fee outside the multiplication by hours.",
  "The hourly subtotal depends on hours and rate. Adding callout afterwards charges the fixed fee once.",
);
task(
  "numbers-and-types",
  "full-boxes",
  "Pack complete boxes",
  "items must fit into boxes of capacity. Assign result a dictionary with boxes for the number of full boxes and left for the remaining items.",
  "result = {'boxes': items // capacity, 'left': items % capacity}",
  [
    [
      { items: 23, capacity: 5 },
      { boxes: 4, left: 3 },
    ],
    [
      { items: 24, capacity: 6 },
      { boxes: 4, left: 0 },
    ],
    [
      { items: 0, capacity: 4 },
      { boxes: 0, left: 0 },
    ],
  ],
  [
    "Separate the whole-box count from the remainder.",
    "For nonnegative items, // gives the full-box count and % gives the leftover count.",
  ],
  "Ordinary division can return a fraction of a box. The task asks for whole boxes and a separate remainder.",
  "Integer division counts complete groups. Modulo preserves the items that do not fill another group.",
);
task(
  "strings-and-slices",
  "clean-part-name",
  "Extract a part name",
  "raw contains a part name and may include | followed by a batch code. Take the text before the first |, remove surrounding spaces and convert it to uppercase. Assign it to result.",
  "result = raw.split('|', 1)[0].strip().upper()",
  [
    [{ raw: " bolt |B12" }, "BOLT"],
    [{ raw: "Washer|B3|spare" }, "WASHER"],
    [{ raw: " nut " }, "NUT"],
  ],
  [
    "The batch code starts after the first delimiter.",
    "Split once, then apply the text methods to the first piece.",
  ],
  "Keep the part name alone. Spaces and later delimiters can vary between inputs.",
  "Splitting at the first delimiter preserves the whole name. strip and upper give a consistent identifier.",
);
task(
  "lists-and-tuples",
  "copy-work-steps",
  "Extend a work list",
  "Make a separate working copy of steps and append extra to it. Assign result a dictionary containing original and updated. The original list must keep its earlier values.",
  "working = steps.copy()\nworking.append(extra)\nresult = {'original': steps, 'updated': working}",
  [
    [
      { steps: ["cut", "drill"], extra: "sand" },
      { original: ["cut", "drill"], updated: ["cut", "drill", "sand"] },
    ],
    [
      { steps: [], extra: "inspect" },
      { original: [], updated: ["inspect"] },
    ],
    [
      { steps: ["check", "check"], extra: "test" },
      { original: ["check", "check"], updated: ["check", "check", "test"] },
    ],
  ],
  [
    "A second variable can still refer to the same list.",
    "Copy the list before appending the new step.",
  ],
  "Appending through another reference changes the original list too. Keep a separate list for the update.",
  "copy creates a new outer list. Appending to that copy leaves the original sequence intact.",
);
task(
  "keys-and-sets",
  "count-parts",
  "Count repeated parts",
  "Count how often each name appears in parts. Assign result a dictionary from each part name to its count. Preserve repeated observations in the counts.",
  "counts = {}\nfor part in parts:\n    counts[part] = counts.get(part, 0) + 1\nresult = counts",
  [
    [{ parts: ["bolt", "nut", "bolt"] }, { bolt: 2, nut: 1 }],
    [{ parts: [] }, {}],
    [{ parts: ["washer", "washer", "nut", "washer"] }, { washer: 3, nut: 1 }],
  ],
  [
    "Each dictionary key needs one running count.",
    "Start a previously unseen key at zero before adding one.",
  ],
  "A set removes repeats. This task needs the number of observations for each name.",
  "The dictionary combines repeated names under one key while retaining their frequencies.",
);
task(
  "conditions-and-loops",
  "approved-hour-total",
  "Select hours to total",
  "Add only the values in hours that are at least minimum. Assign the total to result. A list with no qualifying values must return zero.",
  "total = 0\nfor value in hours:\n    if value >= minimum:\n        total += value\nresult = total",
  [
    [{ hours: [1, 4, 2, 5], minimum: 3 }, 9],
    [{ hours: [-2, 0, 3], minimum: 0 }, 3],
    [{ hours: [1, 2], minimum: 5 }, 0],
  ],
  [
    "Test each value before adding it.",
    "Start the running total at zero so an empty selection has a defined result.",
  ],
  "The condition applies to each observation. Keep the qualifying values separate from those below the threshold.",
  "The loop adds a value only after its comparison passes. The initial zero also handles an empty selection.",
);
task(
  "functions-and-imports",
  "define-job-cost",
  "Write a reusable cost function",
  "Define job_cost(unit_price, quantity) to return their product. Run and Check call your function with the supplied inputs. The function must return the amount.",
  "def job_cost(unit_price, quantity):\n    return unit_price * quantity",
  [
    [{ unit_price: 3.5, quantity: 4 }, 14],
    [{ unit_price: 8, quantity: 0 }, 0],
    [{ unit_price: 0.25, quantity: 12 }, 3],
  ],
  [
    "The caller needs a returned value.",
    "Use the function's parameters rather than numbers from the displayed example.",
  ],
  "Printing an amount leaves the caller without a return value. Compute from the parameters and return the product.",
  "The checker calls job_cost with each input pair. Returning the product makes the same function usable for other orders.",
  { name: "job_cost", arguments: ["unit_price", "quantity"] },
);
task(
  "errors-and-resources",
  "parse-work-note",
  "Read a temporary work note",
  "Write text to /tmp/work-note.txt using with. Read it back using with and return it as an integer in result. If the text is not a valid integer, return None.",
  "with open('/tmp/work-note.txt', 'w') as note:\n    note.write(text)\nwith open('/tmp/work-note.txt') as note:\n    raw = note.read()\ntry:\n    result = int(raw)\nexcept ValueError:\n    result = None",
  [
    [{ text: " 12\n" }, 12],
    [{ text: "unknown" }, null],
    [{ text: "-3" }, -3],
  ],
  [
    "Use with around each opened file.",
    "Catch the conversion's ValueError so an invalid observation has an explicit missing result.",
  ],
  "A text value can fail integer conversion. Handle that failure without replacing a valid zero or negative number.",
  "The with blocks close their files. The conversion returns an integer when possible and None for invalid text.",
);
task(
  "arrays-and-shape",
  "reshape-readings",
  "Arrange readings into rows",
  "Convert readings to a NumPy array. Reshape it using the supplied rows and columns, then assign the array to result. Each case supplies exactly enough readings.",
  "import numpy as np\nresult = np.array(readings).reshape(rows, columns)",
  [
    [
      { readings: [1, 2, 3, 4, 5, 6], rows: 2, columns: 3 },
      [
        [1, 2, 3],
        [4, 5, 6],
      ],
    ],
    [{ readings: [8, 4, 2, 1], rows: 4, columns: 1 }, [[8], [4], [2], [1]]],
    [{ readings: [0, -2, 5], rows: 1, columns: 3 }, [[0, -2, 5]]],
  ],
  [
    "The dimensions must multiply to the number of readings.",
    "reshape receives the requested row and column counts.",
  ],
  "The requested shape determines where each reading belongs. Preserve the original reading order.",
  "reshape changes the arrangement of the same values. The number of elements stays constant.",
);
task(
  "array-calculations",
  "row-totals",
  "Total each work session",
  "Each inner list in sessions holds one session's readings. Use NumPy to total each row and assign the resulting one-dimensional array to result.",
  "import numpy as np\nresult = np.array(sessions).sum(axis=1)",
  [
    [
      {
        sessions: [
          [2, 3, 1],
          [4, 0, 2],
        ],
      },
      [6, 6],
    ],
    [
      {
        sessions: [
          [1, 1],
          [2, 4],
          [0, 3],
        ],
      },
      [2, 6, 3],
    ],
    [{ sessions: [[-2, 5, 0]] }, [3]],
  ],
  ["One output belongs to each row.", "Summing across columns uses axis=1."],
  "A single grand total loses the session boundaries. Reduce across each row separately.",
  "axis=1 removes the column dimension, leaving one total per session.",
);
task(
  "ranges-and-randomness",
  "range-boundaries",
  "Choose the range endpoints",
  "Assign result a dictionary with ticks from NumPy arange(start, stop, step) and samples from linspace(start, stop, count). Keep each function's endpoint rule.",
  "import numpy as np\nresult = {'ticks': np.arange(start, stop, step), 'samples': np.linspace(start, stop, count)}",
  [
    [
      { start: 0, stop: 6, step: 2, count: 4 },
      { ticks: [0, 2, 4], samples: [0, 2, 4, 6] },
    ],
    [
      { start: 2, stop: 10, step: 3, count: 3 },
      { ticks: [2, 5, 8], samples: [2, 6, 10] },
    ],
    [
      { start: -2, stop: 2, step: 1, count: 3 },
      { ticks: [-2, -1, 0, 1], samples: [-2, 0, 2] },
    ],
  ],
  [
    "The two functions describe spacing differently.",
    "arange uses a step and excludes stop. linspace uses a count and includes stop by default.",
  ],
  "Keep the exclusive arange stop separate from linspace's included endpoint.",
  "arange produces step-spaced ticks before stop. linspace spreads the requested number of samples across both endpoints.",
);
task(
  "read-and-inspect",
  "read-csv-preview",
  "Inspect an incoming CSV",
  "Read csv_text with pandas and StringIO. Assign the first two rows, with their original columns, to result as a DataFrame.",
  "from io import StringIO\nimport pandas as pd\nresult = pd.read_csv(StringIO(csv_text)).head(2)",
  [
    [
      { csv_text: "job,hours\nA,2\nB,4\nC,3\n" },
      {
        columns: ["job", "hours"],
        rows: [
          ["A", 2],
          ["B", 4],
        ],
      },
    ],
    [
      { csv_text: "part,price\nbolt,\nnut,0\n" },
      {
        columns: ["part", "price"],
        rows: [
          ["bolt", null],
          ["nut", 0],
        ],
      },
    ],
    [{ csv_text: "job,hours\n" }, { columns: ["job", "hours"], rows: [] }],
  ],
  [
    "StringIO gives the CSV reader a file-like text stream.",
    "head(2) retains up to two rows without changing the column names.",
  ],
  "Use the CSV header as columns. An empty field stays missing, and a short file can contain fewer than two rows.",
  "read_csv parses the stream into a table. head limits its preview while preserving the data's columns.",
);
task(
  "labels-and-positions",
  "inclusive-label-range",
  "Select a label range",
  "Build a pandas Series from values with labels as its index. Assign the label slice from first through last, including both labels, to result.",
  "import pandas as pd\nseries = pd.Series(values, index=labels)\nresult = series.loc[first:last]",
  [
    [{ labels: ["J1", "J4", "J7"], values: [20, 35, 10], first: "J1", last: "J4" }, [20, 35]],
    [{ labels: ["J2", "J3", "J9"], values: [1, 5, 8], first: "J3", last: "J9" }, [5, 8]],
    [{ labels: ["J4", "J8"], values: [0, 12], first: "J4", last: "J8" }, [0, 12]],
  ],
  ["The endpoints are index labels.", "A sorted loc label slice includes its last existing label."],
  "Positional slicing excludes its stop. This task asks for an inclusive label slice.",
  "loc uses the supplied labels and includes the two endpoints. The Series result retains their values.",
);
task(
  "filters-and-columns",
  "ready-estimates",
  "Keep ready estimates",
  "Build a DataFrame from jobs. Calculate estimate as hours × rate. Keep ready jobs with estimates at least minimum. Assign columns job and estimate, in original row order, to result.",
  "import pandas as pd\ndf = pd.DataFrame(jobs)\ndf['estimate'] = df['hours'] * df['rate']\nresult = df.loc[df['ready'] & (df['estimate'] >= minimum), ['job', 'estimate']]",
  [
    [
      {
        jobs: [
          { job: "A", hours: 2, rate: 30, ready: true },
          { job: "B", hours: 1, rate: 50, ready: false },
          { job: "C", hours: 3, rate: 15, ready: true },
        ],
        minimum: 50,
      },
      { columns: ["job", "estimate"], rows: [["A", 60]] },
    ],
    [
      {
        jobs: [
          { job: "D", hours: 1, rate: 20, ready: true },
          { job: "E", hours: 4, rate: 20, ready: true },
        ],
        minimum: 50,
      },
      { columns: ["job", "estimate"], rows: [["E", 80]] },
    ],
    [
      {
        jobs: [
          { job: "F", hours: 0, rate: 90, ready: true },
          { job: "G", hours: 2, rate: 10, ready: false },
        ],
        minimum: 0,
      },
      { columns: ["job", "estimate"], rows: [["F", 0]] },
    ],
  ],
  [
    "Both conditions must pass for the same row.",
    "Parenthesize the comparison before combining it with the Boolean ready column.",
  ],
  "Calculate the estimate from each row, then apply ready and the minimum together. A known zero can qualify.",
  "The derived column keeps each calculation aligned with its job. The Boolean mask retains only qualifying rows.",
);
task(
  "missing-values",
  "known-hour-summary",
  "Keep unknown hours separate",
  "Build a pandas Series from hours. Assign result a dictionary with known for nonmissing count, unknown for missing count and total for the sum of known values. A list containing only missing values has total zero.",
  "import pandas as pd\nseries = pd.Series(hours)\nresult = {'known': series.count(), 'unknown': series.isna().sum(), 'total': series.sum()}",
  [
    [{ hours: [2, null, 0, 5] }, { known: 3, unknown: 1, total: 7 }],
    [{ hours: [null, null] }, { known: 0, unknown: 2, total: 0 }],
    [{ hours: [-1, 3, null] }, { known: 2, unknown: 1, total: 2 }],
  ],
  [
    "A known zero is still an observation.",
    "count excludes missing values. isna identifies the missing observations.",
  ],
  "Keep missing observations out of known count. Preserve zero and negative values in the known total.",
  "The counts retain the denominator information beside the sum. pandas sum returns zero for an all-missing Series by default.",
);
task(
  "text-and-transformations",
  "count-clean-tags",
  "Count usable tags",
  "Use a pandas Series to count the nonempty comma-separated tags in each entry of tags. Ignore surrounding spaces and empty pieces. Missing entries have zero tags. Assign the counts to result.",
  "import pandas as pd\nseries = pd.Series(tags)\nresult = series.map(lambda value: 0 if pd.isna(value) else len([part for part in value.split(',') if part.strip()]))",
  [
    [{ tags: [" bolt, nut ", "washer", null] }, [2, 1, 0]],
    [{ tags: ["", "nut,,bolt", " , "] }, [0, 2, 0]],
    [{ tags: ["gear", null, "washer, bolt, nut"] }, [1, 0, 3]],
  ],
  [
    "An empty split piece is not a usable tag.",
    "Test missing values before calling a string method.",
  ],
  "Missing text cannot be split. Filter blank pieces after splitting so extra delimiters do not increase the count.",
  "The transformation handles each entry independently. It counts only pieces that contain text after trimming.",
);
task(
  "dates-and-units",
  "parse-calendar-years",
  "Read calendar years",
  "Parse dates as YYYY-MM-DD with pandas. Invalid values become missing. Assign the years as a nullable integer Series to result.",
  "import pandas as pd\nparsed = pd.to_datetime(pd.Series(dates), format='%Y-%m-%d', errors='coerce')\nresult = parsed.dt.year.astype('Int64')",
  [
    [{ dates: ["2025-01-03", "bad", "2026-12-31"] }, [2025, null, 2026]],
    [{ dates: ["2024-02-29", "2025-02-29"] }, [2024, null]],
    [{ dates: [null, "2000-01-01"] }, [null, 2000]],
  ],
  [
    "Make the expected date format explicit.",
    "Coerce invalid dates, then use the datetime accessor for year.",
  ],
  "An invalid calendar date stays missing. Keep it separate from a valid year.",
  "The explicit format removes date-order guessing. Nullable integer years preserve failed parses.",
);
task(
  "summaries-and-groups",
  "department-hours",
  "Summarise department hours",
  "Group records by department and sort departments ascending. Return a DataFrame with department, rows, known and total. total must stay missing if a department has no known hours.",
  "import pandas as pd\ndf = pd.DataFrame(records, columns=['department', 'hours'])\nresult = df.groupby('department', sort=True)['hours'].agg(rows='size', known='count', total=lambda x: x.sum(min_count=1)).reset_index()",
  [
    [
      {
        records: [
          { department: "A", hours: 2 },
          { department: "A", hours: null },
          { department: "B", hours: 0 },
          { department: "B", hours: 4 },
        ],
      },
      {
        columns: ["department", "rows", "known", "total"],
        rows: [
          ["A", 2, 1, 2],
          ["B", 2, 2, 4],
        ],
      },
    ],
    [
      {
        records: [
          { department: "A", hours: null },
          { department: "C", hours: 5 },
          { department: "C", hours: -1 },
        ],
      },
      {
        columns: ["department", "rows", "known", "total"],
        rows: [
          ["A", 1, 0, null],
          ["C", 2, 2, 4],
        ],
      },
    ],
    [{ records: [] }, { columns: ["department", "rows", "known", "total"], rows: [] }],
  ],
  [
    "size and count use different denominators.",
    "Require at least one known value when summing each group.",
  ],
  "Report the total row count beside the known-value count. An entirely unknown group has no known total.",
  "The aggregation keeps row count, available observations and their sum together. min_count=1 preserves an unknown total.",
);
task(
  "combine-tables",
  "validate-price-join",
  "Check a price lookup",
  "Left-join jobs to prices on part with many_to_one validation. Return only job and price in job order. If a part appears more than once in prices, return None.",
  "import pandas as pd\njobs_df = pd.DataFrame(jobs)\nprices_df = pd.DataFrame(prices)\ntry:\n    result = jobs_df.merge(prices_df, on='part', how='left', validate='many_to_one')[['job', 'price']]\nexcept pd.errors.MergeError:\n    result = None",
  [
    [
      {
        jobs: [
          { job: "A", part: "bolt" },
          { job: "B", part: "other" },
        ],
        prices: [
          { part: "bolt", price: 2 },
          { part: "nut", price: 1 },
        ],
      },
      {
        columns: ["job", "price"],
        rows: [
          ["A", 2],
          ["B", null],
        ],
      },
    ],
    [
      {
        jobs: [{ job: "C", part: "bolt" }],
        prices: [
          { part: "bolt", price: 2 },
          { part: "bolt", price: 3 },
        ],
      },
      null,
    ],
    [
      {
        jobs: [
          { job: "D", part: "bolt" },
          { job: "E", part: "bolt" },
        ],
        prices: [{ part: "bolt", price: 0 }],
      },
      {
        columns: ["job", "price"],
        rows: [
          ["D", 0],
          ["E", 0],
        ],
      },
    ],
  ],
  [
    "The lookup should have one row per part.",
    "many_to_one permits repeated parts in jobs and checks uniqueness in prices.",
  ],
  "An unmatched job stays in a left join. Duplicate lookup keys must be detected before they multiply the jobs.",
  "Relationship validation checks the lookup's key grain. The left join then preserves every job, including unmatched ones.",
);
task(
  "reshape-a-report",
  "pivot-shift-totals",
  "Lay out shift totals",
  "Sum units by area and period. Return a wide DataFrame with area, morning and afternoon, sorted by area. Missing area-period combinations count as zero; units are known counts.",
  "import pandas as pd\ndf = pd.DataFrame(records, columns=['area', 'period', 'units'])\nwide = df.pivot_table(index='area', columns='period', values='units', aggfunc='sum', fill_value=0)\nresult = wide.reindex(columns=['morning', 'afternoon'], fill_value=0).reset_index()",
  [
    [
      {
        records: [
          { area: "A", period: "morning", units: 2 },
          { area: "A", period: "morning", units: 3 },
          { area: "A", period: "afternoon", units: 1 },
          { area: "B", period: "afternoon", units: 4 },
        ],
      },
      {
        columns: ["area", "morning", "afternoon"],
        rows: [
          ["A", 5, 1],
          ["B", 0, 4],
        ],
      },
    ],
    [
      {
        records: [
          { area: "A", period: "morning", units: 0 },
          { area: "C", period: "morning", units: 2 },
          { area: "C", period: "afternoon", units: 3 },
        ],
      },
      {
        columns: ["area", "morning", "afternoon"],
        rows: [
          ["A", 0, 0],
          ["C", 2, 3],
        ],
      },
    ],
    [{ records: [] }, { columns: ["area", "morning", "afternoon"], rows: [] }],
  ],
  [
    "Repeated area-period observations need aggregation.",
    "Keep both requested period columns even when one has no observations.",
  ],
  "A plain pivot can fail on repeated keys. Sum their known counts and preserve the requested column layout.",
  "pivot_table combines repeated observations before widening the table. Reindex keeps the two report columns consistent.",
);
task(
  "reshape-a-report",
  "melt-shift-report",
  "Return a report to observations",
  "Melt report into columns area, period and units. Keep both morning and afternoon observations, including zeros. Sort by area and then period ascending.",
  "import pandas as pd\ndf = pd.DataFrame(report, columns=['area', 'morning', 'afternoon'])\nresult = df.melt(id_vars='area', value_vars=['morning', 'afternoon'], var_name='period', value_name='units').sort_values(['area', 'period']).reset_index(drop=True)",
  [
    [
      {
        report: [
          { area: "A", morning: 5, afternoon: 1 },
          { area: "B", morning: 0, afternoon: 4 },
        ],
      },
      {
        columns: ["area", "period", "units"],
        rows: [
          ["A", "afternoon", 1],
          ["A", "morning", 5],
          ["B", "afternoon", 4],
          ["B", "morning", 0],
        ],
      },
    ],
    [
      { report: [{ area: "C", morning: 2, afternoon: 0 }] },
      {
        columns: ["area", "period", "units"],
        rows: [
          ["C", "afternoon", 0],
          ["C", "morning", 2],
        ],
      },
    ],
    [{ report: [] }, { columns: ["area", "period", "units"], rows: [] }],
  ],
  ["area identifies the report row.", "The period names become values in a new column."],
  "Preserve both observations for each area. A known zero is part of the data.",
  "melt turns period columns into labelled observations. Sorting defines the requested output order.",
);
task(
  "audit-a-sales-report",
  "auditable-revenue",
  "Build an auditable revenue report",
  "Left-join sales to the unique prices lookup by part. Calculate units × price. Return department, known_revenue and unknown_prices, sorted by department. Keep known_revenue missing when every price in that department is unknown.",
  "import pandas as pd\nsales_df = pd.DataFrame(sales)\nprices_df = pd.DataFrame(prices)\njoined = sales_df.merge(prices_df, on='part', how='left', validate='many_to_one')\njoined['revenue'] = joined['units'] * joined['price']\njoined['unknown'] = joined['price'].isna()\nresult = joined.groupby('department', sort=True).agg(known_revenue=('revenue', lambda x: x.sum(min_count=1)), unknown_prices=('unknown', 'sum')).reset_index()",
  [
    [
      {
        sales: [
          { department: "A", part: "bolt", units: 2 },
          { department: "A", part: "other", units: 1 },
          { department: "B", part: "nut", units: 3 },
        ],
        prices: [
          { part: "bolt", price: 3 },
          { part: "nut", price: 2 },
        ],
      },
      {
        columns: ["department", "known_revenue", "unknown_prices"],
        rows: [
          ["A", 6, 1],
          ["B", 6, 0],
        ],
      },
    ],
    [
      {
        sales: [
          { department: "A", part: "bolt", units: 0 },
          { department: "B", part: "other", units: 2 },
        ],
        prices: [{ part: "bolt", price: 4 }],
      },
      {
        columns: ["department", "known_revenue", "unknown_prices"],
        rows: [
          ["A", 0, 0],
          ["B", null, 1],
        ],
      },
    ],
    [
      {
        sales: [
          { department: "A", part: "nut", units: 2 },
          { department: "A", part: "bolt", units: 3 },
          { department: "C", part: "other", units: 2 },
        ],
        prices: [
          { part: "bolt", price: 2 },
          { part: "nut", price: 5 },
        ],
      },
      {
        columns: ["department", "known_revenue", "unknown_prices"],
        rows: [
          ["A", 16, 0],
          ["C", null, 1],
        ],
      },
    ],
  ],
  [
    "Check the price lookup's grain before aggregating.",
    "Track missing prices beside the known revenue instead of turning them into zeros.",
  ],
  "Keep unmatched sales and count their unknown prices. A wholly unknown department needs a missing revenue total.",
  "The validated left join preserves sales grain. The report presents the known subtotal beside the amount of missing price evidence.",
);

export const pythonProjects: PythonProjectCollection = {
  courseId: bundle.course.id,
  projects: [
    {
      id: "python-workshop-tools",
      version: "1.0.0",
      title: "Write your workshop tools",
      description:
        "Write small programs that calculate job costs, clean text and handle work notes.",
      tasks: tasks.slice(0, 8),
    },
    {
      id: "python-measurements-and-tables",
      version: "1.0.0",
      title: "Turn readings into tables",
      description: "Shape arrays, inspect CSV data and select the rows a report needs.",
      tasks: tasks.slice(8, 14),
    },
    {
      id: "python-reliable-reports",
      version: "1.0.0",
      title: "Build reports you can trust",
      description:
        "Handle missing observations, check joins and create a revenue report with a visible evidence gap.",
      tasks: tasks.slice(14),
    },
  ],
};
