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
      expect(lesson.steps.length, lesson.id).toBeGreaterThanOrEqual(5);
      expect(lesson.steps.length, lesson.id).toBeLessThanOrEqual(7);
      expect(lesson.steps.some((step) => step.kind === "transfer"), lesson.id).toBe(true);
    }
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

  it("runs the pure-Python snippets and reproduces every key", () => {
    if (!hasPython) return;
    for (const row of ROWS.filter((item) => item.code && !/numpy|pandas|pd\.|np\./.test(item.code))) {
      expect(evaluate(row.code!), row.id).toEqual(row.expect);
    }
  });

  it.skipIf(!hasLibraries)("runs the NumPy and pandas snippets and reproduces every key", () => {
    for (const row of ROWS.filter((item) => item.code && /numpy|pandas|pd\.|np\./.test(item.code))) {
      const value = evaluate(row.code!);
      if (typeof row.expect === "number" && typeof value === "number")
        expect(Math.abs(value - row.expect), row.id).toBeLessThan(1e-9);
      else expect(value, row.id).toEqual(row.expect);
    }
  }, 120_000);
});
