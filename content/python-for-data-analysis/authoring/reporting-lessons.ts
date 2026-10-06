import {
  type PythonLesson,
  ex,
  pair,
  numeric as n,
  choose as c,
  numberCard as nc,
  termCard as tc,
  sales,
} from "./definition.js";
const joined =
  "import pandas as pd\norders = pd.DataFrame({'customer': [1, 1, 2, 3], 'amount': [10, 20, 15, 8]})\npeople = pd.DataFrame({'customer': [1, 2, 4], 'region': ['East', 'West', 'East']})";
const long =
  "import pandas as pd\ndf = pd.DataFrame({'shop': ['Bay', 'Bay', 'Hill', 'Hill'], 'month': ['Jan', 'Feb', 'Jan', 'Feb'], 'units': [2, 5, 3, 7]})";
const project =
  "import pandas as pd\norders = pd.DataFrame({'id': [1, 2, 3, 4, 5], 'shop': ['Bay', 'Hill', 'Bay', 'Lake', 'Hill'], 'units': [2, 3, 4, 1, 2], 'price': [5, 8, None, 6, 8], 'paid': [True, True, True, False, True]})";
export const reportingLessons: PythonLesson[] = [
  {
    id: "summaries-and-groups",
    title: "Summarise the right observations",
    moduleId: "python-analysis",
    summary: "Describe values, split groups and distinguish row counts from known measurements.",
    sourceId: "pd-group",
    section:
      "Built-in reductions; named aggregation; as_index; missing group keys; essential descriptive statistics",
    beats: [
      {
        title: "A summary has a denominator",
        text: "mean averages the known numeric values; median identifies their middle. describe supplies several descriptive statistics. A count is only meaningful when you know what can be missing.",
        examples: pair(
          ex(
            "Mean and median",
            [
              "import pandas as pd\ns = pd.Series([2, 3, 4, 19])",
              "mean = s.mean()\nmedian = s.median()",
            ],
            ["s", "mean", "median"],
          ),
          ex(
            "Describe",
            ["import pandas as pd\ns = pd.Series([2, 3, 4, 19])", "summary = s.describe()"],
            ["summary"],
          ),
        ),
      },
      {
        title: "Group before reducing",
        text: "groupby splits rows by key, then an aggregation computes within each group. as_index=False keeps the group key as an ordinary result column. The aggregated output is a table, not the intermediate GroupBy object.",
        examples: pair(
          ex(
            "Total units",
            [sales, "result = df.groupby('shop', as_index=False)['units'].sum()"],
            ["df", "result"],
          ),
          ex(
            "Average order size",
            [sales, "result = df.groupby('shop', as_index=False)['units'].mean()"],
            ["df", "result"],
          ),
        ),
      },
      {
        title: "size and count answer different questions",
        text: "Group size counts rows. count on a selected column counts its nonmissing values. Missing grouping keys are excluded by default; dropna=False retains a group for them.",
        examples: pair(
          ex(
            "Rows and known values",
            [
              "import pandas as pd\ndf = pd.DataFrame({'shop': ['Bay', 'Bay', 'Hill'], 'units': [2, None, 4]})",
              "result = df.groupby('shop').agg(rows=('units', 'size'), known=('units', 'count'))",
            ],
            ["df", "result"],
          ),
          ex(
            "Retain an unknown group",
            [
              "import pandas as pd\ndf = pd.DataFrame({'shop': ['Bay', None, 'Hill'], 'units': [2, 3, 4]})",
              "result = df.groupby('shop', dropna=False)['units'].sum()",
            ],
            ["df", "result"],
          ),
        ),
      },
      {
        title: "Sort the result you will report",
        text: "Sorting an aggregated table changes display order without changing totals. Specify ascending=False for largest first, and add a second key when ties need a reproducible order. nunique counts distinct known values by default.",
        examples: pair(
          ex(
            "Rank totals",
            [
              sales,
              "result = df.groupby('shop', as_index=False)['units'].sum()\nresult = result.sort_values(['units', 'shop'], ascending=[False, True])",
            ],
            ["result"],
          ),
          ex(
            "Distinct shops",
            [sales, "distinct = df['shop'].nunique()\nvalues = df['shop'].unique()"],
            ["distinct", "values"],
          ),
        ),
      },
    ],
    questions: [
      n(
        "What is the mean of [2, 4, 6, 20]?",
        8,
        "The values sum to 32; dividing by four gives 8.",
        "Use the sum and the observation count.",
        "import pandas as pd\nanswer=pd.Series([2,4,6,20]).mean()",
      ),
      n(
        "Rows are (Bay, 2), (Hill, 3), (Bay, 6). What is Bay's grouped sum?",
        8,
        "The Bay rows contribute 2 and 6, giving 8.",
        "Keep only the requested group's observations.",
        "import pandas as pd\ndf=pd.DataFrame({'shop':['Bay','Hill','Bay'],'units':[2,3,6]})\nanswer=df.groupby('shop')['units'].sum().loc['Bay']",
      ),
      c(
        "A group has five rows, with two missing units. What does units.count() count?",
        ["The three known unit values", "All five rows", "Only the missing values"],
        0,
        "count excludes missing unit values. size would count all five rows.",
        "Identify which operation counts observations versus known values.",
      ),
      c(
        "How can a group with a missing key be retained?",
        [
          "Use groupby(..., dropna=False)",
          "Sort descending",
          "Fill every numeric column with zero",
        ],
        0,
        "dropna=False retains missing grouping keys as a group without inventing numeric measurements.",
        "Control the treatment of the grouping key.",
      ),
      n(
        "What is the median of [1, 3, 5, 21]?",
        4,
        "The middle values are 3 and 5, so the median is their average, 4.",
        "Sort and inspect the two middle positions.",
        "import pandas as pd\nanswer=pd.Series([1,3,5,21]).median()",
      ),
      n(
        "What is nunique() for ['Bay', 'Hill', 'Bay', 'Lake']?",
        3,
        "There are three distinct shop labels.",
        "Repeated labels count once.",
        "import pandas as pd\nanswer=pd.Series(['Bay','Hill','Bay','Lake']).nunique()",
      ),
    ],
    cards: [
      nc(
        "A group has [2, missing, 5, missing]. What does count() return?",
        2,
        "Only 2 and 5 are known values.",
        "import pandas as pd\nanswer=pd.Series([2,None,5,None]).count()",
      ),
      tc(
        "Which group aggregation counts every row, including rows with missing measurements?",
        "size",
        "size counts rows; count on a column excludes its missing values.",
      ),
    ],
  },
  {
    id: "combine-tables",
    title: "Combine data without multiplying the answer",
    moduleId: "python-analysis",
    summary: "Stack rows, match keys and check join multiplicity before reporting totals.",
    sourceId: "pd-merge",
    section: "concat; merge join types; duplicate keys; validation; null key warning",
    beats: [
      {
        title: "Stacking keeps duplicate rows",
        text: "concat stacks rows by default and aligns columns by name. ignore_index=True creates a fresh positional index. It does not deduplicate records; this is closer to SQL UNION ALL than UNION.",
        examples: pair(
          ex(
            "Preserve labels",
            [
              "import pandas as pd\na = pd.DataFrame({'units': [2, 4]})\nb = pd.DataFrame({'units': [4, 6]})",
              "result = pd.concat([a, b])",
            ],
            ["result"],
          ),
          ex(
            "Fresh row labels",
            [
              "import pandas as pd\na = pd.DataFrame({'units': [2, 4]})\nb = pd.DataFrame({'units': [4, 6]})",
              "result = pd.concat([a, b], ignore_index=True)",
            ],
            ["result"],
          ),
        ),
      },
      {
        title: "A left join keeps unmatched left rows",
        text: "An inner merge keeps matching keys. A left merge retains every left row and supplies missing right-side values when there is no match. The how argument determines which rule runs.",
        examples: pair(
          ex(
            "Inner matches",
            [
              joined,
              "result = orders.merge(people, on='customer', how='inner', validate='many_to_one')",
            ],
            ["result"],
          ),
          ex(
            "Keep every order",
            [
              joined,
              "result = orders.merge(people, on='customer', how='left', validate='many_to_one', indicator=True)",
            ],
            ["result"],
          ),
        ),
      },
      {
        title: "Repeated keys multiply pairs",
        text: "If one key has two left rows and three right rows, a merge produces six matched pairs for that key. validate='many_to_one' rejects repeated keys on the right when you expect a unique lookup.",
        examples: pair(
          ex(
            "Unique lookup",
            [
              "import pandas as pd\na = pd.DataFrame({'id': [1, 1], 'amount': [5, 7]})\nb = pd.DataFrame({'id': [1], 'region': ['East']})",
              "result = a.merge(b, on='id', validate='many_to_one')",
            ],
            ["result"],
          ),
          ex(
            "Repeated lookup key",
            [
              "import pandas as pd\na = pd.DataFrame({'id': [1, 1], 'amount': [5, 7]})\nb = pd.DataFrame({'id': [1, 1], 'region': ['East', 'West']})",
              "result = a.merge(b, on='id')",
            ],
            ["result"],
          ),
        ),
      },
      {
        title: "Missing keys need their own policy",
        text: "pandas merge can match null keys to each other, unlike ordinary SQL equality joins. Check missing keys and decide whether they should be matched, rejected or kept as unmatched records.",
        examples: pair(
          ex(
            "Null keys can match",
            [
              "import pandas as pd\na = pd.DataFrame({'id': [1, None], 'amount': [5, 9]})\nb = pd.DataFrame({'id': [1, None], 'region': ['East', 'Unknown']})",
              "result = a.merge(b, on='id', how='left')",
            ],
            ["result"],
          ),
          ex(
            "Exclude missing lookup keys",
            [
              "import pandas as pd\na = pd.DataFrame({'id': [1, None], 'amount': [5, 9]})\nb = pd.DataFrame({'id': [1, None], 'region': ['East', 'Unknown']})",
              "result = a.merge(b.dropna(subset=['id']), on='id', how='left')",
            ],
            ["result"],
          ),
        ),
      },
    ],
    questions: [
      n(
        "Concatenate a three-row table and a four-row table without deduplication. How many rows result?",
        7,
        "Row stacking keeps all 3 + 4 = 7 rows.",
        "concat does not remove repeated rows.",
        "import pandas as pd\nanswer=len(pd.concat([pd.DataFrame({'x':[1,2,3]}),pd.DataFrame({'x':[3,4,5,6]})]))",
      ),
      n(
        "Left keys are [1, 2, 3] and unique right keys are [1, 2]. How many rows does a left merge return?",
        3,
        "All three left rows remain. Key 3 receives missing right-side values.",
        "The right keys are unique, so matching does not multiply left rows.",
        "import pandas as pd\nanswer=len(pd.DataFrame({'id':[1,2,3]}).merge(pd.DataFrame({'id':[1,2],'v':[4,5]}),on='id',how='left'))",
      ),
      c(
        "Which validation asserts that the lookup table on the right has unique keys?",
        ["validate='many_to_one'", "ignore_index=True", "ascending=False"],
        0,
        "many_to_one permits repeated left keys but requires each right key to identify at most one row.",
        "The right side is the one in many-to-one.",
      ),
      c(
        "How does pandas merge handle a null key on both sides?",
        [
          "It can match the null keys",
          "It always discards both rows",
          "It converts both keys to zero",
        ],
        0,
        "pandas can match null keys. Do not assume the usual SQL equality-join treatment of NULL.",
        "Check the library's missing-key rule.",
      ),
      n(
        "One key occurs three times on the left and twice on the right. How many matched rows does that key produce?",
        6,
        "Each left row pairs with each right row: 3 × 2 = 6.",
        "Count all matching pairs.",
        "import pandas as pd\nanswer=len(pd.DataFrame({'id':[1,1,1]}).merge(pd.DataFrame({'id':[1,1]}),on='id'))",
      ),
      n(
        "Left keys are [1, 1, 2, 3] and unique right keys are [1, 2]. How many rows does an inner merge return?",
        3,
        "Both left rows with key 1 and the row with key 2 match. Key 3 is excluded.",
        "Count matching left rows, including repeated keys.",
        "import pandas as pd\nanswer=len(pd.DataFrame({'id':[1,1,2,3]}).merge(pd.DataFrame({'id':[1,2]}),on='id',how='inner'))",
      ),
    ],
    cards: [
      nc(
        "A key appears twice on each side of a merge. How many matched rows does it produce?",
        4,
        "Each of the two left rows pairs with both right rows, giving four.",
        "import pandas as pd\nanswer=len(pd.DataFrame({'id':[1,1]}).merge(pd.DataFrame({'id':[1,1]}),on='id'))",
      ),
      tc(
        "Which pandas function stacks a list of DataFrames rowwise by default?",
        "concat",
        "pd.concat combines objects and retains duplicate rows unless you remove them explicitly.",
      ),
    ],
  },
  {
    id: "reshape-a-report",
    title: "Change the layout without losing the meaning",
    moduleId: "python-analysis",
    summary:
      "Pivot unique records, aggregate duplicate keys and melt columns back into observations.",
    sourceId: "pd-reshape",
    section: "pivot; pivot_table; melt",
    beats: [
      {
        title: "A pivot needs one value per cell",
        text: "pivot maps an index key and a column key to one value. The pair must uniquely identify the value. Wide layout can make comparisons easier to read while preserving the underlying observations.",
        examples: pair(
          ex(
            "Shops across months",
            [long, "result = df.pivot(index='shop', columns='month', values='units')"],
            ["result"],
          ),
          ex(
            "Months across shops",
            [long, "result = df.pivot(index='month', columns='shop', values='units')"],
            ["result"],
          ),
        ),
      },
      {
        title: "Duplicates require an aggregation rule",
        text: "pivot_table can aggregate repeated index-column pairs. Specify aggfunc deliberately: its default mean and a chosen sum answer different questions.",
        examples: pair(
          ex(
            "Sum repeated records",
            [
              "import pandas as pd\ndf = pd.DataFrame({'shop': ['Bay', 'Bay', 'Hill'], 'month': ['Jan', 'Jan', 'Jan'], 'units': [2, 6, 3]})",
              "result = df.pivot_table(index='shop', columns='month', values='units', aggfunc='sum')",
            ],
            ["result"],
          ),
          ex(
            "Mean repeated records",
            [
              "import pandas as pd\ndf = pd.DataFrame({'shop': ['Bay', 'Bay', 'Hill'], 'month': ['Jan', 'Jan', 'Jan'], 'units': [2, 6, 3]})",
              "result = df.pivot_table(index='shop', columns='month', values='units', aggfunc='mean')",
            ],
            ["result"],
          ),
        ),
      },
      {
        title: "Melt turns measurements into rows",
        text: "melt keeps identifier columns and turns selected value columns into a variable column and a value column. Melting two measurement columns for each of three rows produces six long-form rows.",
        examples: pair(
          ex(
            "Melt both months",
            [
              "import pandas as pd\ndf = pd.DataFrame({'shop': ['Bay', 'Hill'], 'Jan': [2, 3], 'Feb': [5, 7]})",
              "result = df.melt(id_vars='shop', value_vars=['Jan', 'Feb'], var_name='month', value_name='units')",
            ],
            ["result"],
          ),
          ex(
            "Melt one month",
            [
              "import pandas as pd\ndf = pd.DataFrame({'shop': ['Bay', 'Hill'], 'Jan': [2, 3], 'Feb': [5, 7]})",
              "result = df.melt(id_vars='shop', value_vars=['Feb'], var_name='month', value_name='units')",
            ],
            ["result"],
          ),
        ),
      },
      {
        title: "An absent cell is not automatically zero",
        text: "A missing shop-month combination produces an absent value in a pivot. fill_value=0 is appropriate only when no row really means zero under the measurement process. It does not recover an unobserved measurement.",
        examples: pair(
          ex(
            "Leave unknown",
            [
              "import pandas as pd\ndf = pd.DataFrame({'shop': ['Bay', 'Hill'], 'month': ['Jan', 'Feb'], 'units': [2, 7]})",
              "result = df.pivot_table(index='shop', columns='month', values='units', aggfunc='sum')",
            ],
            ["result"],
          ),
          ex(
            "Explicit zero policy",
            [
              "import pandas as pd\ndf = pd.DataFrame({'shop': ['Bay', 'Hill'], 'month': ['Jan', 'Feb'], 'units': [2, 7]})",
              "result = df.pivot_table(index='shop', columns='month', values='units', aggfunc='sum', fill_value=0)",
            ],
            ["result"],
          ),
        ),
      },
    ],
    questions: [
      n(
        "A complete pivot has three shops and four month columns. How many measurement cells does it contain?",
        12,
        "Each of the three shops has four monthly cells, giving 12.",
        "Count the grid cells without the labels.",
        "answer=3*4",
      ),
      n(
        "Two Bay/Jan records have units 3 and 9. What cell value does pivot_table(..., aggfunc='sum') produce?",
        12,
        "The duplicate key pair is aggregated as 3 + 9 = 12.",
        "Apply the specified aggregation.",
        "import pandas as pd\ndf=pd.DataFrame({'shop':['Bay','Bay'],'month':['Jan','Jan'],'units':[3,9]})\nanswer=df.pivot_table(index='shop',columns='month',values='units',aggfunc='sum').loc['Bay','Jan']",
      ),
      c(
        "Why does pivot fail when one index-column pair has two records?",
        [
          "The requested cell is not uniquely identified",
          "The table must have at least ten rows",
          "Every value must be text",
        ],
        0,
        "pivot does not choose an aggregation for ambiguous cells. Resolve duplicates or use an explicit pivot_table aggregation.",
        "One output cell needs a single value.",
      ),
      c(
        "Which melt argument identifies columns that stay attached to every measurement?",
        ["id_vars", "aggfunc", "ascending"],
        0,
        "id_vars retains identifier columns while selected value columns are unpivoted.",
        "Keep the identifier alongside each resulting observation.",
      ),
      n(
        "A four-row table melts three measurement columns. How many long-form rows result?",
        12,
        "Each original row contributes three measurements, producing 4 × 3 = 12 rows.",
        "Count one result row per selected measurement cell.",
        "import pandas as pd\ndf=pd.DataFrame({'id':range(4),'a':[1]*4,'b':[2]*4,'c':[3]*4})\nanswer=len(df.melt(id_vars='id'))",
      ),
      n(
        "Repeated records have values 4 and 10. What does aggfunc='mean' produce?",
        7,
        "The mean is (4 + 10) ÷ 2 = 7.",
        "The selected operation is mean, not sum.",
        "import pandas as pd\ndf=pd.DataFrame({'key':['a','a'],'value':[4,10]})\nanswer=df.pivot_table(index='key',values='value',aggfunc='mean').loc['a','value']",
      ),
    ],
    cards: [
      nc(
        "A three-row table melts two measurement columns. How many rows result?",
        6,
        "Each source row produces two measurement rows, giving six.",
        "import pandas as pd\ndf=pd.DataFrame({'id':[1,2,3],'a':[2,3,4],'b':[5,6,7]})\nanswer=len(df.melt(id_vars='id'))",
      ),
      tc(
        "Which pandas method reshapes measurement columns into variable/value rows?",
        "melt",
        "melt creates long-form observations while keeping the chosen identifier columns.",
      ),
    ],
  },
  {
    id: "audit-a-sales-report",
    title: "Build a report you can defend",
    moduleId: "python-analysis",
    summary: "Audit grain, missing measurements and lookup keys before reporting paid revenue.",
    sourceId: "pd-group",
    section: "Grouped aggregation; pandas merge validation; missing-value policy",
    beats: [
      {
        title: "State what one row means",
        text: "Each row in this dataset is one order, identified by id. Check duplicate identifiers before joining or aggregating. Repeated shop names are expected because a shop can receive several orders.",
        examples: pair(
          ex(
            "Order identifiers",
            [project, "duplicate_ids = orders['id'].duplicated().sum()\nrows = len(orders)"],
            ["duplicate_ids", "rows"],
          ),
          ex(
            "Repeated shop names",
            [project, "repeated_shops = orders['shop'].duplicated().sum()"],
            ["repeated_shops"],
          ),
        ),
      },
      {
        title: "Qualify the population and its missing data",
        text: "The report counts paid orders only. One paid order has an unknown price. Keep that count visible and call the result known revenue; replacing the unknown price with zero would hide uncertainty.",
        examples: pair(
          ex(
            "Paid population",
            [
              project,
              "paid = orders[orders['paid']].copy()\nunknown_prices = paid['price'].isna().sum()",
            ],
            ["paid", "unknown_prices"],
          ),
          ex(
            "Known revenue",
            [
              project,
              "paid = orders[orders['paid']].copy()\npaid['revenue'] = paid['units'] * paid['price']\nknown_total = paid['revenue'].sum(min_count=1)",
            ],
            ["paid", "known_total"],
          ),
        ),
      },
      {
        title: "Validate the enrichment",
        text: "Join each order to at most one shop-region record, then inspect unmatched rows. many_to_one validation catches a repeated lookup key before it can inflate revenue.",
        examples: pair(
          ex(
            "Complete lookup",
            [
              project,
              "lookup = pd.DataFrame({'shop': ['Bay', 'Hill', 'Lake'], 'region': ['East', 'West', 'East']})\nresult = orders.merge(lookup, on='shop', how='left', validate='many_to_one')",
            ],
            ["result"],
          ),
          ex(
            "An unmatched shop",
            [
              project,
              "lookup = pd.DataFrame({'shop': ['Bay', 'Hill'], 'region': ['East', 'West']})\nresult = orders.merge(lookup, on='shop', how='left', validate='many_to_one', indicator=True)",
            ],
            ["result"],
          ),
        ),
      },
      {
        title: "Report the result and the caveat together",
        text: "Group the paid population, total known revenue and retain the number of unknown prices. Sort for comparison. The final table communicates what is measured and what remains unknown.",
        examples: pair(
          ex(
            "Revenue with its caveat",
            [
              project,
              "paid = orders[orders['paid']].copy()\npaid['revenue'] = paid['units'] * paid['price']\npaid['unknown_price'] = paid['price'].isna()",
              "result = paid.groupby('shop', as_index=False).agg(known_revenue=('revenue', lambda s: s.sum(min_count=1)), unknown_prices=('unknown_price', 'sum'))",
            ],
            ["result"],
          ),
          ex(
            "Correct the missing input",
            [
              project,
              "orders.loc[orders['id'] == 3, 'price'] = 5\npaid = orders[orders['paid']].copy()\npaid['revenue'] = paid['units'] * paid['price']",
              "result = paid.groupby('shop', as_index=False)['revenue'].sum()",
            ],
            ["result"],
          ),
        ),
      },
    ],
    questions: [
      n(
        "Order IDs are [1, 2, 2, 3]. How many rows does duplicated() flag after the first occurrence?",
        1,
        "Only the second occurrence of ID 2 is flagged with the default keep='first'.",
        "Count extra occurrences, not every row sharing the key.",
        "import pandas as pd\nanswer=pd.Series([1,2,2,3]).duplicated().sum()",
      ),
      n(
        "Paid flags are [True, False, True, True]. How many orders belong in the paid report?",
        3,
        "Three rows have a true paid flag.",
        "Define the population before aggregating.",
        "import pandas as pd\nanswer=pd.Series([True,False,True,True]).sum()",
      ),
      c(
        "A paid order has an unknown price. Which report label preserves that limitation?",
        [
          "Known revenue, with the unknown-price count",
          "Complete revenue with no caveat",
          "Revenue after silently replacing the price with zero",
        ],
        0,
        "Known revenue reports the measured amount while the missing-price count states what the total excludes.",
        "Do not turn an unknown measurement into a known zero.",
      ),
      c(
        "A shop lookup contains two records for the same shop. What should a many-to-one enrichment do?",
        [
          "Reject the ambiguous lookup and resolve it",
          "Duplicate each order and continue silently",
          "Discard every order",
        ],
        0,
        "Validate the lookup before reporting. Resolve the duplicate according to its meaning rather than multiplying orders.",
        "Check the expected relationship between order rows and lookup keys.",
      ),
      n(
        "Paid orders are 2 units at 7, 3 units at 5, and 4 units at an unknown price. What is known revenue?",
        29,
        "The known rows contribute 14 and 15, totalling 29. The unknown row remains a caveat.",
        "Sum only the two known products.",
        "import pandas as pd\ndf=pd.DataFrame({'units':[2,3,4],'price':[7,5,None]})\nanswer=(df['units']*df['price']).sum(min_count=1)",
      ),
      n(
        "Paid orders contain 2 units at 7, 3 units at 5, and 4 units at a newly confirmed price of 6. What is the complete revenue?",
        53,
        "The missing order adds 4 × 6 = 24 to the known 29, producing 53.",
        "Add the newly established contribution.",
        "import pandas as pd\ndf=pd.DataFrame({'units':[2,3,4],'price':[7,5,6]})\nanswer=(df['units']*df['price']).sum()",
      ),
    ],
    cards: [
      nc(
        "Known paid rows contribute 5 units at 4 and 2 units at 9. A third price is missing. What is known revenue?",
        38,
        "The observed contributions are 20 and 18, totalling 38; the unknown contribution must still be reported.",
        "import pandas as pd\ndf=pd.DataFrame({'units':[5,2,1],'price':[4,9,None]})\nanswer=(df['units']*df['price']).sum(min_count=1)",
      ),
      tc(
        "Which merge validation allows repeated order keys on the left but requires a unique lookup on the right?",
        "many_to_one",
        "validate='many_to_one' checks the lookup's key uniqueness.",
      ),
    ],
  },
];
