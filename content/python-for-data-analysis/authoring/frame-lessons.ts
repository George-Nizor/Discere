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
const labelled =
  "import pandas as pd\ndf = pd.DataFrame({'units': [2, 5, 8], 'price': [4, 6, 3]}, index=[10, 20, 30])";
export const frameLessons: PythonLesson[] = [
  {
    id: "read-and-inspect",
    title: "Meet a real table",
    moduleId: "python-tables",
    summary: "Read CSV data, inspect a DataFrame and preserve meaningful column types.",
    sourceId: "pd-io",
    section:
      "CSV parsing: read_csv, dtype, separator; pandas data structures: Series and DataFrame",
    beats: [
      {
        title: "Read rows and name columns",
        text: "read_csv turns delimited text into a DataFrame. The header normally supplies column names; each data line becomes a row. In these examples, StringIO provides an in-memory text file.",
        examples: pair(
          ex(
            "Comma separated",
            [
              "import pandas as pd\nfrom io import StringIO\ncsv = 'shop,units\\nBay,2\\nHill,5'",
              "df = pd.read_csv(StringIO(csv))",
            ],
            ["df"],
          ),
          ex(
            "Semicolon separated",
            [
              "import pandas as pd\nfrom io import StringIO\ncsv = 'shop;units\\nBay;2\\nHill;5'",
              "df = pd.read_csv(StringIO(csv), sep=';')",
            ],
            ["df"],
          ),
        ),
      },
      {
        title: "Inspect before calculating",
        text: "shape reports rows and columns. head shows initial rows without changing the table. A selected column is usually a Series; selecting a list of column names keeps a DataFrame.",
        examples: pair(
          ex("A Series", [sales, "result = df['units']\nshape = df.shape"], ["result", "shape"]),
          ex(
            "A DataFrame",
            [sales, "result = df[['units']]\nshape = result.shape"],
            ["result", "shape"],
          ),
        ),
      },
      {
        title: "Identifiers are not measurements",
        text: "A code such as 0012 may look numeric but depend on its leading zeros. Specify a string dtype for identifiers instead of relying on numeric inference. Check inferred dtypes before analysis.",
        examples: pair(
          ex(
            "Inferred numeric ID",
            [
              "import pandas as pd\nfrom io import StringIO",
              "df = pd.read_csv(StringIO('code,units\\n0012,4\\n0013,7'))",
            ],
            ["df"],
          ),
          ex(
            "Explicit text ID",
            [
              "import pandas as pd\nfrom io import StringIO",
              "df = pd.read_csv(StringIO('code,units\\n0012,4\\n0013,7'), dtype={'code': 'str'})",
            ],
            ["df"],
          ),
        ),
      },
      {
        title: "Match the reader to the source",
        text: "read_excel can select a worksheet with sheet_name; read_csv selects parsing rules for a text file. A CSV has no worksheets. Methods such as columns, dtypes and head help confirm that the import matches its source.",
        examples: pair(
          ex(
            "Column names",
            [sales, "names = list(df.columns)\npreview = df.head(2)"],
            ["names", "preview"],
          ),
          ex("Column types", [sales, "types = df.dtypes.astype(str)"], ["types"]),
        ),
      },
    ],
    questions: [
      n(
        "A CSV has one header line followed by six data lines, with no blank lines. How many DataFrame rows are read?",
        6,
        "The header supplies column names, leaving six data rows.",
        "Do not count the header as an observation.",
        "import pandas as pd\nfrom io import StringIO\nanswer=len(pd.read_csv(StringIO('x\\n1\\n2\\n3\\n4\\n5\\n6')))",
      ),
      n(
        "A DataFrame has shape (7, 3). How many columns does it have?",
        3,
        "The second shape entry is the column count, so there are three columns.",
        "Read shape as rows, columns.",
        "import pandas as pd\nanswer=pd.DataFrame([[0]*3]*7).shape[1]",
      ),
      c(
        "How should an ID such as 0012 be read when the leading zeros matter?",
        [
          "As text with an explicit string dtype",
          "As a floating-point measurement",
          "As an integer and then divided by ten",
        ],
        0,
        "An explicit string dtype preserves the ID's characters, including leading zeros.",
        "An identifier's formatting can be meaningful.",
      ),
      c(
        "Which read_excel argument selects a worksheet?",
        ["sheet_name", "sep", "axis"],
        0,
        "sheet_name selects the worksheet. sep describes a text delimiter for readers such as read_csv.",
        "A worksheet is part of an Excel workbook.",
      ),
      n(
        "A DataFrame has eight rows. How many rows does df.head(3) return?",
        3,
        "head(3) returns the first three rows without removing the remaining rows.",
        "head selects a preview.",
        "import pandas as pd\nanswer=len(pd.DataFrame({'x':range(8)}).head(3))",
      ),
      n(
        "A DataFrame has five rows. How many rows remain in df after preview = df.head(2)?",
        5,
        "Creating the preview does not mutate df; all five rows remain.",
        "Distinguish a returned object from an in-place change.",
        "import pandas as pd\ndf=pd.DataFrame({'x':range(5)})\npreview=df.head(2)\nanswer=len(df)",
      ),
    ],
    cards: [
      nc(
        "A DataFrame has shape (9, 4). How many data cells does it contain, excluding labels?",
        36,
        "Nine rows times four columns gives 36 data cells.",
        "import pandas as pd\nanswer=pd.DataFrame([[0]*4]*9).size",
      ),
      tc(
        "Which pandas reader loads comma-separated text into a DataFrame? Give the function name.",
        "read_csv",
        "pd.read_csv reads delimited text and returns a DataFrame.",
      ),
    ],
  },
  {
    id: "labels-and-positions",
    title: "Find the intended row",
    moduleId: "python-tables",
    summary: "Distinguish loc labels from iloc positions and recognise index alignment.",
    sourceId: "pd-index",
    section: "Selection by label; selection by position; series assignment and index alignment",
    beats: [
      {
        title: "A label is not a position",
        text: "loc looks up index labels. iloc uses zero-based positions. With index labels 10, 20 and 30, the first row has label 10 and position 0.",
        examples: pair(
          ex("Label 20", [labelled, "result = df.loc[20, 'units']"], ["df", "result"]),
          ex("Position 1", [labelled, "result = df.iloc[1, 0]"], ["df", "result"]),
        ),
      },
      {
        title: "Label slices include the stop",
        text: "On this sorted index, loc[10:20] includes both existing boundary labels. iloc[0:1] includes position 0 and stops before position 1. Do not transfer one slicing convention to the other.",
        examples: pair(
          ex("Label slice", [labelled, "result = df.loc[10:20]"], ["result"]),
          ex("Position slice", [labelled, "result = df.iloc[0:1]"], ["result"]),
        ),
      },
      {
        title: "Choose rows and columns together",
        text: "The expression before the comma selects rows; the expression after it selects columns. loc accepts column names, while iloc accepts column positions.",
        examples: pair(
          ex("Named columns", [labelled, "result = df.loc[[10, 30], ['price']]"], ["result"]),
          ex("Positional columns", [labelled, "result = df.iloc[[0, 2], [1]]"], ["result"]),
        ),
      },
      {
        title: "Labels align assigned Series",
        text: "When you assign a Series to a DataFrame column, pandas aligns index labels. A differently ordered Series follows its labels rather than its visible order. A plain list instead supplies positional values of matching length.",
        examples: pair(
          ex(
            "Label alignment",
            [
              "import pandas as pd\ndf = pd.DataFrame({'shop': ['Bay', 'Hill']}, index=[10, 20])",
              "df['units'] = pd.Series([8, 3], index=[20, 10])",
            ],
            ["df"],
          ),
          ex(
            "Positional list",
            [
              "import pandas as pd\ndf = pd.DataFrame({'shop': ['Bay', 'Hill']}, index=[10, 20])",
              "df['units'] = [8, 3]",
            ],
            ["df"],
          ),
        ),
      },
    ],
    questions: [
      n(
        "A Series has values [4, 7, 9] at labels [10, 20, 30]. What is s.loc[20]?",
        7,
        "Label 20 identifies the middle value, 7.",
        "loc reads a label, not a position.",
        "import pandas as pd\ns=pd.Series([4,7,9],index=[10,20,30])\nanswer=s.loc[20]",
      ),
      n(
        "On sorted labels [10, 20, 30, 40], how many rows does df.loc[20:40] select?",
        3,
        "The included labels are 20, 30 and 40. Label slicing includes the stop.",
        "Include both existing boundary labels.",
        "import pandas as pd\ndf=pd.DataFrame({'x':[1,2,3,4]},index=[10,20,30,40])\nanswer=len(df.loc[20:40])",
      ),
      c(
        "Which selector chooses a row by zero-based position?",
        ["iloc", "loc", "columns"],
        0,
        "iloc selects by integer position; loc selects by label.",
        "The first position is 0 even when the first label is different.",
      ),
      c(
        "A Series is assigned as a DataFrame column. How are values matched?",
        ["By index label", "Always by displayed order", "Alphabetically by the values"],
        0,
        "Series assignment aligns matching index labels, including when their order differs.",
        "Track labels on both objects.",
      ),
      n(
        "How many rows does df.iloc[1:4] select from a six-row DataFrame?",
        3,
        "It selects positions 1, 2 and 3; the stop 4 is excluded.",
        "Use ordinary stop-exclusive positional slicing.",
        "import pandas as pd\ndf=pd.DataFrame({'x':range(6)})\nanswer=len(df.iloc[1:4])",
      ),
      n(
        "A Series has values [11, 22] at labels ['b', 'a']. What value aligns to DataFrame row 'a'?",
        22,
        "The value with label a is 22, regardless of its position in the Series.",
        "Match the requested label.",
        "import pandas as pd\ndf=pd.DataFrame(index=['a','b'])\ndf['x']=pd.Series([11,22],index=['b','a'])\nanswer=df.loc['a','x']",
      ),
    ],
    cards: [
      nc(
        "A five-row DataFrame uses default labels 0 through 4. How many rows does df.loc[1:3] select?",
        3,
        "Label slicing includes 1, 2 and 3.",
        "import pandas as pd\ndf=pd.DataFrame({'x':range(5)})\nanswer=len(df.loc[1:3])",
      ),
      tc(
        "Which selector uses labels and includes an existing stop label in a sorted slice?",
        "loc",
        "loc selects labels; its sorted label slices include both existing endpoints.",
      ),
    ],
  },
  {
    id: "filters-and-columns",
    title: "Keep the rows that answer the question",
    moduleId: "python-tables",
    summary: "Build Boolean masks, derive columns and make explicit assignments.",
    sourceId: "pd-index",
    section:
      "Boolean indexing; combining conditions; setting values with loc; DataFrame column operations",
    beats: [
      {
        title: "A condition gives one decision per row",
        text: "Comparing a Series with a value creates a Boolean mask. Selecting df[mask] keeps the true rows. The mask preserves each row's connection to its data.",
        examples: pair(
          ex(
            "At least three units",
            [sales, "mask = df['units'] >= 3\nresult = df[mask]"],
            ["mask", "result"],
          ),
          ex(
            "Bay only",
            [sales, "mask = df['shop'] == 'Bay'\nresult = df[mask]"],
            ["mask", "result"],
          ),
        ),
      },
      {
        title: "Combine masks element by element",
        text: "Use & for AND and | for OR between pandas Boolean masks. Put parentheses around each comparison because Python's operator precedence can otherwise change the expression.",
        examples: pair(
          ex(
            "Bay and larger order",
            [sales, "result = df[(df['shop'] == 'Bay') & (df['units'] >= 3)]"],
            ["result"],
          ),
          ex(
            "Bay or larger order",
            [sales, "result = df[(df['shop'] == 'Bay') | (df['units'] >= 3)]"],
            ["result"],
          ),
        ),
      },
      {
        title: "Derive a measurement",
        text: "Multiplying matching numeric columns computes one value per row. Assigning a scalar fills the new column for every row. drop returns a changed table unless an explicit in-place operation is requested.",
        examples: pair(
          ex("Revenue per row", [sales, "df['revenue'] = df['units'] * df['price']"], ["df"]),
          ex("Drop a column", [sales, "result = df.drop(columns=['price'])"], ["result"]),
        ),
      },
      {
        title: "Update with one clear selection",
        text: "Use df.loc[mask, column] = value to update the intended rows on df. Chained indexing is unreliable for mutation and is incompatible with pandas 3.0's Copy-on-Write behaviour.",
        examples: pair(
          ex("Bay correction", [sales, "df.loc[df['shop'] == 'Bay', 'price'] = 6"], ["df"]),
          ex("Hill correction", [sales, "df.loc[df['shop'] == 'Hill', 'price'] = 9"], ["df"]),
        ),
      },
    ],
    questions: [
      n(
        "For units [1, 4, 6, 2], how many rows pass units >= 4?",
        2,
        "Only 4 and 6 satisfy the comparison.",
        "Evaluate the threshold for each row.",
        "import pandas as pd\nanswer=(pd.Series([1,4,6,2])>=4).sum()",
      ),
      n(
        "Rows are (Bay, 2), (Bay, 5), (Hill, 7). How many pass shop == 'Bay' AND units > 3?",
        1,
        "Only the Bay row with 5 units passes both conditions.",
        "Both comparisons must be true for the same row.",
        "import pandas as pd\ndf=pd.DataFrame({'shop':['Bay','Bay','Hill'],'units':[2,5,7]})\nanswer=len(df[(df['shop']=='Bay')&(df['units']>3)])",
      ),
      c(
        "Which expression combines two pandas Boolean comparisons safely?",
        ["(df['x'] > 2) & (df['y'] < 8)", "df['x'] > 2 and df['y'] < 8", "df['x'] = 2"],
        0,
        "Parenthesised comparisons joined by & form an elementwise AND mask.",
        "Use the elementwise operator and preserve each comparison.",
      ),
      c(
        "Which update directly targets df?",
        ["df.loc[mask, 'price'] = 6", "df[mask]['price'] = 6", "print(df[mask])"],
        0,
        "A single loc assignment targets rows and a column on df. Chained indexing can target a separate object.",
        "Keep the row and column selection in one assignment.",
      ),
      n(
        "Units are [2, 3] and prices [7, 5]. What is total revenue from units * price?",
        29,
        "The row revenues are 14 and 15, totalling 29.",
        "Multiply matching positions, then sum.",
        "import pandas as pd\ndf=pd.DataFrame({'units':[2,3],'price':[7,5]})\nanswer=(df['units']*df['price']).sum()",
      ),
      n(
        "A five-row DataFrame receives df['fee'] = 3. What is df['fee'].sum()?",
        15,
        "The scalar fills all five rows; 5 × 3 = 15.",
        "The assignment applies to every row.",
        "import pandas as pd\ndf=pd.DataFrame({'x':range(5)})\ndf['fee']=3\nanswer=df['fee'].sum()",
      ),
    ],
    cards: [
      nc(
        "Values are [2, 5, 8, 11]. How many pass (x > 3) & (x < 10)?",
        2,
        "Values 5 and 8 satisfy both comparisons.",
        "import pandas as pd\ns=pd.Series([2,5,8,11])\nanswer=((s>3)&(s<10)).sum()",
      ),
      tc(
        "Which selector supports a single explicit row-and-column assignment on a DataFrame?",
        "loc",
        "Use df.loc[row_mask, column_name] = value.",
      ),
    ],
  },
];
