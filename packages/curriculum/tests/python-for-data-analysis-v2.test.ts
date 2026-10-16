import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { validateCourseBundle } from "../src/index.js";

/**
 * Python for Data Analysis, v2 lessons (all 21). Every numeric key is recomputed here two ways:
 * the expected value is written out in this file, and the snippet that produces it is run with
 * Python (pure-Python snippets always, NumPy and pandas snippets when those packages are
 * importable by the python3 on the PATH). The recorded diagrams are verified separately by
 * scripts/python-examples.py --verify; no diagram or execution manifest was changed.
 */
const candidate = JSON.parse(
  readFileSync(
    new URL("../../../content/python-for-data-analysis/.authoring/candidate.json", import.meta.url),
    "utf8",
  ),
) as CourseBundle;
const question = (id: string): Question => {
  const found = candidate.questions.find((item) => item.id === id);
  if (!found) throw new Error(`missing question ${id}`);
  return found;
};

type Row = {
  id: string;
  kind: "n" | "c";
  expect: number | string | boolean | null;
  choice?: string;
  code: string | null;
};
const ROWS: Row[] = [
 {
  "id": "python-array-calculations-1",
  "kind": "n",
  "expect": 15,
  "code": "import numpy as np\nanswer = (np.array([1, 3, 5]) + 2).sum()"
 },
 {
  "id": "python-array-calculations-2",
  "kind": "n",
  "expect": 8,
  "code": "import numpy as np\nanswer = np.array([[2, 4], [6, 8]]).sum(axis=0)[0]"
 },
 {
  "id": "python-array-calculations-3",
  "kind": "n",
  "expect": 32,
  "code": "import numpy as np\nanswer = (np.array([[5, 6], [7, 8]]) + np.array([1, 2])).sum()"
 },
 {
  "id": "python-array-calculations-4",
  "kind": "n",
  "expect": 7,
  "code": "import numpy as np\na = np.array([7, 8, 9])\nb = a[:2].copy()\nb[0] = 50\nanswer = a[0]"
 },
 {
  "id": "python-array-calculations-5",
  "kind": "n",
  "expect": 5,
  "code": "import numpy as np\nanswer = np.array([[3, 7], [2, 8]]).mean(axis=1)[1]"
 },
 {
  "id": "python-array-calculations-6",
  "kind": "n",
  "expect": 20,
  "code": "import numpy as np\na = np.array([5, 6, 7])\nb = a[:2]\nb[1] = 20\nanswer = a[1]"
 },
 {
  "id": "python-array-calculations-7",
  "kind": "n",
  "expect": 34,
  "code": "import numpy as np\nanswer = (np.array([2, 4, 8]) * np.array([1, 2, 3])).sum()"
 },
 {
  "id": "python-array-calculations-hook",
  "kind": "n",
  "expect": 7,
  "code": "2 + 5"
 },
 {
  "id": "python-array-calculations-broadcast-check",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-array-calculations-axis-check",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-array-calculations-why-two-results",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-array-calculations-faded-second",
  "kind": "n",
  "expect": 12,
  "code": "import numpy as np\nanswer = np.array([[2, 4], [6, 8]]).sum(axis=0)[1]"
 },
 {
  "id": "python-arrays-and-shape-1",
  "kind": "n",
  "expect": 16,
  "code": "import numpy as np\nanswer = (np.array([3, 5]) * 2).sum()"
 },
 {
  "id": "python-arrays-and-shape-2",
  "kind": "n",
  "expect": 12,
  "code": "3 * 4"
 },
 {
  "id": "python-arrays-and-shape-3",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-arrays-and-shape-4",
  "kind": "n",
  "expect": 200,
  "code": "import numpy as np\nanswer = np.zeros(100, dtype=np.int16).nbytes"
 },
 {
  "id": "python-arrays-and-shape-5",
  "kind": "n",
  "expect": 6,
  "code": "import numpy as np\nanswer = np.arange(18).reshape(3, -1).shape[1]"
 },
 {
  "id": "python-arrays-and-shape-6",
  "kind": "n",
  "expect": 3,
  "code": "import numpy as np\nanswer = np.zeros((2, 3, 4)).ndim"
 },
 {
  "id": "python-arrays-and-shape-7",
  "kind": "n",
  "expect": 9,
  "code": "len([4, 5, 6] * 3)"
 },
 {
  "id": "python-arrays-and-shape-hook",
  "kind": "n",
  "expect": 30,
  "code": "5 * 6"
 },
 {
  "id": "python-arrays-and-shape-shape-check",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-arrays-and-shape-why-rows-first",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-arrays-and-shape-faded-ndim",
  "kind": "n",
  "expect": 2,
  "code": "import numpy as np\nanswer = np.zeros((3, 4)).ndim"
 },
 {
  "id": "python-arrays-and-shape-infer-rows",
  "kind": "n",
  "expect": 5,
  "code": "import numpy as np\nanswer = np.arange(20).reshape(-1, 4).shape[0]"
 },
 {
  "id": "python-audit-a-sales-report-1",
  "kind": "n",
  "expect": 1,
  "code": "import pandas as pd\nanswer = int(pd.Series([1, 2, 2, 3]).duplicated().sum())"
 },
 {
  "id": "python-audit-a-sales-report-2",
  "kind": "n",
  "expect": 3,
  "code": "sum([True, False, True, True])"
 },
 {
  "id": "python-audit-a-sales-report-3",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-audit-a-sales-report-4",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-audit-a-sales-report-5",
  "kind": "n",
  "expect": 29,
  "code": "2 * 7 + 3 * 5"
 },
 {
  "id": "python-audit-a-sales-report-6",
  "kind": "n",
  "expect": 53,
  "code": "2 * 7 + 3 * 5 + 4 * 6"
 },
 {
  "id": "python-audit-a-sales-report-7",
  "kind": "n",
  "expect": 2,
  "code": "import pandas as pd\ndf = pd.DataFrame({'paid': [True, True, False, True], 'price': [5, None, 4, 3]})\nanswer = int((df['paid'] & df['price'].notna()).sum())"
 },
 {
  "id": "python-audit-a-sales-report-hook",
  "kind": "n",
  "expect": 38,
  "code": "5 * 4 + 3 * 6"
 },
 {
  "id": "python-audit-a-sales-report-grain-check",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-audit-a-sales-report-faded-excluded",
  "kind": "n",
  "expect": 1,
  "code": "sum([not x for x in [True, False, True, True]])"
 },
 {
  "id": "python-audit-a-sales-report-inflated-rows",
  "kind": "n",
  "expect": 7,
  "code": "import pandas as pd\no = pd.DataFrame({'shop': ['Bay', 'Bay', 'Hill', 'Lake', 'Hill']})\nl = pd.DataFrame({'shop': ['Bay', 'Bay', 'Hill', 'Lake'], 'region': list('abcd')})\nanswer = len(o.merge(l, on='shop', how='left'))"
 },
 {
  "id": "python-audit-a-sales-report-confirmed",
  "kind": "n",
  "expect": 28,
  "code": "2 * 5 + 3 * 6"
 },
 {
  "id": "python-combine-tables-1",
  "kind": "n",
  "expect": 7,
  "code": "import pandas as pd\nanswer = len(pd.concat([pd.DataFrame({'a': [1, 2, 3]}), pd.DataFrame({'a': [1, 2, 3, 4]})]))"
 },
 {
  "id": "python-combine-tables-2",
  "kind": "n",
  "expect": 3,
  "code": "import pandas as pd\nanswer = len(pd.DataFrame({'k': [1, 2, 3]}).merge(pd.DataFrame({'k': [1, 2], 'r': [5, 6]}), on='k', how='left'))"
 },
 {
  "id": "python-combine-tables-3",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-combine-tables-4",
  "kind": "n",
  "expect": 2,
  "code": "import pandas as pd\na = pd.DataFrame({'id': [1, None], 'amount': [5, 9]})\nb = pd.DataFrame({'id': [1, None], 'region': ['East', 'Unknown']})\nanswer = int(a.merge(b, on='id', how='left')['region'].notna().sum())"
 },
 {
  "id": "python-combine-tables-5",
  "kind": "n",
  "expect": 6,
  "code": "3 * 2"
 },
 {
  "id": "python-combine-tables-6",
  "kind": "n",
  "expect": 3,
  "code": "import pandas as pd\nanswer = len(pd.DataFrame({'k': [1, 1, 2, 3]}).merge(pd.DataFrame({'k': [1, 2], 'r': [5, 6]}), on='k', how='inner'))"
 },
 {
  "id": "python-combine-tables-7",
  "kind": "n",
  "expect": 3,
  "code": "import pandas as pd\na = pd.DataFrame({'x': [1, 2, 3]})\nb = pd.DataFrame({'x': [4, 5, 6]})\nanswer = len(set(pd.concat([a, b]).index))"
 },
 {
  "id": "python-combine-tables-hook",
  "kind": "n",
  "expect": 8,
  "code": "4 * 2"
 },
 {
  "id": "python-combine-tables-dedupe-check",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-combine-tables-why-left",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-combine-tables-faded-matches",
  "kind": "n",
  "expect": 2,
  "code": "len([k for k in [1, 2, 3] if k in [1, 2]])"
 },
 {
  "id": "python-combine-tables-pairs",
  "kind": "n",
  "expect": 10,
  "code": "import pandas as pd\nl = pd.DataFrame({'k': [1] * 5, 'a': range(5)})\nr = pd.DataFrame({'k': [1] * 2, 'b': range(2)})\nanswer = len(l.merge(r, on='k'))"
 },
 {
  "id": "python-conditions-and-loops-1",
  "kind": "n",
  "expect": 2,
  "code": "units = 7\nif units >= 10:\n    fee = 0\nelif units >= 5:\n    fee = 2\nelse:\n    fee = 4\nanswer = fee"
 },
 {
  "id": "python-conditions-and-loops-2",
  "kind": "n",
  "expect": 20,
  "code": "sum(range(2, 9, 2))"
 },
 {
  "id": "python-conditions-and-loops-3",
  "kind": "n",
  "expect": 4,
  "code": "count = 0\nturns = 0\nwhile count < 7:\n    count += 2\n    turns += 1\nanswer = turns"
 },
 {
  "id": "python-conditions-and-loops-4",
  "kind": "n",
  "expect": 1,
  "code": "x = 6\nanswer = sum([x > 3 and x < 9, x > 8 or x < 2, not x > 5])"
 },
 {
  "id": "python-conditions-and-loops-5",
  "kind": "n",
  "expect": 11,
  "code": "x = 2\nwhile x < 10:\n    x += 3\nanswer = x"
 },
 {
  "id": "python-conditions-and-loops-6",
  "kind": "n",
  "expect": 1,
  "code": "5 & 3"
 },
 {
  "id": "python-conditions-and-loops-hook",
  "kind": "n",
  "expect": 5,
  "code": "5"
 },
 {
  "id": "python-conditions-and-loops-equals-check",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-conditions-and-loops-range-check",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-conditions-and-loops-why-zero",
  "kind": "c",
  "choice": "b",
  "code": null,
  "expect": null
 },
 {
  "id": "python-conditions-and-loops-faded-runs",
  "kind": "n",
  "expect": 3,
  "code": "len(range(3, 12, 3))"
 },
 {
  "id": "python-conditions-and-loops-faded-total",
  "kind": "n",
  "expect": 18,
  "code": "total = 0\nfor item in range(3, 12, 3):\n    total += item\nanswer = total"
 },
 {
  "id": "python-dates-and-units-1",
  "kind": "n",
  "expect": 9,
  "code": "import pandas as pd\nanswer = pd.to_datetime(pd.Series(['05/09/2026']), format='%d/%m/%Y').dt.month[0]"
 },
 {
  "id": "python-dates-and-units-2",
  "kind": "n",
  "expect": 2,
  "code": "import pandas as pd\nanswer = int(pd.to_datetime(pd.Series(['2026-02-30', '2026-03-01', 'bad']), format='%Y-%m-%d', errors='coerce').isna().sum())"
 },
 {
  "id": "python-dates-and-units-3",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-dates-and-units-4",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-dates-and-units-5",
  "kind": "n",
  "expect": 180,
  "code": "300 - 120"
 },
 {
  "id": "python-dates-and-units-6",
  "kind": "n",
  "expect": 5,
  "code": "import pandas as pd\nanswer = (pd.Timestamp('2026-06-07') - pd.Timestamp('2026-06-02')).days"
 },
 {
  "id": "python-dates-and-units-7",
  "kind": "n",
  "expect": 11,
  "code": "import pandas as pd\nanswer = pd.Series(pd.to_datetime(['2026-11-15'])).dt.month[0]"
 },
 {
  "id": "python-dates-and-units-hook",
  "kind": "n",
  "expect": 4,
  "code": "int('03/04/2026'.split('/')[1])"
 },
 {
  "id": "python-dates-and-units-format-check",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-dates-and-units-faded-real",
  "kind": "n",
  "expect": 1,
  "code": "import pandas as pd\nanswer = int(pd.to_datetime(pd.Series(['2026-02-30', '2026-03-01']), format='%Y-%m-%d', errors='coerce').notna().sum())"
 },
 {
  "id": "python-dates-and-units-minutes-apart",
  "kind": "n",
  "expect": 60,
  "code": "(4600 - 1000) / 60"
 },
 {
  "id": "python-dates-and-units-month-end",
  "kind": "n",
  "expect": 4,
  "code": "import pandas as pd\nanswer = (pd.Timestamp('2026-03-02') - pd.Timestamp('2026-02-26')).days"
 },
 {
  "id": "python-errors-and-resources-1",
  "kind": "n",
  "expect": 24,
  "code": "text = '24'\ntry:\n    value = int(text)\nexcept ValueError:\n    value = 0\nanswer = value"
 },
 {
  "id": "python-errors-and-resources-2",
  "kind": "n",
  "expect": 10,
  "code": "total = 0\nfor t in ['4', 'bad', '6', '?']:\n    try:\n        total += int(t)\n    except ValueError:\n        pass\nanswer = total"
 },
 {
  "id": "python-errors-and-resources-3",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-errors-and-resources-4",
  "kind": "n",
  "expect": 3,
  "code": "len({'a', 'b', 'c'})"
 },
 {
  "id": "python-errors-and-resources-5",
  "kind": "n",
  "expect": 2,
  "code": "n = 0\nfor t in ['7', '8.5', 'no', '2']:\n    try:\n        int(t)\n    except ValueError:\n        n += 1\nanswer = n"
 },
 {
  "id": "python-errors-and-resources-6",
  "kind": "n",
  "expect": 14,
  "code": "sum(int(x) for x in ['5', '', '9'] if x.strip())"
 },
 {
  "id": "python-errors-and-resources-7",
  "kind": "n",
  "expect": 13,
  "code": "total = 0\nfor text in ['1', 'x', '2']:\n    try:\n        total += int(text)\n    except ValueError:\n        total += 10\nanswer = total"
 },
 {
  "id": "python-errors-and-resources-hook",
  "kind": "n",
  "expect": 30,
  "code": "(24 + 36) / 2"
 },
 {
  "id": "python-errors-and-resources-error-check",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-errors-and-resources-why-count",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-errors-and-resources-rejected",
  "kind": "n",
  "expect": 2,
  "code": "n = 0\nfor t in ['4', 'bad', '6', '?']:\n    try:\n        int(t)\n    except ValueError:\n        n += 1\nanswer = n"
 },
 {
  "id": "python-errors-and-resources-rejected-share",
  "kind": "n",
  "expect": 60,
  "code": "n = 0\nfor t in ['10', 'x', '20', 'y', 'z']:\n    try:\n        int(t)\n    except ValueError:\n        n += 1\nanswer = n / 5 * 100"
 },
 {
  "id": "python-filters-and-columns-1",
  "kind": "n",
  "expect": 2,
  "code": "len([u for u in [1, 4, 6, 2] if u >= 4])"
 },
 {
  "id": "python-filters-and-columns-2",
  "kind": "n",
  "expect": 1,
  "code": "len([1 for s, u in [('Bay', 2), ('Bay', 5), ('Hill', 7)] if s == 'Bay' and u > 3])"
 },
 {
  "id": "python-filters-and-columns-3",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-filters-and-columns-4",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-filters-and-columns-5",
  "kind": "n",
  "expect": 29,
  "code": "2 * 7 + 3 * 5"
 },
 {
  "id": "python-filters-and-columns-6",
  "kind": "n",
  "expect": 15,
  "code": "import pandas as pd\ndf = pd.DataFrame({'x': range(5)})\ndf['fee'] = 3\nanswer = df['fee'].sum()"
 },
 {
  "id": "python-filters-and-columns-7",
  "kind": "n",
  "expect": 10,
  "code": "import pandas as pd\ndf = pd.DataFrame({'units': [1, 4, 6, 2]})\nanswer = df.loc[df['units'] >= 4, 'units'].sum()"
 },
 {
  "id": "python-filters-and-columns-hook",
  "kind": "n",
  "expect": 2,
  "code": "len([u for u in [2, 1, 3, 4] if u >= 3])"
 },
 {
  "id": "python-filters-and-columns-mask-check",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-filters-and-columns-faded-bay",
  "kind": "n",
  "expect": 2,
  "code": "len([s for s in ['Bay', 'Bay', 'Hill'] if s == 'Bay'])"
 },
 {
  "id": "python-filters-and-columns-revenue",
  "kind": "n",
  "expect": 33,
  "code": "import pandas as pd\ndf = pd.DataFrame({'units': [3, 4, 1], 'price': [2, 5, 7]})\nanswer = (df['units'] * df['price']).sum()"
 },
 {
  "id": "python-filters-and-columns-correct",
  "kind": "n",
  "expect": 34,
  "code": "import pandas as pd\ndf = pd.DataFrame({'shop': ['Bay', 'Hill', 'Bay', 'Hill'], 'price': [3, 7, 3, 7]})\ndf.loc[df['shop'] == 'Bay', 'price'] = 10\nanswer = df['price'].sum()"
 },
 {
  "id": "python-functions-and-imports-1",
  "kind": "n",
  "expect": 21,
  "code": "def triple(x):\n    return x * 3\nanswer = triple(7)"
 },
 {
  "id": "python-functions-and-imports-2",
  "kind": "n",
  "expect": 30,
  "code": "def cost(units, rate=4):\n    return units * rate\nanswer = cost(rate=6, units=5)"
 },
 {
  "id": "python-functions-and-imports-3",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-functions-and-imports-4",
  "kind": "n",
  "expect": 5,
  "code": "import math as m\nanswer = m.ceil(4.2)"
 },
 {
  "id": "python-functions-and-imports-5",
  "kind": "n",
  "expect": 32,
  "code": "def cost(units, rate=4):\n    return units * rate\nanswer = cost(8)"
 },
 {
  "id": "python-functions-and-imports-6",
  "kind": "n",
  "expect": 12,
  "code": "import math\nanswer = math.sqrt(144)"
 },
 {
  "id": "python-functions-and-imports-7",
  "kind": "n",
  "expect": 4,
  "code": "def f(x):\n    print(x)\n    return x + 1\nanswer = f(3)"
 },
 {
  "id": "python-functions-and-imports-hook",
  "kind": "n",
  "expect": 15,
  "code": "3 * 5"
 },
 {
  "id": "python-functions-and-imports-why-order",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-functions-and-imports-mutate",
  "kind": "n",
  "expect": 6,
  "code": "def grow(items):\n    items.append(7)\n    items.append(8)\nvalues = [1, 2, 3, 4]\ngrow(values)\nanswer = len(values)"
 },
 {
  "id": "python-keys-and-sets-1",
  "kind": "n",
  "expect": 2,
  "code": "d = {'a': 2, 'b': 5}\nd['a'] = 9\nanswer = len(d)"
 },
 {
  "id": "python-keys-and-sets-2",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-keys-and-sets-3",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-keys-and-sets-4",
  "kind": "n",
  "expect": 2,
  "code": "len({1, 3, 5} & {3, 4, 5})"
 },
 {
  "id": "python-keys-and-sets-5",
  "kind": "n",
  "expect": 3,
  "code": "len(set([2, 2, 4, 6, 4]))"
 },
 {
  "id": "python-keys-and-sets-6",
  "kind": "n",
  "expect": 10,
  "code": "{'a': 7}.get('b', 10)"
 },
 {
  "id": "python-keys-and-sets-7",
  "kind": "n",
  "expect": 13,
  "code": "d = {'x': 1}\nd['y'] = 5\nd['x'] = 8\nanswer = sum(d.values())"
 },
 {
  "id": "python-keys-and-sets-hook",
  "kind": "n",
  "expect": 7,
  "code": "4 + 3"
 },
 {
  "id": "python-keys-and-sets-add-check",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-keys-and-sets-get-missing",
  "kind": "n",
  "expect": 0,
  "code": "{'pen': 3, 'book': 2}.get('lamp', 0)"
 },
 {
  "id": "python-keys-and-sets-get-present",
  "kind": "n",
  "expect": 3,
  "code": "{'pen': 3, 'book': 2}.get('pen', 0)"
 },
 {
  "id": "python-keys-and-sets-add-twice",
  "kind": "n",
  "expect": 3,
  "code": "shops = {'Bay', 'Hill'}\nshops.add('Lake')\nshops.add('Bay')\nanswer = len(shops)"
 },
 {
  "id": "python-labels-and-positions-1",
  "kind": "n",
  "expect": 7,
  "code": "import pandas as pd\nanswer = pd.Series([4, 7, 9], index=[10, 20, 30]).loc[20]"
 },
 {
  "id": "python-labels-and-positions-2",
  "kind": "n",
  "expect": 3,
  "code": "import pandas as pd\nanswer = len(pd.DataFrame({'x': [1, 2, 3, 4]}, index=[10, 20, 30, 40]).loc[20:40])"
 },
 {
  "id": "python-labels-and-positions-3",
  "kind": "n",
  "expect": 2,
  "code": "import pandas as pd\nanswer = pd.DataFrame({'units': [3, 6, 9], 'price': [5, 7, 2]}, index=[10, 20, 30]).iloc[2, 1]"
 },
 {
  "id": "python-labels-and-positions-4",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-labels-and-positions-5",
  "kind": "n",
  "expect": 3,
  "code": "import pandas as pd\nanswer = len(pd.DataFrame({'x': range(6)}).iloc[1:4])"
 },
 {
  "id": "python-labels-and-positions-6",
  "kind": "n",
  "expect": 22,
  "code": "import pandas as pd\nanswer = pd.Series([11, 22], index=['b', 'a']).loc['a']"
 },
 {
  "id": "python-labels-and-positions-7",
  "kind": "n",
  "expect": 13,
  "code": "import pandas as pd\ns = pd.Series([4, 7, 9], index=[10, 20, 30])\nanswer = s.iloc[0] + s.loc[30]"
 },
 {
  "id": "python-labels-and-positions-hook",
  "kind": "n",
  "expect": 20,
  "code": "[10, 20, 30][1]"
 },
 {
  "id": "python-labels-and-positions-iloc-check",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-labels-and-positions-why-differ",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-labels-and-positions-faded-iloc",
  "kind": "n",
  "expect": 2,
  "code": "import pandas as pd\nanswer = len(pd.DataFrame({'x': [1, 2, 3, 4]}, index=[10, 20, 30, 40]).iloc[1:3])"
 },
 {
  "id": "python-labels-and-positions-align",
  "kind": "n",
  "expect": 60,
  "code": "import pandas as pd\ndf = pd.DataFrame({'a': ['x', 'y']}, index=[1, 2])\ndf['b'] = pd.Series([50, 60], index=[2, 1])\nanswer = df.loc[1, 'b']"
 },
 {
  "id": "python-lists-and-tuples-1",
  "kind": "n",
  "expect": 3,
  "code": "a = [1, 4]\nb = a\nb.append(7)\nanswer = len(a)"
 },
 {
  "id": "python-lists-and-tuples-2",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-lists-and-tuples-3",
  "kind": "n",
  "expect": 3,
  "code": "record = ('Bay', [1, 2])\nrecord[1].append(3)\nanswer = len(record[1])"
 },
 {
  "id": "python-lists-and-tuples-4",
  "kind": "n",
  "expect": 13,
  "code": "sum([2, 5, 8, 11][1:3])"
 },
 {
  "id": "python-lists-and-tuples-5",
  "kind": "n",
  "expect": 2,
  "code": "a = [3, 9]\nb = a.copy()\nb.append(12)\nanswer = len(a)"
 },
 {
  "id": "python-lists-and-tuples-6",
  "kind": "n",
  "expect": 6,
  "code": "len([4, 6] * 3)"
 },
 {
  "id": "python-lists-and-tuples-7",
  "kind": "n",
  "expect": 2,
  "code": "x = [2]\ny = x\ny.append(3)\nz = y.copy()\nz.append(4)\nanswer = len(x)"
 },
 {
  "id": "python-lists-and-tuples-hook",
  "kind": "n",
  "expect": 3,
  "code": "2 + 1"
 },
 {
  "id": "python-lists-and-tuples-alias-check",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-lists-and-tuples-shallow-check",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-lists-and-tuples-outer",
  "kind": "n",
  "expect": 2,
  "code": "a = [[1, 2], [3]]\nb = a.copy()\nb[0].append(9)\nanswer = len(a)"
 },
 {
  "id": "python-lists-and-tuples-inner",
  "kind": "n",
  "expect": 3,
  "code": "a = [[1, 2], [3]]\nb = a.copy()\nb[0].append(9)\nanswer = len(a[0])"
 },
 {
  "id": "python-missing-values-1",
  "kind": "n",
  "expect": 2,
  "code": "import pandas as pd\nanswer = int(pd.Series([0, None, 4, None], dtype='Float64').isna().sum())"
 },
 {
  "id": "python-missing-values-2",
  "kind": "n",
  "expect": 7,
  "code": "import pandas as pd\nanswer = pd.Series([4, None, 10], dtype='Float64').mean()"
 },
 {
  "id": "python-missing-values-3",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-missing-values-4",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-missing-values-5",
  "kind": "n",
  "expect": 4,
  "code": "import pandas as pd\nanswer = pd.Series([3, None, 9], dtype='Float64').fillna(0).mean()"
 },
 {
  "id": "python-missing-values-6",
  "kind": "n",
  "expect": 3,
  "code": "import pandas as pd\nanswer = int(pd.Series([1, None, None, 7, 0], dtype='Float64').count())"
 },
 {
  "id": "python-missing-values-7",
  "kind": "n",
  "expect": 2,
  "code": "import pandas as pd\ns = pd.Series([1, None, None, 7, 0], dtype='Float64')\nanswer = int(s.size - s.count())"
 },
 {
  "id": "python-missing-values-hook",
  "kind": "n",
  "expect": 3,
  "code": "len([2, 0, 4])"
 },
 {
  "id": "python-missing-values-why-eight",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-missing-values-known",
  "kind": "n",
  "expect": 2,
  "code": "import pandas as pd\nanswer = int(pd.Series([4, None, 10], dtype='Float64').count())"
 },
 {
  "id": "python-missing-values-drop-mean",
  "kind": "n",
  "expect": 5,
  "code": "import pandas as pd\nanswer = pd.Series([9, None, 6, 0], dtype='Float64').dropna().mean()"
 },
 {
  "id": "python-missing-values-stays-missing",
  "kind": "n",
  "expect": 1,
  "code": "import pandas as pd\ndf = pd.DataFrame({'u': [1, None, 5]})\ncleaned = df['u'].fillna(0)\nanswer = int(df['u'].isna().sum())"
 },
 {
  "id": "python-numbers-and-types-1",
  "kind": "n",
  "expect": 20,
  "code": "int('14') + int('6')"
 },
 {
  "id": "python-numbers-and-types-2",
  "kind": "n",
  "expect": -3,
  "code": "-13 // 5"
 },
 {
  "id": "python-numbers-and-types-3",
  "kind": "c",
  "choice": "a",
  "code": "0.1 + 0.2 == 0.3",
  "expect": false
 },
 {
  "id": "python-numbers-and-types-4",
  "kind": "n",
  "expect": 2,
  "code": "sum([bool(0), bool('0'), bool(''), bool('False')])"
 },
 {
  "id": "python-numbers-and-types-5",
  "kind": "n",
  "expect": 1,
  "code": "19 % 6"
 },
 {
  "id": "python-numbers-and-types-6",
  "kind": "n",
  "expect": 81,
  "code": "3 ** 4"
 },
 {
  "id": "python-numbers-and-types-7",
  "kind": "n",
  "expect": 4,
  "code": "len('12' + '30')"
 },
 {
  "id": "python-numbers-and-types-hook",
  "kind": "n",
  "expect": 3,
  "code": "11 % 4"
 },
 {
  "id": "python-numbers-and-types-type-check",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-numbers-and-types-operator-check",
  "kind": "c",
  "choice": "c",
  "code": null,
  "expect": null
 },
 {
  "id": "python-numbers-and-types-why-minus-four",
  "kind": "c",
  "choice": "b",
  "code": null,
  "expect": null
 },
 {
  "id": "python-numbers-and-types-rem-neg",
  "kind": "n",
  "expect": 2,
  "code": "-13 % 5"
 },
 {
  "id": "python-ranges-and-randomness-1",
  "kind": "n",
  "expect": 4,
  "code": "import numpy as np\nanswer = len(np.arange(3, 15, 3))"
 },
 {
  "id": "python-ranges-and-randomness-2",
  "kind": "n",
  "expect": 14,
  "code": "import numpy as np\nanswer = np.linspace(2, 14, 5)[-1]"
 },
 {
  "id": "python-ranges-and-randomness-3",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-ranges-and-randomness-4",
  "kind": "n",
  "expect": 0,
  "code": "import numpy as np\na = np.random.default_rng(9).integers(0, 10, 4)\nb = np.random.default_rng(9).integers(0, 10, 4)\nanswer = int((a != b).sum())"
 },
 {
  "id": "python-ranges-and-randomness-5",
  "kind": "n",
  "expect": 5,
  "code": "len(range(4, 9))"
 },
 {
  "id": "python-ranges-and-randomness-6",
  "kind": "n",
  "expect": 3,
  "code": "import numpy as np\nanswer = np.linspace(0, 15, 6)[1]"
 },
 {
  "id": "python-ranges-and-randomness-7",
  "kind": "n",
  "expect": 4,
  "code": "import numpy as np\nanswer = len(np.arange(0, 1, 0.25))"
 },
 {
  "id": "python-ranges-and-randomness-hook",
  "kind": "n",
  "expect": 6,
  "code": "15 // 3 + 1"
 },
 {
  "id": "python-ranges-and-randomness-endpoint-check",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-ranges-and-randomness-why-five-gaps",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-ranges-and-randomness-faded-spacing",
  "kind": "n",
  "expect": 3,
  "code": "import numpy as np\nanswer = np.linspace(2, 14, 5)[1] - np.linspace(2, 14, 5)[0]"
 },
 {
  "id": "python-ranges-and-randomness-largest",
  "kind": "n",
  "expect": 3,
  "code": "import numpy as np\nrng = np.random.default_rng(0)\nanswer = int(rng.integers(0, 4, 10000).max())"
 },
 {
  "id": "python-read-and-inspect-1",
  "kind": "n",
  "expect": 6,
  "code": "7 - 1"
 },
 {
  "id": "python-read-and-inspect-2",
  "kind": "n",
  "expect": 3,
  "code": "(7, 3)[1]"
 },
 {
  "id": "python-read-and-inspect-3",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-read-and-inspect-4",
  "kind": "n",
  "expect": 1,
  "code": "import pandas as pd\nfrom io import StringIO\nanswer = pd.read_csv(StringIO('a;b;c;d\\n1;2;3;4')).shape[1]"
 },
 {
  "id": "python-read-and-inspect-5",
  "kind": "n",
  "expect": 3,
  "code": "import pandas as pd\nanswer = len(pd.DataFrame({'a': range(8)}).head(3))"
 },
 {
  "id": "python-read-and-inspect-6",
  "kind": "n",
  "expect": 5,
  "code": "import pandas as pd\ndf = pd.DataFrame({'a': range(5)})\npreview = df.head(2)\nanswer = len(df)"
 },
 {
  "id": "python-read-and-inspect-7",
  "kind": "n",
  "expect": 4,
  "code": "import pandas as pd\nfrom io import StringIO\nanswer = pd.read_csv(StringIO('a;b;c;d\\n1;2;3;4'), sep=';').shape[1]"
 },
 {
  "id": "python-read-and-inspect-hook",
  "kind": "n",
  "expect": 12,
  "code": "int('0012')"
 },
 {
  "id": "python-read-and-inspect-header-check",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-read-and-inspect-why-series",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-read-and-inspect-faded-cols",
  "kind": "n",
  "expect": 1,
  "code": "import pandas as pd\nanswer = pd.DataFrame({'a': [1], 'units': [2]})[['units']].shape[1]"
 },
 {
  "id": "python-read-and-inspect-id-length",
  "kind": "n",
  "expect": 4,
  "code": "import pandas as pd\nfrom io import StringIO\nanswer = len(pd.read_csv(StringIO('code\\n0012'), dtype={'code': 'str'})['code'][0])"
 },
 {
  "id": "python-reshape-a-report-1",
  "kind": "n",
  "expect": 12,
  "code": "3 * 4"
 },
 {
  "id": "python-reshape-a-report-2",
  "kind": "n",
  "expect": 12,
  "code": "import pandas as pd\ndf = pd.DataFrame({'shop': ['Bay', 'Bay'], 'month': ['Jan', 'Jan'], 'units': [3, 9]})\nanswer = df.pivot_table(index='shop', columns='month', values='units', aggfunc='sum').loc['Bay', 'Jan']"
 },
 {
  "id": "python-reshape-a-report-3",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-reshape-a-report-4",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-reshape-a-report-5",
  "kind": "n",
  "expect": 12,
  "code": "4 * 3"
 },
 {
  "id": "python-reshape-a-report-6",
  "kind": "n",
  "expect": 7,
  "code": "(4 + 10) / 2"
 },
 {
  "id": "python-reshape-a-report-7",
  "kind": "n",
  "expect": 9,
  "code": "1 + 2 + 6"
 },
 {
  "id": "python-reshape-a-report-hook",
  "kind": "n",
  "expect": 6,
  "code": "2 * 3"
 },
 {
  "id": "python-reshape-a-report-why-table",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-reshape-a-report-faded-records",
  "kind": "n",
  "expect": 2,
  "code": "len([3, 9])"
 },
 {
  "id": "python-reshape-a-report-melt-rows",
  "kind": "n",
  "expect": 10,
  "code": "import pandas as pd\ndf = pd.DataFrame({'shop': list('abcde'), 'Jan': range(5), 'Feb': range(5)})\nanswer = len(df.melt(id_vars='shop', value_vars=['Jan', 'Feb']))"
 },
 {
  "id": "python-reshape-a-report-missing-cells",
  "kind": "n",
  "expect": 2,
  "code": "import pandas as pd\ndf = pd.DataFrame({'shop': ['Bay', 'Hill'], 'month': ['Jan', 'Feb'], 'units': [2, 7]})\nr = df.pivot_table(index='shop', columns='month', values='units', aggfunc='sum')\nanswer = int(r.isna().sum().sum())"
 },
 {
  "id": "python-run-and-bind-1",
  "kind": "n",
  "expect": 20,
  "code": "price = 5\ntotal = price * 4\nprice = 9\nanswer = total"
 },
 {
  "id": "python-run-and-bind-2",
  "kind": "n",
  "expect": 13,
  "code": "count = 1\nfor _ in range(3):\n    count += 4\nanswer = count"
 },
 {
  "id": "python-run-and-bind-3",
  "kind": "n",
  "expect": 6,
  "code": "x = 3\n# x = 50\ny = x * 2\nanswer = y"
 },
 {
  "id": "python-run-and-bind-4",
  "kind": "n",
  "expect": 50,
  "code": "rate = 2\ntotal = rate * 10\nrate = 5\ntotal = rate * 10\nanswer = total"
 },
 {
  "id": "python-run-and-bind-5",
  "kind": "n",
  "expect": 42,
  "code": "units = 6\ncost = 7\nanswer = units * cost"
 },
 {
  "id": "python-run-and-bind-6",
  "kind": "n",
  "expect": 20,
  "code": "x = 3\nx = x + 2\ny = x * 4\nanswer = y"
 },
 {
  "id": "python-run-and-bind-7",
  "kind": "n",
  "expect": 7,
  "code": "k = 3\nm = k + 4\nk = 10\nanswer = m"
 },
 {
  "id": "python-run-and-bind-hook",
  "kind": "n",
  "expect": 36,
  "code": "9*4"
 },
 {
  "id": "python-run-and-bind-assign-check",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-run-and-bind-why-eight",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-run-and-bind-after-two",
  "kind": "n",
  "expect": 9,
  "code": "1 + 4 + 4"
 },
 {
  "id": "python-strings-and-slices-1",
  "kind": "n",
  "expect": 3,
  "code": "len('ORCHARD'[2:5])"
 },
 {
  "id": "python-strings-and-slices-2",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-strings-and-slices-3",
  "kind": "n",
  "expect": 3,
  "code": "len('a\\nb')"
 },
 {
  "id": "python-strings-and-slices-4",
  "kind": "n",
  "expect": 0,
  "code": "len('AB'[5:20])"
 },
 {
  "id": "python-strings-and-slices-5",
  "kind": "n",
  "expect": 4,
  "code": "len(' DATA '.strip())"
 },
 {
  "id": "python-strings-and-slices-6",
  "kind": "n",
  "expect": 3,
  "code": "len('NOTEBOOK'[-3:])"
 },
 {
  "id": "python-strings-and-slices-7",
  "kind": "n",
  "expect": 5,
  "code": "name = ' bay '\nname.strip()\nanswer = len(name)"
 },
 {
  "id": "python-strings-and-slices-hook",
  "kind": "n",
  "expect": 3,
  "code": "5 - 2"
 },
 {
  "id": "python-strings-and-slices-index-check",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-strings-and-slices-why-omit-stop",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-strings-and-slices-faded-count",
  "kind": "n",
  "expect": 4,
  "code": "len('LANTERN'[1:5])"
 },
 {
  "id": "python-summaries-and-groups-1",
  "kind": "n",
  "expect": 8,
  "code": "import pandas as pd\nanswer = pd.Series([2, 4, 6, 20]).mean()"
 },
 {
  "id": "python-summaries-and-groups-2",
  "kind": "n",
  "expect": 8,
  "code": "2 + 6"
 },
 {
  "id": "python-summaries-and-groups-3",
  "kind": "n",
  "expect": 3,
  "code": "import pandas as pd\nanswer = int(pd.Series([1, None, 2, None, 4], dtype='Float64').count())"
 },
 {
  "id": "python-summaries-and-groups-5",
  "kind": "n",
  "expect": 4,
  "code": "import pandas as pd\nanswer = pd.Series([1, 3, 5, 21]).median()"
 },
 {
  "id": "python-summaries-and-groups-6",
  "kind": "n",
  "expect": 3,
  "code": "import pandas as pd\nanswer = pd.Series(['Bay', 'Hill', 'Bay', 'Lake']).nunique()"
 },
 {
  "id": "python-summaries-and-groups-7",
  "kind": "n",
  "expect": 5,
  "code": "(3 + 7) / 2"
 },
 {
  "id": "python-summaries-and-groups-hook",
  "kind": "n",
  "expect": 7,
  "code": "(2 + 3 + 4 + 19) / 4"
 },
 {
  "id": "python-summaries-and-groups-pull-check",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-summaries-and-groups-group-check",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-summaries-and-groups-why-two-rows",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-summaries-and-groups-faded-bay-rows",
  "kind": "n",
  "expect": 2,
  "code": "len([s for s in ['Bay', 'Hill', 'Bay'] if s == 'Bay'])"
 },
 {
  "id": "python-summaries-and-groups-dropna-groups",
  "kind": "n",
  "expect": 3,
  "code": "import pandas as pd\ndf = pd.DataFrame({'shop': ['Bay', None, 'Hill', None], 'units': [1, 2, 3, 4]})\nanswer = len(df.groupby('shop', dropna=False)['units'].sum())"
 },
 {
  "id": "python-text-and-transformations-1",
  "kind": "n",
  "expect": 5,
  "code": "len('  NORTH '.strip().lower())"
 },
 {
  "id": "python-text-and-transformations-2",
  "kind": "n",
  "expect": 4,
  "code": "import pandas as pd\nanswer = pd.Series(['a|b', 'c|d']).str.split('|', n=1, expand=True).size"
 },
 {
  "id": "python-text-and-transformations-3",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-text-and-transformations-4",
  "kind": "n",
  "expect": 10,
  "code": "import pandas as pd\ndf = pd.DataFrame({'a': [2, 4], 'b': [3, 1]})\nanswer = df.apply(lambda row: row['a'] * row['b'], axis=1).sum()"
 },
 {
  "id": "python-text-and-transformations-5",
  "kind": "n",
  "expect": 3,
  "code": "len('red,blue,gold'.split(','))"
 },
 {
  "id": "python-text-and-transformations-6",
  "kind": "n",
  "expect": 16,
  "code": "7 + 9"
 },
 {
  "id": "python-text-and-transformations-7",
  "kind": "n",
  "expect": 4,
  "code": "import pandas as pd\nanswer = int(pd.Series([' Ab ', 'cD']).str.strip().str.len().sum())"
 },
 {
  "id": "python-text-and-transformations-hook",
  "kind": "n",
  "expect": 2,
  "code": "len({s.strip().lower() for s in ['Bay', ' bay', 'BAY ', 'Hill']})"
 },
 {
  "id": "python-text-and-transformations-str-check",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-text-and-transformations-why-once",
  "kind": "c",
  "choice": "a",
  "code": null,
  "expect": null
 },
 {
  "id": "python-text-and-transformations-faded-columns",
  "kind": "n",
  "expect": 2,
  "code": "import pandas as pd\nanswer = pd.Series(['a|b', 'c|d']).str.split('|', n=1, expand=True).shape[1]"
 },
 {
  "id": "python-text-and-transformations-items",
  "kind": "n",
  "expect": 6,
  "code": "import pandas as pd\nanswer = int((pd.Series(['a,b', 'c', 'd,e,f']).str.count(',') + 1).sum())"
 }
];

/** Part 3 of the story rewrite: the five lessons that follow array-calculations. */
const PART3 = [
  "ranges-and-randomness",
  "read-and-inspect",
  "labels-and-positions",
  "filters-and-columns",
  "missing-values",
];
/** Part 4 of the story rewrite: the five lessons that follow missing-values. */
const PART4 = [
  "text-and-transformations",
  "dates-and-units",
  "summaries-and-groups",
  "combine-tables",
  "reshape-a-report",
];
/** Part 5 of the story rewrite: the last lesson. */
const PART5 = ["audit-a-sales-report"];
/** Lessons rewritten in the story format (parts 1 to 5 of the course). */
const STORY_LESSONS = [
  "run-and-bind",
  "numbers-and-types",
  "strings-and-slices",
  "lists-and-tuples",
  "keys-and-sets",
  "conditions-and-loops",
  "functions-and-imports",
  "errors-and-resources",
  "arrays-and-shape",
  "array-calculations",
  ...PART3,
  ...PART4,
  ...PART5,
];
const wordCount = (blocks: ReadonlyArray<object> | undefined): number =>
  (blocks ?? []).reduce((sum, block) => sum + ((block as { text?: string }).text ?? "").split(/\s+/u).filter(Boolean).length, 0);

/** Questions that part 3 no longer asks. They stay in the bundle for learner history. */
const PART3_RETIRED = [
  "python-ranges-and-randomness-hook",
  "python-ranges-and-randomness-endpoint-check",
  "python-read-and-inspect-hook",
  "python-read-and-inspect-header-check",
  "python-labels-and-positions-hook",
  "python-labels-and-positions-4",
  "python-filters-and-columns-hook",
  "python-filters-and-columns-mask-check",
  "python-missing-values-hook",
  "python-missing-values-4",
];

/** Questions that part 4 no longer asks. They stay in the bundle for learner history. */
const PART4_RETIRED = [
  "python-text-and-transformations-hook",
  "python-text-and-transformations-str-check",
  "python-dates-and-units-hook",
  "python-dates-and-units-format-check",
  "python-summaries-and-groups-hook",
  "python-summaries-and-groups-group-check",
  "python-combine-tables-hook",
  "python-combine-tables-dedupe-check",
  "python-reshape-a-report-hook",
  "python-reshape-a-report-3",
];

/** Questions that part 5 no longer asks. They stay in the bundle for learner history. */
const PART5_RETIRED = ["python-audit-a-sales-report-hook", "python-audit-a-sales-report-grain-check"];

const python = (probe: string): boolean =>
  spawnSync("python3", ["-c", probe], { encoding: "utf8" }).status === 0;
const hasPython = python("pass");
const hasLibraries = hasPython && python("import numpy, pandas");

const evaluate = (code: string): unknown => {
  const script = `
import contextlib, io, json, sys
src = sys.stdin.read()
ns = {}
with contextlib.redirect_stdout(io.StringIO()):
    try:
        value = eval(compile(src, "<c>", "eval"), ns)
    except SyntaxError:
        exec(compile(src, "<c>", "exec"), ns)
        value = ns["answer"]
try:
    value = value.item()
except AttributeError:
    pass
print(json.dumps(value))
`;
  const result = spawnSync("python3", ["-c", script], { input: code, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
  return JSON.parse(result.stdout);
};

describe("Python for Data Analysis (v2 lessons)", () => {
  it("validates, with 21 v2 lessons of exactly three skill-check items", () => {
    const validation = validateCourseBundle(candidate);
    expect(validation.issues.filter((issue) => issue.severity === "error")).toEqual([]);
    expect(candidate.lessons).toHaveLength(21);
    for (const lesson of candidate.lessons) {
      expect(lesson.intro, lesson.id).toBeDefined();
      expect(lesson.recap, lesson.id).toBeDefined();
      expect(lesson.questionIds, lesson.id).toHaveLength(3);
      const story = STORY_LESSONS.includes(lesson.id);
      expect(lesson.steps.length, lesson.id).toBeGreaterThanOrEqual(story ? 8 : 5);
      expect(lesson.steps.length, lesson.id).toBeLessThanOrEqual(story ? 14 : 7);
      expect(lesson.steps.some((step) => step.kind === "transfer"), lesson.id).toBe(true);
    }
  });

  it("writes the story lessons in the story format", () => {
    for (const id of STORY_LESSONS) {
      const lesson = candidate.lessons.find((item) => item.id === id)!;
      expect(lesson.intro!.hook.questionId, id).toBeUndefined();
      const opener = wordCount(lesson.intro!.hook.blocks);
      expect(opener, id).toBeGreaterThanOrEqual(120);
      expect(opener, id).toBeLessThanOrEqual(200);
      const teaching = lesson.steps.filter((s) => s.kind === "explain" && !s.checkQuestionId);
      expect(teaching.length / lesson.steps.length, id).toBeGreaterThanOrEqual(0.4);
      expect(lesson.steps.some((s) => s.diagram), id).toBe(true);
      for (const step of teaching) {
        const words = wordCount(step.lead) + wordCount(step.afterFigure);
        expect(words, `${id}/${step.id}`).toBeGreaterThanOrEqual(80);
        expect(words, `${id}/${step.id}`).toBeLessThanOrEqual(280);
      }
      for (const step of lesson.steps.filter((s) => !teaching.includes(s)))
        expect(wordCount(step.lead), `${id}/${step.id}`).toBeLessThanOrEqual(60);
      let run = 0;
      for (const step of lesson.steps) {
        run = teaching.includes(step) ? run + 1 : 0;
        expect(run, `${id}/${step.id}`).toBeLessThanOrEqual(3);
      }
      for (const qid of lesson.questionIds) expect(ROWS.some((row) => row.id === qid), qid).toBe(true);
    }
    expect(candidate.lessons.map((l) => l.id).slice(0, STORY_LESSONS.length)).toEqual(STORY_LESSONS);
  });

  it("keeps part 2 lessons to one question per practice screen and every question reachable", () => {
    const part2 = STORY_LESSONS.slice(5);
    const retired = [
      "python-conditions-and-loops-hook",
      "python-functions-and-imports-hook",
      "python-errors-and-resources-hook",
      "python-arrays-and-shape-hook",
      "python-array-calculations-hook",
      ...PART3_RETIRED,
      ...PART4_RETIRED,
      ...PART5_RETIRED,
    ];
    const used = new Set<string>();
    for (const id of part2) {
      const lesson = candidate.lessons.find((item) => item.id === id)!;
      const ids = new Set<string>();
      for (const step of lesson.steps) {
        expect(ids.has(step.id), `${id}/${step.id} is unique`).toBe(false);
        ids.add(step.id);
        if (step.kind === "explain") expect(step.checkQuestionId, `${id}/${step.id}`).toBeFalsy();
        else {
          const asks =
            Boolean(step.checkQuestionId) ||
            Boolean(step.workedSteps?.some((line) => line.blank || line.selfExplain));
          expect(asks, `${id}/${step.id} asks something`).toBe(true);
        }
        if (step.checkQuestionId) used.add(step.checkQuestionId);
        for (const line of step.workedSteps ?? []) {
          if (line.blank) used.add(line.blank.questionId);
          if (line.selfExplain) used.add(line.selfExplain.questionId);
        }
        // A figure on a graded screen must hide its answer until the learner has responded.
        if (step.diagram && step.checkQuestionId)
          expect(step.answerVisibility, `${id}/${step.id}`).toBe("hidden-until-response");
      }
      for (const qid of lesson.questionIds) used.add(qid);
      // Every term the lesson introduces appears on exactly one teaching screen.
      const terms = lesson.steps.flatMap((step) => step.introducesTerms ?? []);
      expect(new Set(terms).size, id).toBe(terms.length);
      expect((lesson.recap!.nextHook ?? "").length, id).toBeGreaterThan(40);
    }
    for (const qid of retired) {
      expect(used.has(qid), qid).toBe(false);
      expect(candidate.questions.some((item) => item.id === qid), qid).toBe(true);
    }
    const authoring = candidate.authoringMetadata ?? [];
    for (const id of part2) {
      const lesson = candidate.lessons.find((item) => item.id === id)!;
      const targets = (authoring.find((item) => item.lessonId === id)?.citations ?? []).map(
        (citation) => `${citation.targetKind}:${citation.targetId}`,
      );
      for (const step of lesson.steps) expect(targets, `${id}/${step.id}`).toContain(`step:${step.id}`);
      for (const retiredId of retired) expect(targets).not.toContain(`question:${retiredId}`);
    }
  });

  it("states in each corrected misconception the value its wrong answer really is", () => {
    // [question, wrong value, the program that produces it]
    const wrong: Array<[string, number, string]> = [
      ["python-arrays-and-shape-1", 10, "import numpy as np\nanswer = (np.array([3, 5]) * 2)[1]"],
      ["python-arrays-and-shape-1", 8, "import numpy as np\nanswer = np.array([3, 5]).sum()"],
      ["python-array-calculations-2", 6, "import numpy as np\nanswer = np.array([[2, 4], [6, 8]]).sum(axis=1)[0]"],
      ["python-array-calculations-2", 12, "import numpy as np\nanswer = np.array([[2, 4], [6, 8]]).sum(axis=0)[1]"],
      ["python-array-calculations-5", 7, "import numpy as np\nanswer = np.array([[3, 7], [2, 8]])[0, 1]"],
      ["python-array-calculations-5", 10, "import numpy as np\nanswer = np.array([[3, 7], [2, 8]]).sum(axis=1)[1]"],
      ["python-array-calculations-7", 14, "import numpy as np\nanswer = np.array([2, 4, 8]).sum()"],
      ["python-array-calculations-7", 84, "import numpy as np\nanswer = np.array([2, 4, 8]).sum() * np.array([1, 2, 3]).sum()"],
      ["python-labels-and-positions-7", 11, "s = {10: 4, 20: 7, 30: 9}\nanswer = list(s.values())[0] + s[20]"],
      ["python-labels-and-positions-7", 8, "s = {10: 4, 20: 7, 30: 9}\nanswer = list(s.values())[0] + s[10]"],
      ["python-text-and-transformations-items", 3, "answer = sum(t.count(',') for t in ['a,b', 'c', 'd,e,f'])"],
      ["python-dates-and-units-month-end", 24, "answer = 26 - 2"],
      ["python-conditions-and-loops-2", 18, "answer = sum(range(4, 9, 2))"],
      ["python-conditions-and-loops-2", 30, "answer = sum(range(2, 11, 2))"],
    ];
    if (!hasPython) return;
    for (const [id, value, code] of wrong) {
      const messages = (question(id).misconceptions ?? []).filter((item) =>
        (item.match.numeric ?? []).includes(value),
      );
      expect(messages.length, `${id} ${value}`).toBe(1);
      if (!/numpy/.test(code) || hasLibraries) expect(evaluate(code), `${id} ${value}`).toBe(value);
    }
  }, 30_000);

  it("keeps part 3 lessons to a story shape, with every question asked once and answerable", () => {
    const lessons = PART3.map((id) => candidate.lessons.find((item) => item.id === id)!);
    const asked = new Set<string>();
    for (const lesson of lessons) {
      const withQuestion = lesson.steps.filter(
        (step) =>
          Boolean(step.checkQuestionId) || Boolean(step.workedSteps?.some((line) => line.blank || line.selfExplain)),
      );
      expect(withQuestion.length, lesson.id).toBeGreaterThanOrEqual(3);
      expect(withQuestion.length, lesson.id).toBeLessThanOrEqual(7);
      for (const step of lesson.steps) {
        // One question per practice screen, none on a teaching screen.
        if (step.kind === "explain") expect(step.checkQuestionId, `${lesson.id}/${step.id}`).toBeFalsy();
        if (step.checkQuestionId) asked.add(step.checkQuestionId);
        for (const line of step.workedSteps ?? []) {
          if (line.blank) asked.add(line.blank.questionId);
          if (line.selfExplain) asked.add(line.selfExplain.questionId);
        }
      }
      for (const qid of lesson.questionIds) asked.add(qid);
      // Every question this lesson asks has its key recomputed in ROWS, and carries a taught skill.
      for (const qid of [...asked].filter((id) => id.startsWith(`python-${lesson.id}-`))) {
        expect(ROWS.some((row) => row.id === qid), qid).toBe(true);
        expect(lesson.taughtSkills ?? [], qid).toContain(question(qid).skill);
      }
      // The skill check is three items that are not asked earlier in the lesson.
      for (const qid of lesson.questionIds)
        expect(
          lesson.steps.some((step) => step.checkQuestionId === qid),
          `${lesson.id} ${qid} appears only in the skill check`,
        ).toBe(false);
      // No picture shows its own answer on a graded screen, and every lesson has a picture.
      expect(lesson.steps.some((step) => step.diagram), lesson.id).toBe(true);
    }
    for (const qid of PART3_RETIRED) {
      expect(asked.has(qid), qid).toBe(false);
      expect(candidate.questions.some((item) => item.id === qid), qid).toBe(true);
    }
  });

  it("leads each part 3 lesson into the next one through its nextHook", () => {
    // [lesson, a word its nextHook uses, a word the next lesson's opener uses]
    const chain: Array<[string, RegExp, RegExp]> = [
      ["array-calculations", /readings at regular distances|arange and linspace/u, /post/u],
      ["ranges-and-randomness", /file of rows and columns/u, /file/u],
      ["read-and-inspect", /locker/u, /locker/u],
      ["labels-and-positions", /orders of three units/u, /orders/u],
      ["filters-and-columns", /gaps?/u, /gap|empty/u],
    ];
    for (const [id, hook, opener] of chain) {
      const index = candidate.lessons.findIndex((item) => item.id === id);
      const lesson = candidate.lessons[index]!;
      const next = candidate.lessons[index + 1]!;
      expect(lesson.recap!.nextHook ?? "", id).toMatch(hook);
      const text = (next.intro!.hook.blocks as Array<{ text?: string }>).map((block) => block.text ?? "").join(" ");
      expect(text, `${id} -> ${next.id}`).toMatch(opener);
    }
  });

  it("states in the part 3 teaching screens only numbers that the code gives", () => {
    const screenText = (lessonId: string, stepId: string): string => {
      const lesson = candidate.lessons.find((item) => item.id === lessonId)!;
      const step = lesson.steps.find((item) => item.id === stepId)!;
      return [...(step.lead ?? []), ...(step.afterFigure ?? [])]
        .map((block) => (block as { text?: string }).text ?? "")
        .join(" ");
    };
    // [lesson, step, the phrase the screen uses, the value it states, the program that gives it]
    const claims: Array<[string, string, string, unknown, string]> = [
      ["ranges-and-randomness", "posts-every-3-metres", "It gives 0, 3, 6 and 9", [0, 3, 6, 9], "list(range(0, 12, 3))"],
      ["ranges-and-randomness", "posts-every-3-metres", "so it makes 2, 5, 8 and 11", [2, 5, 8, 11], "list(range(2, 12, 3))"],
      ["ranges-and-randomness", "posts-every-3-metres", "makes 0, 0.5, 1 and 1.5", [0, 0.5, 1, 1.5], "[i * 0.5 for i in range(4)]"],
      ["ranges-and-randomness", "posts-at-both-ends", "np.linspace(0, 12, 5) gives 0, 3, 6, 9 and 12", [0, 3, 6, 9, 12], "[12 * i / 4 for i in range(5)]"],
      ["ranges-and-randomness", "posts-at-both-ends", "12 ÷ 4 = 3 metres each", 3, "12 / (5 - 1)"],
      ["ranges-and-randomness", "posts-at-both-ends", "at 0, 4, 8 and 12", [0, 4, 8, 12], "[12 * i / 3 for i in range(4)]"],
      ["ranges-and-randomness", "posts-at-both-ends", "stand at 0, 3, 6 and 9", [0, 3, 6, 9], "[12 * i / 4 for i in range(4)]"],
      ["ranges-and-randomness", "which-numbers-can-come-up", "6 − 1 = 5 choices", 5, "len(range(1, 6))"],
      ["ranges-and-randomness", "which-numbers-can-come-up", "offers 3 values: 10, 11 and 12", 3, "len(range(10, 13))"],
      ["filters-and-columns", "a-test-for-every-row", "False, False, True and True", [false, false, true, true], "[u >= 3 for u in [2, 1, 3, 4]]"],
      ["filters-and-columns", "a-column-for-every-row", "holding 10, 8, 15 and 32", [10, 8, 15, 32], "[u * p for u, p in zip([2, 1, 3, 4], [5, 8, 5, 8])]"],
      ["filters-and-columns", "two-tests-at-once", "only the third order passes", [2], "[i for i, (s, u) in enumerate(zip(['Bay', 'Hill', 'Bay', 'Hill'], [2, 1, 3, 4])) if s == 'Bay' and u >= 3]"],
      ["filters-and-columns", "two-tests-at-once", "both Bay orders come through along with Hill's order of 4 units", [0, 2, 3], "[i for i, (s, u) in enumerate(zip(['Bay', 'Hill', 'Bay', 'Hill'], [2, 1, 3, 4])) if s == 'Bay' or u >= 3]"],
      ["missing-values", "averages-leave-the-blanks-out", "(7 + 11) ÷ 2 = 9", 9, "(7 + 11) / 2"],
      ["missing-values", "filling-with-zero", "(2 + 8) ÷ 2 = 5", 5, "(2 + 8) / 2"],
      ["missing-values", "filling-with-zero", "(2 + 0 + 8) ÷ 3, which is about 3.3", 3.3, "round((2 + 0 + 8) / 3, 1)"],
      ["labels-and-positions", "where-a-slice-stops", "df.iloc[0:2] gives the rows at positions 0 and 1", [0, 1], "list(range(0, 2))"],
      ["labels-and-positions", "the-number-on-the-door", "label 20 at position 1", 1, "[10, 20, 30].index(20)"],
    ];
    for (const [lessonId, stepId, phrase, value, code] of claims) {
      expect(screenText(lessonId, stepId), `${lessonId}/${stepId}`).toContain(phrase);
      if (hasPython) expect(evaluate(code), `${lessonId}/${stepId}: ${phrase}`).toEqual(value);
    }
    // Shapes stated on the read-and-inspect screens, checked with pandas when it is installed.
    expect(screenText("read-and-inspect", "rows-columns-and-shape")).toContain("df.shape is (4, 3)");
    expect(screenText("read-and-inspect", "rows-columns-and-shape")).toContain("shape (4,)");
    expect(screenText("read-and-inspect", "rows-columns-and-shape")).toContain("shape (4, 1)");
    if (hasLibraries) {
      const frame = "import pandas as pd\ndf = pd.DataFrame({'shop': ['Bay', 'Hill', 'Bay', 'Hill'], 'units': [2, 1, 3, 4], 'price': [5, 8, 5, 8]})\n";
      expect(evaluate(`${frame}answer = list(df.shape)`)).toEqual([4, 3]);
      expect(evaluate(`${frame}answer = list(df['units'].shape)`)).toEqual([4]);
      expect(evaluate(`${frame}answer = list(df[['units']].shape)`)).toEqual([4, 1]);
      expect(evaluate("import pandas as pd\ndf = pd.DataFrame({'a': range(6), 'b': range(6), 'c': range(6)})\nanswer = list(df.shape)")).toEqual([6, 3]);
      expect(evaluate("import pandas as pd\ns = pd.Series([2, None, 8, None], dtype='Float64')\nanswer = [int(s.size), int(s.count()), int(s.isna().sum())]")).toEqual([4, 2, 2]);
    }
    // The worked example on read-and-inspect states the six-row shapes.
    const worked = candidate.lessons
      .find((item) => item.id === "read-and-inspect")!
      .steps.find((step) => step.id === "one-column-or-a-table")!;
    expect(worked.workedSteps!.map((line) => line.math)).toEqual([
      "df.shape = (6, 3)",
      "df['units'].shape = (6,)",
      "df[['units']].shape = (6, 1)",
    ]);
  }, 60_000);


  it("keeps part 4 lessons to a story shape, with every question asked once and answerable", () => {
    const lessons = PART4.map((id) => candidate.lessons.find((item) => item.id === id)!);
    const asked = new Set<string>();
    for (const lesson of lessons) {
      const withQuestion = lesson.steps.filter(
        (step) =>
          Boolean(step.checkQuestionId) || Boolean(step.workedSteps?.some((line) => line.blank || line.selfExplain)),
      );
      expect(withQuestion.length, lesson.id).toBeGreaterThanOrEqual(3);
      expect(withQuestion.length, lesson.id).toBeLessThanOrEqual(7);
      for (const step of lesson.steps) {
        if (step.kind === "explain") expect(step.checkQuestionId, `${lesson.id}/${step.id}`).toBeFalsy();
        // A figure sits on a teaching screen, where it may show its results.
        if (step.diagram) expect(step.kind, `${lesson.id}/${step.id}`).toBe("explain");
        if (step.checkQuestionId) asked.add(step.checkQuestionId);
        for (const line of step.workedSteps ?? []) {
          if (line.blank) asked.add(line.blank.questionId);
          if (line.selfExplain) asked.add(line.selfExplain.questionId);
        }
      }
      for (const qid of lesson.questionIds) asked.add(qid);
      for (const qid of [...asked].filter((id) => id.startsWith(`python-${lesson.id}-`))) {
        expect(ROWS.some((row) => row.id === qid), qid).toBe(true);
        expect(lesson.taughtSkills ?? [], qid).toContain(question(qid).skill);
      }
      for (const qid of lesson.questionIds)
        expect(
          lesson.steps.some((step) => step.checkQuestionId === qid),
          `${lesson.id} ${qid} appears only in the skill check`,
        ).toBe(false);
      expect(lesson.steps.some((step) => step.diagram), lesson.id).toBe(true);
      // Every skill-check item has three hints when it is numeric.
      for (const qid of lesson.questionIds) {
        const item = question(qid);
        if (item.answerAuthority.kind === "numeric") expect(item.hints, qid).toHaveLength(3);
      }
    }
    for (const qid of PART4_RETIRED) {
      expect(asked.has(qid), qid).toBe(false);
      expect(candidate.questions.some((item) => item.id === qid), qid).toBe(true);
    }
  });

  it("leads each part 4 lesson into the next one through its nextHook", () => {
    // [lesson, a word its nextHook uses, a word the next lesson's opener uses]
    const chain: Array<[string, RegExp, RegExp]> = [
      ["missing-values", /stray spaces/u, /space/u],
      ["text-and-transformations", /03\/04\/2026/u, /03\/04\/2026/u],
      ["dates-and-units", /single figure/u, /one figure/u],
      ["summaries-and-groups", /customer addresses/u, /address/u],
      ["combine-tables", /shops down the side/u, /shops down the side/u],
    ];
    for (const [id, hook, opener] of chain) {
      const index = candidate.lessons.findIndex((item) => item.id === id);
      const lesson = candidate.lessons[index]!;
      const next = candidate.lessons[index + 1]!;
      expect(lesson.recap!.nextHook ?? "", id).toMatch(hook);
      const text = (next.intro!.hook.blocks as Array<{ text?: string }>).map((block) => block.text ?? "").join(" ");
      expect(text, `${id} -> ${next.id}`).toMatch(opener);
    }
    const last = candidate.lessons.find((item) => item.id === "reshape-a-report")!;
    expect(last.recap!.nextHook).toMatch(/sales report/u);
  });

  it("states in the part 4 teaching screens only numbers that the code gives", () => {
    const screenText = (lessonId: string, stepId: string): string => {
      const lesson = candidate.lessons.find((item) => item.id === lessonId)!;
      const step = lesson.steps.find((item) => item.id === stepId)!;
      return [...(step.lead ?? []), ...(step.afterFigure ?? [])]
        .map((block) => (block as { text?: string }).text ?? "")
        .join(" ");
    };
    // [lesson, step, the phrase the screen uses, the value it states, the program that gives it]
    const plain: Array<[string, string, string, unknown, string]> = [
      ["summaries-and-groups", "two-ways-to-be-typical", "28 ÷ 4 = 7", 7, "sum([2, 3, 4, 19]) / 4"],
      ["summaries-and-groups", "two-ways-to-be-typical", "wages total 28", 28, "sum([2, 3, 4, 19])"],
      ["summaries-and-groups", "two-ways-to-be-typical", "3 and 4 here", [3, 4], "sorted([2, 3, 4, 19])[1:3]"],
      ["summaries-and-groups", "two-ways-to-be-typical", "their average, 3.5", 3.5, "(3 + 4) / 2"],
      ["summaries-and-groups", "one-result-per-group", "Bay's two orders are 2 and 3 units and Hill's are 1 and 4", [5, 5], "[sum([2, 3]), sum([1, 4])]"],
      ["summaries-and-groups", "one-result-per-group", "the mean is 2.5 for each", [2.5, 2.5], "[sum([2, 3]) / 2, sum([1, 4]) / 2]"],
      ["summaries-and-groups", "rows-or-known-values", "'red', 'blue', 'red' and 'red' it gives 2", 2, "len(set(['red', 'blue', 'red', 'red']))"],
      ["summaries-and-groups", "a-missing-key", "2 for Bay, 4 for Hill and 3 for the group with no shop", [2, 4, 3], "[2, 4, 3]"],
      ["dates-and-units", "entries-that-are-not-dates", "reports one failure", 1, "sum(1 for d in ['2026-02-30', '2026-03-01'] if d == '2026-02-30')"],
      ["dates-and-units", "days-between-dates", "which are 4 and 5", [4, 5], "[4, 5]"],
      ["dates-and-units", "days-between-dates", "which gives 3", 3, "5 - 2"],
      ["combine-tables", "match-by-a-key", "it returns 3 rows", 3, "len([k for k in [1, 1, 2, 3] if k in [1, 2, 4]])"],
      ["combine-tables", "match-by-a-key", "so it returns all 4", 4, "len([1, 1, 2, 3])"],
      ["combine-tables", "repeated-keys-multiply", "the result has 2 rows", 2, "2 * 1"],
      ["combine-tables", "repeated-keys-multiply", "the result has 4", 4, "2 * 2"],
      ["combine-tables", "repeated-keys-multiply", "become eight lines", 8, "4 * 2"],
      ["reshape-a-report", "records-share-a-cell", "puts 8 in the cell and the mean puts 4", [8, 4], "[2 + 6, (2 + 6) / 2]"],
      ["reshape-a-report", "a-cell-with-no-record", "the grid has four cells and two of them are empty", [4, 2], "[2 * 2, 2 * 2 - 2]"],
      ["reshape-a-report", "grid-to-list", "four rows", 4, "2 * 2"],
    ];
    for (const [lessonId, stepId, phrase, value, code] of plain) {
      expect(screenText(lessonId, stepId), `${lessonId}/${stepId}`).toContain(phrase);
      if (hasPython) expect(evaluate(code), `${lessonId}/${stepId}: ${phrase}`).toEqual(value);
    }
    // Statements about what pandas returns, checked when it is installed.
    const pandas: Array<[string, string, string, unknown, string]> = [
      ["text-and-transformations", "same-shop-different-text", "it answers four", 4, "import pandas as pd\nanswer = int(pd.Series(['Bay', ' bay', 'BAY ', 'Hill']).nunique())"],
      ["text-and-transformations", "text-in-every-row", "which leaves two different shops", 2, "import pandas as pd\nanswer = int(pd.Series(['Bay', ' bay', 'BAY ', 'Hill']).str.strip().str.lower().nunique())"],
      ["dates-and-units", "same-text-two-dates", "day 3 of month 4, which is 3 April", [3, 4], "import pandas as pd\nd = pd.to_datetime(pd.Series(['03/04/2026']), format='%d/%m/%Y')[0]\nanswer = [d.day, d.month]"],
      ["dates-and-units", "same-text-two-dates", "month 3, day 4, which is 4 March", [3, 4], "import pandas as pd\nd = pd.to_datetime(pd.Series(['03/04/2026']), format='%m/%d/%Y')[0]\nanswer = [d.month, d.day]"],
      ["combine-tables", "stack-or-match", "the labels read 0, 1, 0, 1", [0, 1, 0, 1], "import pandas as pd\nanswer = [int(i) for i in pd.concat([pd.DataFrame({'units': [2, 4]}), pd.DataFrame({'units': [4, 6]})]).index]"],
      ["combine-tables", "stack-or-match", "In the second they read 0, 1, 2, 3", [0, 1, 2, 3], "import pandas as pd\nanswer = [int(i) for i in pd.concat([pd.DataFrame({'units': [2, 4]}), pd.DataFrame({'units': [4, 6]})], ignore_index=True).index]"],
      ["combine-tables", "match-by-a-key", "The inner merge drops that order", 3, "import pandas as pd\no = pd.DataFrame({'customer': [1, 1, 2, 3], 'amount': [10, 20, 15, 8]})\np = pd.DataFrame({'customer': [1, 2, 4], 'region': ['East', 'West', 'East']})\nanswer = len(o.merge(p, on='customer', how='inner'))"],
      ["combine-tables", "match-by-a-key", "The left merge keeps the order with a missing region", 4, "import pandas as pd\no = pd.DataFrame({'customer': [1, 1, 2, 3], 'amount': [10, 20, 15, 8]})\np = pd.DataFrame({'customer': [1, 2, 4], 'region': ['East', 'West', 'East']})\nanswer = len(o.merge(p, on='customer', how='left'))"],
      ["combine-tables", "missing-keys-meet", "picks up the region 'Unknown'", "Unknown", "import pandas as pd\na = pd.DataFrame({'id': [1, None], 'amount': [5, 9]})\nb = pd.DataFrame({'id': [1, None], 'region': ['East', 'Unknown']})\nanswer = a.merge(b, on='id', how='left')['region'].tolist()[1]"],
      ["reshape-a-report", "list-to-grid", "Bay has 2 under Jan and 5 under Feb", [2, 5], "import pandas as pd\ndf = pd.DataFrame({'shop': ['Bay', 'Bay', 'Hill', 'Hill'], 'month': ['Jan', 'Feb', 'Jan', 'Feb'], 'units': [2, 5, 3, 7]})\ng = df.pivot(index='shop', columns='month', values='units')\nanswer = [int(g.loc['Bay', 'Jan']), int(g.loc['Bay', 'Feb'])]"],
      ["reshape-a-report", "grid-to-list", "so it makes two rows", 2, "import pandas as pd\ndf = pd.DataFrame({'shop': ['Bay', 'Hill'], 'Jan': [2, 3], 'Feb': [5, 7]})\nanswer = len(df.melt(id_vars='shop', value_vars=['Feb']))"],
    ];
    for (const [lessonId, stepId, phrase, value, code] of pandas) {
      expect(screenText(lessonId, stepId), `${lessonId}/${stepId}`).toContain(phrase);
      if (hasLibraries) expect(evaluate(code), `${lessonId}/${stepId}: ${phrase}`).toEqual(value);
    }
  }, 60_000);

  it("keeps the audit lesson to a story shape, with every question asked once and answerable", () => {
    const lesson = candidate.lessons.find((item) => item.id === "audit-a-sales-report")!;
    const asked = new Set<string>();
    for (const step of lesson.steps) {
      if (step.kind === "explain") expect(step.checkQuestionId, step.id).toBeFalsy();
      if (step.diagram) expect(step.kind, step.id).toBe("explain");
      if (step.checkQuestionId) asked.add(step.checkQuestionId);
      for (const line of step.workedSteps ?? []) {
        if (line.blank) asked.add(line.blank.questionId);
        if (line.selfExplain) asked.add(line.selfExplain.questionId);
      }
    }
    expect(asked.size).toBe(7);
    for (const qid of ["python-audit-a-sales-report-1", "python-audit-a-sales-report-2", "python-audit-a-sales-report-3",
      "python-audit-a-sales-report-4", "python-audit-a-sales-report-faded-excluded",
      "python-audit-a-sales-report-inflated-rows", "python-audit-a-sales-report-confirmed"])
      expect(asked.has(qid), qid).toBe(true);
    for (const qid of lesson.questionIds) {
      asked.add(qid);
      const item = question(qid);
      if (item.answerAuthority.kind === "numeric") expect(item.hints, qid).toHaveLength(3);
    }
    for (const qid of asked) expect(lesson.taughtSkills ?? [], qid).toContain(question(qid).skill);
    for (const qid of PART5_RETIRED) {
      expect(asked.has(qid), qid).toBe(false);
      expect(candidate.questions.some((item) => item.id === qid), qid).toBe(true);
    }
    expect(lesson.questionIds).toEqual([
      "python-audit-a-sales-report-5",
      "python-audit-a-sales-report-6",
      "python-audit-a-sales-report-7",
    ]);
  });

  it("leads the audit lesson in from reshape-a-report and recomputes the numbers its screens state", () => {
    const reshape = candidate.lessons.find((item) => item.id === "reshape-a-report")!;
    const audit = candidate.lessons.find((item) => item.id === "audit-a-sales-report")!;
    expect(reshape.recap!.nextHook).toMatch(/sales report/u);
    const opener = (audit.intro!.hook.blocks as Array<{ text?: string }>).map((block) => block.text ?? "").join(" ");
    expect(opener).toMatch(/sales report/u);
    expect(opener).toMatch(/total/u);
    const screen = (stepId: string): string => {
      const step = audit.steps.find((item) => item.id === stepId)!;
      return [...(step.lead ?? []), ...(step.afterFigure ?? [])]
        .map((block) => (block as { text?: string }).text ?? "")
        .join(" ");
    };
    // Orders: id 1 to 5, shop, units, price, paid (as in the figures).
    const frame =
      "import pandas as pd\norders = pd.DataFrame({'id': [1, 2, 3, 4, 5], 'shop': ['Bay', 'Hill', 'Bay', 'Lake', 'Hill'], 'units': [2, 3, 4, 1, 2], 'price': [5, 8, None, 6, 8], 'paid': [True, True, True, False, True]})\n";
    const prose: Array<[string, string, unknown, string]> = [
      ["what-is-a-row", "The ids give 0", 0, "answer = int(orders['id'].duplicated().sum())"],
      ["what-is-a-row", "the table has 5 rows", 5, "answer = len(orders)"],
      ["what-is-a-row", "The shop names give 2", 2, "answer = int(orders['shop'].duplicated().sum())"],
      ["who-counts", "orders 1, 2, 3 and 5 are paid", [1, 2, 3, 5], "answer = [int(i) for i in orders[orders['paid']]['id']]"],
      ["a-price-nobody-knows", "order 1 earned £10, order 2 earned £24 and order 5 earned £16", [10, 24, 16],
        "p = orders[orders['paid']]\nr = p['units'] * p['price']\nanswer = [int(r[0]), int(r[1]), int(r[4])]"],
      ["a-price-nobody-knows", "the total is 50.0", 50, "p = orders[orders['paid']]\nanswer = float((p['units'] * p['price']).sum(min_count=1))"],
      ["one-region-per-shop", "the table still has 5 rows", 5,
        "l = pd.DataFrame({'shop': ['Bay', 'Hill', 'Lake'], 'region': ['East', 'West', 'East']})\nanswer = len(orders.merge(l, on='shop', how='left', validate='many_to_one'))"],
      ["the-report-you-can-defend", "known revenue of 10 and one unknown price", [10, 1],
        "p = orders[orders['paid']].copy()\np['r'] = p['units'] * p['price']\nb = p[p['shop'] == 'Bay']\nanswer = [int(b['r'].sum()), int(b['price'].isna().sum())]"],
      ["the-report-you-can-defend", "so its 40 is complete", 40,
        "p = orders[orders['paid']].copy()\nh = p[p['shop'] == 'Hill']\nanswer = int((h['units'] * h['price']).sum())"],
      ["the-report-you-can-defend", "Bay's 30 is the 10 from order 1 plus 4 × 5 = 20", 30,
        "o = orders.copy()\no.loc[o['id'] == 3, 'price'] = 5\np = o[o['paid']]\nb = p[p['shop'] == 'Bay']\nanswer = int((b['units'] * b['price']).sum())"],
    ];
    for (const [stepId, phrase, value, code] of prose) {
      expect(screen(stepId), stepId).toContain(phrase);
      if (hasLibraries) expect(evaluate(frame + code), `${stepId}: ${phrase}`).toEqual(value);
    }
    // Numeric keys of the practice and skill-check items, recomputed by hand.
    expect(question("python-audit-a-sales-report-5").prompt).toContain("2 units at £7 and 3 units at £5");
    expect(2 * 7 + 3 * 5).toBe(29);
    expect(2 * 7 + 3 * 5 + 4 * 6).toBe(53);
    expect(2 * 5 + 3 * 6).toBe(28);
    expect(3 * 4 + 2 * 9).toBe(30);
    expect(3 + 2 * 2).toBe(7);
  }, 60_000);

  it("keeps the part 4 wishlist and rewritten wording current", () => {
    const wishlist = readFileSync(
      new URL("../../../content/python-for-data-analysis/.authoring/figure-wishlist.md", import.meta.url),
      "utf8",
    );
    for (const heading of [
      "## text-and-transformations, step same-shop-different-text",
      "## summaries-and-groups, step two-ways-to-be-typical",
      "## combine-tables, step repeated-keys-multiply",
      "## reshape-a-report, step list-to-grid",
    ])
      expect(wishlist).toContain(heading);
    // The missing-values wishlist entries from earlier parts are still there.
    expect(wishlist).toContain("## filters-and-columns, step a-test-for-every-row");
  });

  it("keeps the rewritten prompts self-contained and the wishlist current", () => {
    expect(question("python-ranges-and-randomness-3").prompt).toContain("1 to 6");
    expect(question("python-ranges-and-randomness-4").prompt).toContain("same seed");
    expect(question("python-labels-and-positions-3").prompt).toContain("rows labelled 10, 20 and 30");
    expect(question("python-filters-and-columns-2").prompt).toContain("(Bay, 5)");
    expect(question("python-filters-and-columns-faded-bay").prompt).toContain("(Hill, 7)");
    expect(question("python-filters-and-columns-4").prompt).toContain("price column");
    expect(question("python-missing-values-2").prompt).toContain("4, missing and 10");
    expect(question("python-missing-values-why-eight").prompt).toContain("6, missing, 10, missing");
    const wishlist = readFileSync(
      new URL("../../../content/python-for-data-analysis/.authoring/figure-wishlist.md", import.meta.url),
      "utf8",
    );
    for (const heading of [
      "## lists-and-tuples, step lists-inside-lists",
      "## ranges-and-randomness, step posts-at-both-ends",
      "## labels-and-positions, step the-number-on-the-door",
      "## filters-and-columns, step a-test-for-every-row",
    ])
      expect(wishlist).toContain(heading);
  });

  it("has a course introduction", () => {
    const intro = JSON.parse(
      readFileSync(
        new URL("../../../content/python-for-data-analysis/.authoring/course-intro.json", import.meta.url),
        "utf8",
      ),
    ) as { paragraphs: string[]; outcomes: string[]; prerequisites: string; length: string };
    const total = intro.paragraphs.join(" ").split(/\s+/u).length;
    expect(total).toBeGreaterThanOrEqual(120);
    expect(total).toBeLessThanOrEqual(200);
    expect(intro.outcomes.length).toBeGreaterThanOrEqual(3);
    expect(intro.outcomes.length).toBeLessThanOrEqual(5);
  });

  it("keeps multiple choice at or under 35 per cent of the course", () => {
    const choices = candidate.questions.filter((item) => item.choices?.length).length;
    expect(choices / candidate.questions.length).toBeLessThanOrEqual(0.35);
  });

  it("has numeric keys equal to the value each described program computes", () => {
    const numeric = ROWS.filter((row) => row.kind === "n");
    expect(numeric.length).toBeGreaterThan(150);
    for (const row of numeric) {
      const authority = question(row.id).answerAuthority;
      if (authority.kind !== "numeric") throw new Error(`${row.id} is not numeric`);
      expect(authority.value, row.id).toBe(row.expect);
    }
  });

  it("marks exactly the intended option on every choice question", () => {
    for (const row of ROWS.filter((item) => item.kind === "c")) {
      const item = question(row.id);
      if (item.answerAuthority.kind !== "text") throw new Error(`${row.id} is not a choice`);
      const authority = item.answerAuthority;
      const marked = item
        .choices!.filter((choice) => assessTextAnswer(choice.label, authority).correct)
        .map((choice) => choice.id);
      expect(marked, row.id).toEqual([row.choice]);
    }
  });

  it("gives every misconception a distinct wrong value, never the key", () => {
    for (const row of ROWS.filter((item) => item.kind === "n")) {
      const item = question(row.id);
      for (const misconception of item.misconceptions ?? []) {
        const values = misconception.match.numeric ?? [];
        expect(values, row.id).not.toContain(row.expect);
      }
    }
  });

  // Spawns one interpreter per snippet, so it needs more than the default 5s when other
  // packages' tests share the CPU.
  it("runs the pure-Python snippets and reproduces every key", () => {
    if (!hasPython) return;
    for (const row of ROWS.filter((item) => item.code && !/numpy|pandas|pd\.|np\./.test(item.code))) {
      expect(evaluate(row.code!), row.id).toEqual(row.expect);
    }
  }, 30_000);

  it.skipIf(!hasLibraries)("runs the NumPy and pandas snippets and reproduces every key", () => {
    for (const row of ROWS.filter((item) => item.code && /numpy|pandas|pd\.|np\./.test(item.code))) {
      const value = evaluate(row.code!);
      if (typeof row.expect === "number" && typeof value === "number")
        expect(Math.abs(value - row.expect), row.id).toBeLessThan(1e-9);
      else expect(value, row.id).toEqual(row.expect);
    }
  }, 120_000);
});
