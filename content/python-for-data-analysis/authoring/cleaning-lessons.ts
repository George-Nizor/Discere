import {
  type PythonLesson,
  ex,
  pair,
  numeric as n,
  choose as c,
  numberCard as nc,
  termCard as tc,
} from "./definition.js";
export const cleaningLessons: PythonLesson[] = [
  {
    id: "missing-values",
    title: "Keep unknown separate from zero",
    moduleId: "python-tables",
    summary: "Detect missing values and understand how cleaning choices affect summaries.",
    sourceId: "pd-missing",
    section: "Values considered missing; isna; calculations with missing data; fillna and dropna",
    beats: [
      {
        title: "Missing is a different observation",
        text: "pandas uses missing-value markers suited to the dtype, such as NaN, NaT or pd.NA. Use isna to detect missing data. An observed zero is a known value and must not be treated as missing.",
        examples: pair(
          ex(
            "Numeric observations",
            [
              "import pandas as pd\ns = pd.Series([0, None, 8], dtype='Float64')",
              "missing = s.isna()",
            ],
            ["s", "missing"],
          ),
          ex(
            "Count missing",
            [
              "import pandas as pd\ns = pd.Series([None, 4, None], dtype='Float64')",
              "count = s.isna().sum()",
            ],
            ["s", "count"],
          ),
        ),
      },
      {
        title: "The denominator can change",
        text: "Many numeric reductions skip missing values by default. count counts known values; size counts all positions. mean uses the known observations unless you choose a different explicit policy.",
        examples: pair(
          ex(
            "Keep unknown",
            [
              "import pandas as pd\ns = pd.Series([2, None, 8], dtype='Float64')",
              "known = s.count()\nmean = s.mean()",
            ],
            ["s", "known", "mean"],
          ),
          ex(
            "Replace with zero",
            [
              "import pandas as pd\ns = pd.Series([2, None, 8], dtype='Float64')",
              "filled = s.fillna(0)\nmean = filled.mean()",
            ],
            ["filled", "mean"],
          ),
        ),
      },
      {
        title: "A fill value asserts something",
        text: "fillna(0) claims that unknown values should count as zero. That may be justified for some measurements and false for others. Preserve the original data and document the policy before replacing missing values.",
        examples: pair(
          ex(
            "Drop missing",
            [
              "import pandas as pd\ndf = pd.DataFrame({'shop': ['Bay', 'Hill', 'Lake'], 'units': [2, None, 8]})",
              "result = df.dropna(subset=['units'])",
            ],
            ["result"],
          ),
          ex(
            "Flag missing",
            [
              "import pandas as pd\ndf = pd.DataFrame({'shop': ['Bay', 'Hill', 'Lake'], 'units': [2, None, 8]})",
              "df['unknown_units'] = df['units'].isna()",
            ],
            ["df"],
          ),
        ),
      },
      {
        title: "Retain the result of a cleaning operation",
        text: "Assign the result of fillna back to the intended column. In pandas 3.0, calling an inplace method on a selected Series does not update its parent DataFrame. Explicit reassignment makes the target clear.",
        examples: pair(
          ex(
            "Reassign the column",
            [
              "import pandas as pd\ndf = pd.DataFrame({'units': [1, None, 5]})",
              "df['units'] = df['units'].fillna(0)",
            ],
            ["df"],
          ),
          ex(
            "Separate cleaned Series",
            [
              "import pandas as pd\ndf = pd.DataFrame({'units': [1, None, 5]})",
              "cleaned = df['units'].fillna(0)",
            ],
            ["df", "cleaned"],
          ),
        ),
      },
    ],
    questions: [
      n(
        "How many entries are missing in [0, None, 4, None]?",
        2,
        "The two None entries are missing. Zero is an observed value.",
        "Do not count zero as missing.",
        "import pandas as pd\nanswer=pd.Series([0,None,4,None]).isna().sum()",
      ),
      n(
        "What is the default mean of [4, missing, 10] in a numeric pandas Series?",
        7,
        "The known values 4 and 10 have mean 14 ÷ 2 = 7.",
        "Exclude the missing entry from both sum and count.",
        "import pandas as pd\nanswer=pd.Series([4,None,10]).mean()",
      ),
      c(
        "What assumption does filling an unknown measurement with zero make?",
        [
          "That the missing measurement should count as an observed zero",
          "That the original value has been recovered",
          "That missingness can no longer affect analysis",
        ],
        0,
        "A zero fill changes the data used in calculations. It does not recover the unknown original value.",
        "Separate a chosen replacement from an observation.",
      ),
      c(
        "Which expression detects pandas missing values?",
        ["s.isna()", "s == 0", "s == 'missing'"],
        0,
        "isna detects the dtype's missing-value marker. Zero and the string 'missing' are ordinary values unless a parsing policy says otherwise.",
        "Use pandas' missing-value operation.",
      ),
      n(
        "What is the mean after filling [3, missing, 9] with zero?",
        4,
        "The filled values are 3, 0 and 9; 12 ÷ 3 = 4.",
        "The replacement now participates in the denominator.",
        "import pandas as pd\nanswer=pd.Series([3,None,9]).fillna(0).mean()",
      ),
      n(
        "A Series contains [1, missing, missing, 7, 0]. What does count() return?",
        3,
        "The known values are 1, 7 and 0, so count returns 3.",
        "count excludes missing values but includes zero.",
        "import pandas as pd\nanswer=pd.Series([1,None,None,7,0]).count()",
      ),
    ],
    cards: [
      nc(
        "What is the default mean of [0, missing, 12, 6]?",
        6,
        "The three known observations sum to 18, giving a mean of 6.",
        "import pandas as pd\nanswer=pd.Series([0,None,12,6]).mean()",
      ),
      tc(
        "Which Series method replaces missing values with a chosen value?",
        "fillna",
        "fillna returns values with missing entries replaced according to an explicit policy.",
      ),
    ],
  },
  {
    id: "text-and-transformations",
    title: "Turn messy text into usable columns",
    moduleId: "python-tables",
    summary: "Clean and split strings, rename columns and choose vectorised or rowwise work.",
    sourceId: "pd-text",
    section: "String methods; splitting and replacing strings; pandas DataFrame.apply axis",
    beats: [
      {
        title: "Clean one value at a time across a column",
        text: "The .str accessor applies string operations to a Series. strip removes outside whitespace; lower standardises letter case. These operations return new values for explicit assignment.",
        examples: pair(
          ex(
            "Original labels",
            [
              "import pandas as pd\ns = pd.Series([' Bay ', 'HILL', ' lake'])",
              "result = s.str.strip()",
            ],
            ["s", "result"],
          ),
          ex(
            "Standardise case",
            [
              "import pandas as pd\ns = pd.Series([' Bay ', 'HILL', ' lake'])",
              "result = s.str.strip().str.lower()",
            ],
            ["s", "result"],
          ),
        ),
      },
      {
        title: "Split a known structure",
        text: "str.split with expand=True returns separate columns. Choose the delimiter from the data and limit splits when the remaining text may also contain it. A fixed two-part example does not prove every input has two parts.",
        examples: pair(
          ex(
            "Two fields",
            [
              "import pandas as pd\ns = pd.Series(['Bay|east', 'Hill|west'])",
              "parts = s.str.split('|', n=1, expand=True)\nparts.columns = ['shop', 'region']",
            ],
            ["parts"],
          ),
          ex(
            "Keep later separators",
            [
              "import pandas as pd\ns = pd.Series(['Bay|east|harbour', 'Hill|west'])",
              "parts = s.str.split('|', n=1, expand=True)\nparts.columns = ['shop', 'description']",
            ],
            ["parts"],
          ),
        ),
      },
      {
        title: "Choose the simplest transformation",
        text: "Series.map can call a function for each value. A lambda is a small function expression. Prefer an available vectorised string or arithmetic operation when it expresses the same calculation clearly.",
        examples: pair(
          ex(
            "Map a function",
            [
              "import pandas as pd\ns = pd.Series(['red,blue', 'green'])",
              "counts = s.map(lambda text: len(text.split(',')))",
            ],
            ["s", "counts"],
          ),
          ex(
            "String operation",
            [
              "import pandas as pd\ns = pd.Series(['red,blue', 'green'])",
              "counts = s.str.count(',') + 1",
            ],
            ["s", "counts"],
          ),
        ),
      },
      {
        title: "Rows need an explicit axis",
        text: "DataFrame.apply(..., axis=1) passes each row to the function. Its default axis=0 passes each column instead. Rename columns with a mapping and keep the returned table.",
        examples: pair(
          ex(
            "Apply by row",
            [
              "import pandas as pd\ndf = pd.DataFrame({'a': [2, 4], 'b': [3, 6]})",
              "df['total'] = df.apply(lambda row: row['a'] + row['b'], axis=1)",
            ],
            ["df"],
          ),
          ex(
            "Vectorised and renamed",
            [
              "import pandas as pd\ndf = pd.DataFrame({'a': [2, 4], 'b': [3, 6]})",
              "df['total'] = df['a'] + df['b']\ndf = df.rename(columns={'total': 'combined'})",
            ],
            ["df"],
          ),
        ),
      },
    ],
    questions: [
      n(
        "How many characters remain in '  NORTH '.strip().lower()?",
        5,
        "The cleaned string is north, which has five characters.",
        "Trim outside whitespace before counting.",
        "answer=len('  NORTH '.strip().lower())",
      ),
      n(
        "Splitting each of two strings once with expand=True produces two columns. How many data cells are in the result?",
        4,
        "Two rows times two columns gives four cells.",
        "Keep the row count separate from the split-field count.",
        "import pandas as pd\nanswer=pd.Series(['A|x','B|y']).str.split('|',n=1,expand=True).size",
      ),
      c(
        "What does Series.map(lambda x: len(x)) pass to the function?",
        ["Each Series value", "The whole DataFrame", "Only the first row"],
        0,
        "Series.map applies the function to each value in that Series.",
        "Identify which object owns the method.",
      ),
      c(
        "Which apply argument passes DataFrame rows to a function?",
        ["axis=1", "axis=0", "inplace=True"],
        0,
        "DataFrame.apply with axis=1 calls the function on each row. The default axis=0 works on columns.",
        "Choose the rowwise axis.",
      ),
      n(
        "For 'red,blue,gold', what does len(text.split(',')) produce?",
        3,
        "Splitting at the two commas produces three items.",
        "Count parts rather than delimiters.",
        "text='red,blue,gold'\nanswer=len(text.split(','))",
      ),
      n(
        "A row has a = 7 and b = 9. What is row['a'] + row['b']?",
        16,
        "The row calculation adds 7 and 9 to give 16.",
        "Use the two values from the same row.",
        "import pandas as pd\ndf=pd.DataFrame({'a':[7],'b':[9]})\nanswer=df.apply(lambda row:row['a']+row['b'],axis=1).iloc[0]",
      ),
    ],
    cards: [
      nc(
        "A nonempty string contains three commas and no empty parts. How many parts does split(',') return?",
        4,
        "Three separators divide the string into four parts.",
        "answer=len('a,b,c,d'.split(','))",
      ),
      tc(
        "Which pandas accessor supplies vectorised string methods on a Series?",
        "str",
        "Use the .str accessor, for example s.str.strip().",
      ),
    ],
  },
  {
    id: "dates-and-units",
    title: "Read a date without guessing",
    moduleId: "python-tables",
    summary: "Parse known date formats, retain invalid-date evidence and state epoch units.",
    sourceId: "pd-dates",
    section: "Converting to timestamps; invalid data; epoch timestamps; datetime properties",
    beats: [
      {
        title: "State the expected date format",
        text: "A string such as 03/04/2026 is ambiguous without a format convention. Supply format when the source format is known, then inspect failures instead of silently choosing an interpretation.",
        examples: pair(
          ex(
            "Day first",
            [
              "import pandas as pd\nraw = pd.Series(['03/04/2026'])",
              "dates = pd.to_datetime(raw, format='%d/%m/%Y')",
            ],
            ["raw", "dates"],
          ),
          ex(
            "Month first",
            [
              "import pandas as pd\nraw = pd.Series(['03/04/2026'])",
              "dates = pd.to_datetime(raw, format='%m/%d/%Y')",
            ],
            ["raw", "dates"],
          ),
        ),
      },
      {
        title: "An invalid date stays visible",
        text: "errors='coerce' converts unparseable dates to NaT. Count and inspect those missing dates. Assigning a made-up date can distort trends and durations.",
        examples: pair(
          ex(
            "Valid calendar dates",
            [
              "import pandas as pd\nraw = pd.Series(['2026-02-28', '2026-03-01'])",
              "dates = pd.to_datetime(raw, format='%Y-%m-%d', errors='coerce')",
            ],
            ["dates"],
          ),
          ex(
            "Impossible date",
            [
              "import pandas as pd\nraw = pd.Series(['2026-02-30', '2026-03-01'])",
              "dates = pd.to_datetime(raw, format='%Y-%m-%d', errors='coerce')\ninvalid = dates.isna().sum()",
            ],
            ["dates", "invalid"],
          ),
        ),
      },
      {
        title: "An epoch number needs a unit",
        text: "Unix timestamps commonly count seconds from 1970-01-01 UTC, but datasets also use milliseconds and other units. Supply unit explicitly when converting. An integer representation of a datetime is not automatically seconds.",
        examples: pair(
          ex(
            "Seconds",
            [
              "import pandas as pd",
              "dates = pd.to_datetime(pd.Series([0, 60]), unit='s', utc=True)",
            ],
            ["dates"],
          ),
          ex(
            "Milliseconds",
            [
              "import pandas as pd",
              "dates = pd.to_datetime(pd.Series([0, 60]), unit='ms', utc=True)",
            ],
            ["dates"],
          ),
        ),
      },
      {
        title: "Extract or subtract dates deliberately",
        text: "The .dt accessor extracts calendar fields from a datetime Series. Subtracting timestamps produces a duration. Keep timezone assumptions consistent before comparing events.",
        examples: pair(
          ex(
            "Calendar month",
            [
              "import pandas as pd\ndates = pd.to_datetime(pd.Series(['2026-04-02', '2026-05-03']))",
              "months = dates.dt.month",
            ],
            ["dates", "months"],
          ),
          ex(
            "Elapsed days",
            [
              "import pandas as pd\ndates = pd.to_datetime(pd.Series(['2026-04-02', '2026-04-05']))",
              "days = (dates.iloc[1] - dates.iloc[0]).days",
            ],
            ["dates", "days"],
          ),
        ),
      },
    ],
    questions: [
      n(
        "Parse '05/09/2026' with format='%d/%m/%Y'. What month number results?",
        9,
        "The format reads day 05 and month 09, so the month is 9.",
        "Follow the specified format rather than a regional guess.",
        "import pandas as pd\nanswer=pd.to_datetime('05/09/2026',format='%d/%m/%Y').month",
      ),
      n(
        "With format='%Y-%m-%d' and errors='coerce', how many missing dates result from ['2026-02-30', '2026-03-01', 'bad']?",
        2,
        "February 30 and bad cannot be parsed as valid dates, so both become NaT.",
        "Check calendar validity as well as formatting.",
        "import pandas as pd\nanswer=pd.to_datetime(pd.Series(['2026-02-30','2026-03-01','bad']),format='%Y-%m-%d',errors='coerce').isna().sum()",
      ),
      c(
        "Which parameter distinguishes an epoch count in seconds from milliseconds?",
        ["unit", "axis", "sheet_name"],
        0,
        "unit tells pandas how to interpret the numeric offset from the epoch.",
        "The number alone does not specify its scale.",
      ),
      c(
        "What is the result of coercing an invalid datetime?",
        ["NaT", "A known zero-length duration", "Today's date"],
        0,
        "NaT marks the missing datetime. It does not supply a valid replacement date.",
        "Coercion records a failed parse as missing.",
      ),
      n(
        "How many seconds separate epoch offsets 120 and 300 when unit='s'?",
        180,
        "Both offsets use seconds, so the elapsed time is 300 − 120 = 180 seconds.",
        "Subtract offsets in the same unit.",
        "import pandas as pd\na=pd.to_datetime([120,300],unit='s',utc=True)\nanswer=(a[1]-a[0]).total_seconds()",
      ),
      n(
        "How many days separate 2026-06-02 and 2026-06-07 at the same time of day?",
        5,
        "The later date is five days after the earlier one.",
        "Subtract the earlier date from the later date.",
        "import pandas as pd\nanswer=(pd.Timestamp('2026-06-07')-pd.Timestamp('2026-06-02')).days",
      ),
    ],
    cards: [
      nc(
        "Parse '12/08/2026' with format='%d/%m/%Y'. What month number results?",
        8,
        "The format places the month in the middle, giving August, month 8.",
        "import pandas as pd\nanswer=pd.to_datetime('12/08/2026',format='%d/%m/%Y').month",
      ),
      tc(
        "Which datetime Series accessor exposes properties such as month and year?",
        "dt",
        "Use .dt, for example dates.dt.year.",
      ),
    ],
  },
];
