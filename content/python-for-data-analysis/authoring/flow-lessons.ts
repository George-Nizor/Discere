import {
  type PythonLesson,
  ex,
  pair,
  numeric as n,
  choose as c,
  numberCard as nc,
  termCard as tc,
} from "./definition.js";

export const flowLessons: PythonLesson[] = [
  {
    id: "keys-and-sets",
    title: "Choose the right collection",
    moduleId: "python-core",
    summary: "Use dictionary keys for lookup and sets for distinct membership.",
    sourceId: "py-structures",
    section: "5.4 Sets; 5.5 Dictionaries",
    beats: [
      {
        title: "Keys identify values",
        text: "A dictionary maps unique keys to values. Assigning a value to an existing key replaces that entry. It does not add another copy of the key.",
        examples: pair(
          ex("Replace a value", ["stock = {'pen': 3, 'book': 2}", "stock['pen'] = 7"], ["stock"]),
          ex("Add a key", ["stock = {'pen': 3, 'book': 2}", "stock['lamp'] = 7"], ["stock"]),
        ),
      },
      {
        title: "Membership asks about keys",
        text: "The expression key in mapping checks dictionary keys. To test the values, use mapping.values(). get lets you specify a fallback for an absent key without raising KeyError.",
        examples: pair(
          ex(
            "Key lookup",
            [
              "stock = {'pen': 3, 'book': 2}",
              "exists = 'pen' in stock\nmissing = stock.get('lamp', 0)",
            ],
            ["exists", "missing"],
          ),
          ex(
            "Value lookup",
            [
              "stock = {'pen': 3, 'book': 2}",
              "exists = 3 in stock.values()\nkey_exists = 3 in stock",
            ],
            ["exists", "key_exists"],
          ),
        ),
      },
      {
        title: "Distinct items form a set",
        text: "A set removes duplicate elements and has no sequence position. Built-in set is mutable; add and remove change it. frozenset provides an immutable set.",
        examples: pair(
          ex(
            "Remove duplicates",
            ["visits = ['Bay', 'Hill', 'Bay']", "shops = set(visits)"],
            ["visits", "shops"],
          ),
          ex("Add a member", ["shops = {'Bay', 'Hill'}", "shops.add('Lake')"], ["shops"]),
        ),
      },
      {
        title: "Compare membership",
        text: "Set intersection & keeps members in both sets. Union | keeps members in either. Difference - keeps members in the left set that are absent from the right.",
        examples: pair(
          ex(
            "Shared members",
            ["a = {1, 2, 4}\nb = {2, 3, 4}", "result = a & b"],
            ["a", "b", "result"],
          ),
          ex(
            "Either set",
            ["a = {1, 2, 4}\nb = {2, 3, 4}", "result = a | b"],
            ["a", "b", "result"],
          ),
        ),
      },
    ],
    questions: [
      n(
        "d = {'a': 2, 'b': 5}; d['a'] = 9. How many keys does d have?",
        2,
        "The existing a entry changes value, leaving two distinct keys.",
        "Replacing a value is different from adding a key.",
        "d={'a':2,'b':5}\nd['a']=9\nanswer=len(d)",
      ),
      c(
        "For d = {'red': 4}, what does 'red' in d check?",
        ["Whether red is a key", "Whether red is a value", "Whether 4 is positive"],
        0,
        "Dictionary membership tests keys. Use d.values() to inspect membership among values.",
        "Focus on dictionary membership.",
      ),
      c(
        "Which statement about Python sets is correct?",
        [
          "set is mutable; frozenset is immutable",
          "Both are ordered sequences",
          "set cannot be changed after creation",
        ],
        0,
        "set supports membership-changing methods. frozenset is immutable, and neither is indexed as a sequence.",
        "Compare mutability and positional indexing separately.",
      ),
      n(
        "How many members are in {1, 3, 5} & {3, 4, 5}?",
        2,
        "The shared members are 3 and 5.",
        "Intersection keeps only shared members.",
        "answer=len({1,3,5}&{3,4,5})",
      ),
      n(
        "How many distinct items remain in set([2, 2, 4, 6, 4])?",
        3,
        "The distinct items are 2, 4 and 6.",
        "Ignore repeat occurrences.",
        "answer=len(set([2,2,4,6,4]))",
      ),
      n(
        "What is {'a': 7}.get('b', 10)?",
        10,
        "The key b is absent, so get returns the supplied fallback 10.",
        "Check the requested key, then the fallback.",
        "answer={'a':7}.get('b',10)",
      ),
    ],
    cards: [
      nc(
        "How many members are in {2, 4, 6} - {4, 8}?",
        2,
        "Removing shared member 4 leaves 2 and 6.",
        "answer=len({2,4,6}-{4,8})",
      ),
      tc(
        "What dictionary method returns a fallback when a key is absent? Give its name.",
        "get",
        "get(key, default) returns the mapped value or the specified default.",
      ),
    ],
  },
  {
    id: "conditions-and-loops",
    title: "Control which work happens",
    moduleId: "python-core",
    summary: "Trace branches, ranges, loop updates and Boolean conditions.",
    sourceId: "py-flow",
    section: "4.1 if; 4.2 for; 4.3 range; Python numeric truth testing",
    beats: [
      {
        title: "Only the matching branch runs",
        text: "An if/elif/else chain chooses the first true condition. Put specific conditions before broader ones when their ranges overlap. Equality == compares values; = assigns a name.",
        examples: pair(
          ex(
            "Small order",
            [
              "units = 3",
              "if units >= 10:\n    fee = 0\nelif units >= 5:\n    fee = 2\nelse:\n    fee = 4",
            ],
            ["units", "fee"],
          ),
          ex(
            "Large order",
            [
              "units = 12",
              "if units >= 10:\n    fee = 0\nelif units >= 5:\n    fee = 2\nelse:\n    fee = 4",
            ],
            ["units", "fee"],
          ),
        ),
      },
      {
        title: "A range excludes its stop",
        text: "for takes each item in turn. range(start, stop, step) excludes stop. Initialise an accumulator before the loop and update it inside the indented body.",
        examples: pair(
          ex(
            "First four integers",
            ["items = list(range(4))\ntotal = 0", "for item in items:\n    total += item"],
            ["items", "total"],
          ),
          ex(
            "Odd values",
            ["items = list(range(1, 8, 2))\ntotal = 0", "for item in items:\n    total += item"],
            ["items", "total"],
          ),
        ),
      },
      {
        title: "A while loop needs progress",
        text: "while tests its condition before each iteration. An update must eventually make the condition false when you intend the loop to finish. The final value may cross the threshold.",
        examples: pair(
          ex(
            "Add two",
            ["count = 1\nturns = 0", "while count < 6:\n    count += 2\n    turns += 1"],
            ["count", "turns"],
          ),
          ex(
            "Add three",
            ["count = 1\nturns = 0", "while count < 6:\n    count += 3\n    turns += 1"],
            ["count", "turns"],
          ),
        ),
      },
      {
        title: "Choose logical or bit operations",
        text: "and, or and not combine scalar truth tests. On integers, & and | operate on bits. Pandas later uses & and | for elementwise Boolean masks, with parentheses around each comparison.",
        examples: pair(
          ex("Logical test", ["x = 6", "within = x > 3 and x < 9"], ["x", "within"]),
          ex("Integer bits", ["a = 6\nb = 3", "both_bits = a & b"], ["a", "b", "both_bits"]),
        ),
      },
    ],
    questions: [
      n(
        "A fee is 0 when units >= 10, otherwise 2 when units >= 5, otherwise 4. What is the fee for 7 units?",
        2,
        "The first condition is false and the second true, so the fee is 2.",
        "Stop at the first matching branch.",
        "units=7\nanswer=0 if units>=10 else 2 if units>=5 else 4",
      ),
      n(
        "What is sum(range(2, 9, 2))?",
        20,
        "The range contains 2, 4, 6 and 8; their sum is 20.",
        "The stop value is excluded.",
        "answer=sum(range(2,9,2))",
      ),
      c(
        "A while loop's condition stays true and its body never changes it. What is the problem?",
        [
          "The loop may never finish",
          "The loop automatically stops after ten turns",
          "The body runs exactly once",
        ],
        0,
        "Without a terminating change or break, a true loop condition can keep the loop running indefinitely.",
        "Track whether the condition can become false.",
      ),
      c(
        "Which operator means scalar logical AND?",
        ["and", "=", "+"],
        0,
        "and combines scalar truth tests. The assignment operator = and addition operator + have different jobs.",
        "Select the Boolean operation.",
      ),
      n(
        "Start x = 2. While x < 10, add 3 to x. What is x when the loop stops?",
        11,
        "The updates produce 5, 8 and 11. At 11 the condition is false.",
        "Test the condition before each update.",
        "x=2\nwhile x<10: x+=3\nanswer=x",
      ),
      n(
        "What is 5 & 3 when both operands are integers?",
        1,
        "In binary, 5 is 101 and 3 is 011. Their shared set bit is 001, which is 1.",
        "Compare aligned binary digits.",
        "answer=5&3",
      ),
    ],
    cards: [
      nc(
        "How many iterations does for x in range(3, 12, 3) perform?",
        3,
        "The values are 3, 6 and 9; 12 is excluded.",
        "answer=len(range(3,12,3))",
      ),
      tc(
        "Which Python keyword provides an alternative condition after if?",
        "elif",
        "elif checks another condition if the preceding condition was false.",
      ),
    ],
  },
  {
    id: "functions-and-imports",
    title: "Turn a calculation into a tool",
    moduleId: "python-core",
    summary: "Define functions, pass arguments, return values and import installed libraries.",
    sourceId: "py-flow",
    section: "Defining functions; default arguments; keyword arguments; Python Modules 6",
    beats: [
      {
        title: "Return a useful value",
        text: "A function groups statements under a name. Its parameters receive arguments when you call it. return sends a value back to the caller; print only writes output.",
        examples: pair(
          ex("Return", ["def double(x):\n    return x * 2", "result = double(4)"], ["result"]),
          ex("Print", ["def double(x):\n    print(x * 2)", "result = double(4)"], ["result"]),
        ),
      },
      {
        title: "Name the argument you mean",
        text: "A default argument supplies a value when the caller omits it. Keyword arguments make the intended parameter explicit. They can be supplied in a different order from the function definition.",
        examples: pair(
          ex(
            "Default rate",
            ["def cost(units, rate=5):\n    return units * rate", "total = cost(3)"],
            ["total"],
          ),
          ex(
            "Named arguments",
            ["def cost(units, rate=5):\n    return units * rate", "total = cost(rate=7, units=3)"],
            ["total"],
          ),
        ),
      },
      {
        title: "A parameter can refer to a mutable object",
        text: "A function can mutate a list passed to it because the parameter refers to that object. Rebinding a local parameter to a new list does not replace the caller's name.",
        examples: pair(
          ex(
            "Mutate the list",
            ["def add_item(items):\n    items.append(9)", "values = [1, 2]", "add_item(values)"],
            ["values"],
          ),
          ex(
            "Rebind a parameter",
            ["def add_item(items):\n    items = [9]", "values = [1, 2]", "add_item(values)"],
            ["values"],
          ),
        ),
      },
      {
        title: "Import brings a module into scope",
        text: "A package must be available in the interpreter's environment before import can use it. An alias is a shorter local name. Importing a library does not install it, and a notebook may use a different environment from a terminal.",
        examples: pair(
          ex("Module name", ["import math", "result = math.sqrt(81)"], ["result"]),
          ex("Alias", ["import math as m", "result = m.sqrt(81)"], ["result"]),
        ),
      },
    ],
    questions: [
      n(
        "def triple(x): return x * 3. What does triple(7) return?",
        21,
        "The argument 7 is multiplied by 3 and returned as 21.",
        "Substitute the argument for the parameter.",
        "def triple(x): return x*3\nanswer=triple(7)",
      ),
      n(
        "def cost(units, rate=4): return units * rate. What does cost(rate=6, units=5) return?",
        30,
        "Keyword arguments assign units = 5 and rate = 6, so the product is 30.",
        "Match keywords to parameter names.",
        "def cost(units,rate=4): return units*rate\nanswer=cost(rate=6,units=5)",
      ),
      c(
        "A function prints 12 but has no return statement. What does the call return?",
        ["None", "12", "The string 'return'"],
        0,
        "Printing and returning are separate. A function that reaches the end without return produces None.",
        "Consider the value assigned from the call, not the displayed output.",
      ),
      c(
        "What does import pandas as pd do?",
        [
          "Binds pd to an available pandas module",
          "Installs pandas from the internet",
          "Converts every variable to a DataFrame",
        ],
        0,
        "The alias pd refers to the imported pandas module. Installation and import are separate actions.",
        "An alias changes the local name.",
      ),
      n(
        "def cost(units, rate=4): return units * rate. What does cost(8) return?",
        32,
        "The omitted rate uses the default 4: 8 × 4 = 32.",
        "Use the default for the missing argument.",
        "def cost(units,rate=4): return units*rate\nanswer=cost(8)",
      ),
      n(
        "What is math.sqrt(144)?",
        12,
        "The square root is 12 because 12 × 12 = 144.",
        "Find the nonnegative square root.",
        "import math\nanswer=math.sqrt(144)",
      ),
    ],
    cards: [
      nc(
        "def add(a, b=3): return a + b. What is add(8, b=5)?",
        13,
        "The explicit b argument replaces the default, giving 8 + 5 = 13.",
        "def add(a,b=3): return a+b\nanswer=add(8,b=5)",
      ),
      tc(
        "Which keyword sends a function's result back to its caller?",
        "return",
        "return ends the function call and supplies its result.",
      ),
    ],
  },
  {
    id: "errors-and-resources",
    title: "Handle failure without hiding it",
    moduleId: "python-core",
    summary: "Catch expected exceptions and manage files with a context manager.",
    sourceId: "py-errors",
    section: "8.3 handling exceptions; 8.8 predefined clean-up actions",
    beats: [
      {
        title: "Expect a specific failure",
        text: "int can parse a valid integer string. Invalid text raises ValueError. Catch that expected exception and choose an explicit fallback or report the bad input.",
        examples: pair(
          ex(
            "Valid text",
            ["text = '18'", "try:\n    value = int(text)\nexcept ValueError:\n    value = 0"],
            ["text", "value"],
          ),
          ex(
            "Invalid text",
            ["text = 'unknown'", "try:\n    value = int(text)\nexcept ValueError:\n    value = 0"],
            ["text", "value"],
          ),
        ),
      },
      {
        title: "Record what was skipped",
        text: "Skipping an invalid row changes the population being analysed. Keep a rejection count and make the policy explicit. A catch-all exception can hide programming mistakes.",
        examples: pair(
          ex(
            "All valid",
            [
              "texts = ['2', '5']\ntotal = 0\nrejected = 0",
              "for text in texts:\n    try:\n        total += int(text)\n    except ValueError:\n        rejected += 1",
            ],
            ["total", "rejected"],
          ),
          ex(
            "One bad value",
            [
              "texts = ['2', 'bad', '5']\ntotal = 0\nrejected = 0",
              "for text in texts:\n    try:\n        total += int(text)\n    except ValueError:\n        rejected += 1",
            ],
            ["total", "rejected"],
          ),
        ),
      },
      {
        title: "Close a resource when the block ends",
        text: "with manages entry and exit for a resource. When used with open, it closes the file after the block, even if the block exits through an exception. These examples use in-memory text streams so no local files are changed.",
        examples: pair(
          ex(
            "Read lines",
            [
              "from io import StringIO",
              "with StringIO('Bay\\nHill\\n') as stream:\n    lines = stream.readlines()",
              "closed = stream.closed",
            ],
            ["lines", "closed"],
          ),
          ex(
            "Count characters",
            [
              "from io import StringIO",
              "with StringIO('Lake') as stream:\n    text = stream.read()",
              "size = len(text)\nclosed = stream.closed",
            ],
            ["size", "closed"],
          ),
        ),
      },
      {
        title: "Locate data explicitly",
        text: "A relative path is resolved from the working directory, which may differ from the script's directory. Check the intended location and encoding when reading files. A missing file and invalid numeric text are different failures.",
        examples: pair(
          ex(
            "Line endings",
            [
              "from io import StringIO",
              "with StringIO('3\\n7\\n') as stream:\n    values = [int(line.strip()) for line in stream]",
              "total = sum(values)",
            ],
            ["values", "total"],
          ),
          ex(
            "Blank line policy",
            [
              "from io import StringIO",
              "with StringIO('3\\n\\n7\\n') as stream:\n    values = [int(line) for line in stream if line.strip()]",
              "total = sum(values)",
            ],
            ["values", "total"],
          ),
        ),
      },
    ],
    questions: [
      n(
        "Parse '24' with int, using 0 only on ValueError. What value is produced?",
        24,
        "The conversion succeeds, so the fallback is never used.",
        "The exception branch runs only if conversion fails.",
        "try: answer=int('24')\nexcept ValueError: answer=0",
      ),
      n(
        "Parse ['4', 'bad', '6', '?'] as integers and skip ValueError entries. What is the total?",
        10,
        "The valid entries are 4 and 6, which sum to 10. Two entries were rejected.",
        "Add only successful conversions.",
        "answer=0\nfor text in ['4','bad','6','?']:\n    try: answer+=int(text)\n    except ValueError: pass",
      ),
      c(
        "What is the main benefit of with open(...) as f?",
        [
          "It closes the file when the block exits",
          "It guarantees all file contents are valid",
          "It silently ignores every error",
        ],
        0,
        "The context manager closes the file when the block ends. Reading and validation can still fail.",
        "Resource management and data validation are separate.",
      ),
      c(
        "From where is a relative file path normally resolved?",
        [
          "The process working directory",
          "Always the script's directory",
          "Always the Downloads directory",
        ],
        0,
        "Relative paths resolve from the current working directory, so the same script can see different locations when launched differently.",
        "Consider the environment from which Python was launched.",
      ),
      n(
        "How many entries fail int conversion in ['7', '8.5', 'no', '2']?",
        2,
        "'8.5' is not an integer string, and 'no' is not numeric. The other two conversions succeed.",
        "int parses an integer string, not arbitrary numeric text.",
        "answer=0\nfor text in ['7','8.5','no','2']:\n    try: int(text)\n    except ValueError: answer+=1",
      ),
      n(
        "Read lines '5', blank, '9', ignoring blank lines. What is the sum?",
        14,
        "The two retained numbers are 5 and 9, giving 14.",
        "Apply the blank-line policy before conversion.",
        "from io import StringIO\nwith StringIO('5\\n\\n9\\n') as f:\n    answer=sum(int(line) for line in f if line.strip())",
      ),
    ],
    cards: [
      nc(
        "Convert ['3', '?', '8'] to integers, skipping ValueError entries. What is their sum?",
        11,
        "The valid values 3 and 8 sum to 11.",
        "answer=0\nfor text in ['3','?','8']:\n    try: answer+=int(text)\n    except ValueError: pass",
      ),
      tc(
        "Which exception does int('apple') raise?",
        "ValueError",
        "ValueError reports that the supplied string cannot represent the requested integer.",
      ),
    ],
  },
];
