import {
  type PythonLesson,
  ex,
  pair,
  numeric as n,
  choose as c,
  numberCard as nc,
  termCard as tc,
} from "./definition.js";

export const coreLessons: PythonLesson[] = [
  {
    id: "run-and-bind",
    title: "Follow a value through a program",
    moduleId: "python-core",
    summary: "Track assignment and execution order, then make a notebook reproducible.",
    sourceId: "py-intro",
    section: "3.1 assignment and expressions; Jupyter Running Code: code cells and kernel state",
    beats: [
      {
        title: "A name remembers a value",
        text: "Python runs these statements in order. Assigning subtotal to total copies the reference to the current number. Reassigning subtotal later does not recalculate total.",
        examples: pair(
          ex(
            "Before a price change",
            ["price = 4", "total = price * 3", "price = 6"],
            ["price", "total"],
          ),
          ex(
            "Recalculate the total",
            ["price = 4", "total = price * 3", "price = 6", "total = price * 3"],
            ["price", "total"],
          ),
        ),
      },
      {
        title: "Running again changes state",
        text: "A notebook kernel keeps names between cell runs. Repeating a cell containing += updates the existing value again. Its position on the page does not tell you how often it ran.",
        examples: pair(
          ex("One update", ["count = 2", "count += 3", "print(count)"], ["count"]),
          ex("Two updates", ["count = 2", "count += 3", "count += 3", "print(count)"], ["count"]),
        ),
      },
      {
        title: "Code and notes do different jobs",
        text: "A .py script contains Python statements. A .ipynb notebook can contain executable code cells and Markdown notes. Comments beginning with # explain code without performing a calculation.",
        examples: pair(
          ex("A comment", ["amount = 7\n# amount = 100", "print(amount)"], ["amount"]),
          ex("An assignment", ["amount = 7\namount = 100", "print(amount)"], ["amount"]),
        ),
      },
      {
        title: "Rebuild from a clean start",
        text: "Restart the kernel and run the code cells from top to bottom to check a notebook's dependencies. A calculation that needs an old, unrecorded variable will fail after the restart.",
        examples: pair(
          ex(
            "Complete sequence",
            ["units = 3", "cost = 8", "total = units * cost"],
            ["units", "cost", "total"],
          ),
          ex(
            "Changed input",
            ["units = 5", "cost = 8", "total = units * cost"],
            ["units", "cost", "total"],
          ),
        ),
      },
    ],
    questions: [
      n(
        "Set price = 5, then total = price * 4, then price = 9. What value does total keep?",
        20,
        "total was assigned 5 × 4 = 20. Reassigning price does not run the earlier multiplication again.",
        "Use price at the moment total is assigned.",
        "price=5\ntotal=price*4\nprice=9\nanswer=total",
      ),
      n(
        "A notebook starts count at 1. You run count += 4 three times. What is count?",
        13,
        "The updates produce 5, then 9, then 13.",
        "Count executions, not the number of cells.",
        "count=1\nfor _ in range(3): count+=4\nanswer=count",
      ),
      c(
        "Which notebook action executes Python statements?",
        ["Run a code cell", "Render a Markdown heading", "Save a screenshot"],
        0,
        "A code cell sends Python statements to the kernel. Markdown cells display notes.",
        "Distinguish executable code from formatted notes.",
      ),
      c(
        "Which check exposes reliance on stale notebook variables?",
        [
          "Restart the kernel and run all cells in order",
          "Run only the final cell again",
          "Rename the notebook",
        ],
        0,
        "Restarting removes the old state. Running all cells in order checks that the notebook creates what it needs.",
        "Remove the old kernel state before checking the calculation.",
      ),
      n(
        "Set units = 6 and cost = 7, then calculate total = units * cost. What is total?",
        42,
        "The two recorded inputs produce 6 × 7 = 42.",
        "Substitute both current inputs.",
        "units=6\ncost=7\nanswer=units*cost",
      ),
      n(
        "A script sets x = 3, then x = x + 2, then y = x * 4. What is y?",
        20,
        "The second line makes x equal 5; the last line gives 5 × 4 = 20.",
        "Follow the statements in execution order.",
        "x=3\nx=x+2\nanswer=x*4",
      ),
    ],
    cards: [
      nc(
        "Set a = 7, then b = a + 2, then a = 1. What is b?",
        9,
        "b keeps the value 9 assigned before a changed.",
        "a=7\nb=a+2\na=1\nanswer=b",
      ),
      tc(
        "What notebook component retains Python variables between code-cell runs?",
        "kernel",
        "The kernel retains the live Python state until it is restarted or shut down.",
      ),
    ],
  },
  {
    id: "numbers-and-types",
    title: "Know what a number means",
    moduleId: "python-core",
    summary: "Separate numeric values from text and choose arithmetic deliberately.",
    sourceId: "py-types",
    section: "Numeric types: int, float; truth value testing; arithmetic operations",
    beats: [
      {
        title: "Digits can still be text",
        text: "Quotation marks make a string. Adding two strings joins their characters. Convert valid numeric text with int or float before doing arithmetic.",
        examples: pair(
          ex("Text", ["a = '12'\nb = '3'", "result = a + b"], ["a", "result"]),
          ex("Numbers", ["a = '12'\nb = '3'", "result = int(a) + int(b)"], ["a", "result"]),
        ),
      },
      {
        title: "Division has two answers",
        text: "The / operator performs true division. The // operator takes the floor of the quotient, including for negative values. The remainder % completes a = (a // b) * b + a % b.",
        examples: pair(
          ex(
            "Positive dividend",
            ["a = 11\nb = 4", "quotient = a // b\nremainder = a % b\nexact = a / b"],
            ["quotient", "remainder", "exact"],
          ),
          ex(
            "Negative dividend",
            ["a = -11\nb = 4", "quotient = a // b\nremainder = a % b\nexact = a / b"],
            ["quotient", "remainder", "exact"],
          ),
        ),
      },
      {
        title: "Precision depends on the type",
        text: "Python integers can grow beyond a fixed 32-bit range, subject to available memory. Floats approximate many decimal fractions. For decimal money, use a suitable decimal representation rather than assuming every float is exact.",
        examples: pair(
          ex("Large integer", ["value = 2 ** 40", "exact = value + 1"], ["value", "exact"]),
          ex("Decimal float", ["total = 0.1 + 0.2", "equal = total == 0.3"], ["total", "equal"]),
        ),
      },
      {
        title: "Truth is not a word",
        text: "False is a Boolean value. The string 'False' contains characters and is truthy because it is nonempty. Test the condition you mean instead of relying on the spelling of a string.",
        examples: pair(
          ex("Boolean", ["value = False", "flag = bool(value)"], ["value", "flag"]),
          ex("Nonempty text", ["value = 'False'", "flag = bool(value)"], ["value", "flag"]),
        ),
      },
    ],
    questions: [
      n(
        "What is int('14') + int('6')?",
        20,
        "Both strings are converted to integers before addition: 14 + 6 = 20.",
        "Convert first, then add.",
        "answer=int('14')+int('6')",
      ),
      n(
        "What is -13 // 5?",
        -3,
        "-13 ÷ 5 is -2.6. Flooring moves down to -3.",
        "Flooring moves toward negative infinity.",
        "answer=-13//5",
      ),
      c(
        "Which description of Python's built-in int is correct?",
        [
          "Its size can grow, subject to memory",
          "It always stops at 2,147,483,647",
          "It stores only decimal fractions",
        ],
        0,
        "Python's built-in integers have arbitrary precision. A NumPy integer can have a fixed-width dtype.",
        "Distinguish Python int from a fixed-width array integer.",
      ),
      c(
        "What is bool('False')?",
        ["True", "False", "An empty string"],
        0,
        "The string is nonempty, so bool('False') is True. It is not the Boolean literal False.",
        "Check whether the string contains any characters.",
      ),
      n(
        "What is 19 % 6?",
        1,
        "19 = 3 × 6 + 1, so the remainder is 1.",
        "Find what remains after whole groups of six.",
        "answer=19%6",
      ),
      n(
        "What is 3 ** 4?",
        81,
        "Exponentiation multiplies four factors of 3: 3 × 3 × 3 × 3 = 81.",
        "The right operand counts factors.",
        "answer=3**4",
      ),
    ],
    cards: [
      nc("What is -8 // 3?", -3, "Flooring -2.666… gives -3.", "answer=-8//3"),
      tc(
        "Which Python built-in type stores a whole number with arbitrary precision?",
        "int",
        "int stores arbitrary-precision integers; available memory still limits their size.",
      ),
    ],
  },
  {
    id: "strings-and-slices",
    title: "Take exactly the text you need",
    moduleId: "python-core",
    summary: "Use zero-based indexing, slice boundaries and string methods.",
    sourceId: "py-intro",
    section: "3.1.2 Text: indexing, slicing, escaping and immutability",
    beats: [
      {
        title: "The boundary belongs between characters",
        text: "Index zero is the first character. Slices include the start and stop before the end: label[1:4] contains positions 1, 2 and 3.",
        examples: pair(
          ex("Middle slice", ["label = 'PLANET'", "part = label[1:4]"], ["label", "part"]),
          ex("Last characters", ["label = 'PLANET'", "part = label[-2:]"], ["label", "part"]),
        ),
      },
      {
        title: "A method returns new text",
        text: "Strings are immutable. Methods such as strip and upper return a new string; they do not rewrite the original. Assign the result when you want to keep it.",
        examples: pair(
          ex(
            "Keep the result",
            ["name = '  bay  '", "clean = name.strip().upper()"],
            ["name", "clean"],
          ),
          ex("Ignore the result", ["name = '  bay  '", "name.strip().upper()"], ["name"]),
        ),
      },
      {
        title: "Escapes represent characters",
        text: "Inside a string, backslash-n represents a newline character. It counts as one character even though its source spelling uses two. print displays the line break.",
        examples: pair(
          ex(
            "Line break",
            ["text = 'red\\nblue'", "size = len(text)\nprint(text)"],
            ["text", "size"],
          ),
          ex(
            "Literal backslash",
            ["text = r'red\\nblue'", "size = len(text)\nprint(text)"],
            ["text", "size"],
          ),
        ),
      },
      {
        title: "Slices tolerate an early end",
        text: "A slice can end beyond the available text and simply stops at the end. A single index outside the string raises IndexError. Empty and shorter inputs deserve explicit checks.",
        examples: pair(
          ex("Longer input", ["code = 'ABCDEF'", "tail = code[3:20]"], ["code", "tail"]),
          ex("Shorter input", ["code = 'AB'", "tail = code[3:20]"], ["code", "tail"]),
        ),
      },
    ],
    questions: [
      n(
        "How many characters are in 'ORCHARD'[2:5]?",
        3,
        "The slice includes positions 2, 3 and 4: 'CHA', three characters.",
        "Subtract the start boundary from the stop boundary.",
        "answer=len('ORCHARD'[2:5])",
      ),
      c(
        "After name = '  hill  ', what does name.strip() do if its result is ignored?",
        ["Leaves name unchanged", "Changes name to 'hill'", "Deletes name"],
        0,
        "strip returns a new string. Without assignment, name still refers to the original padded text.",
        "Strings cannot be changed in place.",
      ),
      n(
        "How many characters are in the Python string 'a\\nb'?",
        3,
        "There is one a, one newline and one b: three characters.",
        "A newline escape represents one character.",
        "answer=len('a\\nb')",
      ),
      c(
        "What happens when 'AB'[5:20] is evaluated?",
        ["It returns an empty string", "It returns 'AB'", "It raises IndexError"],
        0,
        "The slice starts beyond the available characters, so it returns an empty string. A single index such as [5] would fail.",
        "A slice and a single index handle an out-of-range position differently.",
      ),
      n(
        "How many characters remain after ' DATA '.strip()?",
        4,
        "Removing the leading and trailing spaces leaves DATA, which has four characters.",
        "Count after trimming the outside spaces.",
        "answer=len(' DATA '.strip())",
      ),
      n(
        "How many characters are in 'NOTEBOOK'[-3:]?",
        3,
        "The final three characters are OOK.",
        "A negative start counts back from the end.",
        "answer=len('NOTEBOOK'[-3:])",
      ),
    ],
    cards: [
      nc(
        "How many characters are in 'SPECTRUM'[1:6]?",
        5,
        "Positions 1 through 5 are included; position 6 is excluded.",
        "answer=len('SPECTRUM'[1:6])",
      ),
      tc(
        "What string method removes surrounding whitespace? Give the method name without parentheses.",
        "strip",
        "strip returns a new string with leading and trailing whitespace removed.",
      ),
    ],
  },
  {
    id: "lists-and-tuples",
    title: "Change a collection without surprises",
    moduleId: "python-core",
    summary: "Follow list aliases, shallow copies, append and tuple immutability.",
    sourceId: "py-structures",
    section: "5.1 Lists; 5.3 Tuples and sequences",
    beats: [
      {
        title: "Two names can share one list",
        text: "Assigning b = a makes both names refer to the same list. Appending through either name changes that shared object. Assignment does not automatically copy a collection.",
        examples: pair(
          ex("Shared list", ["a = [2, 5]\nb = a", "b.append(8)"], ["a", "b"]),
          ex("Separate outer list", ["a = [2, 5]\nb = a.copy()", "b.append(8)"], ["a", "b"]),
        ),
      },
      {
        title: "Append changes the list",
        text: "append adds one item in place and returns None. Do not replace a list with the return value of append. Use the list after calling the method.",
        examples: pair(
          ex("Keep the list", ["items = [4, 7]", "result = items.append(9)"], ["items", "result"]),
          ex("Overwrite the name", ["items = [4, 7]", "items = items.append(9)"], ["items"]),
        ),
      },
      {
        title: "A copy can still share inner objects",
        text: "list.copy makes a shallow copy. The outer list is new, but nested mutable objects are still shared. A tuple prevents replacing its own items; it does not freeze a list stored inside it.",
        examples: pair(
          ex("Nested list copy", ["a = [[1], [2]]\nb = a.copy()", "b[0].append(3)"], ["a", "b"]),
          ex(
            "List inside a tuple",
            ["record = ('Bay', [1, 2])", "record[1].append(3)"],
            ["record"],
          ),
        ),
      },
      {
        title: "Slicing chooses positions",
        text: "List slices use the same start-inclusive, stop-exclusive boundaries as strings. Repeating a list with * repeats its contents; it does not multiply each number.",
        examples: pair(
          ex("Slice", ["values = [3, 6, 9, 12]", "result = values[1:3]"], ["values", "result"]),
          ex("Repeat", ["values = [3, 6]", "result = values * 2"], ["values", "result"]),
        ),
      },
    ],
    questions: [
      n(
        "a = [1, 4]; b = a; b.append(7). How many items are now in a?",
        3,
        "Both names refer to the list [1, 4, 7], so a has three items.",
        "Follow the shared object, not just the variable names.",
        "a=[1,4]\nb=a\nb.append(7)\nanswer=len(a)",
      ),
      c(
        "What does list.append return?",
        ["None", "The updated list", "The appended item's index"],
        0,
        "append mutates the list and returns None. The existing list is where the new item is stored.",
        "A mutating method need not return the collection.",
      ),
      c(
        "Does a.copy() also copy every nested list?",
        [
          "No, nested objects remain shared",
          "Yes, it recursively copies everything",
          "Only when the outer list has two items",
        ],
        0,
        "list.copy is shallow: it creates a new outer list while retaining references to nested objects.",
        "Separate the outer container from its contents.",
      ),
      n(
        "What is the sum of [2, 5, 8, 11][1:3]?",
        13,
        "The selected items are 5 and 8; their sum is 13.",
        "Include index 1 and stop before index 3.",
        "answer=sum([2,5,8,11][1:3])",
      ),
      n(
        "a = [3, 9]; b = a.copy(); b.append(12). How many items remain in a?",
        2,
        "The separate outer list b grows, while a stays [3, 9].",
        "This example has no shared nested collection.",
        "a=[3,9]\nb=a.copy()\nb.append(12)\nanswer=len(a)",
      ),
      n(
        "How many items are in [4, 6] * 3?",
        6,
        "The two-item list is repeated three times, producing six items.",
        "List multiplication repeats the sequence.",
        "answer=len([4,6]*3)",
      ),
    ],
    cards: [
      nc(
        "x = [5]; y = x; y.extend([6, 7]). How many items are in x?",
        3,
        "The shared list becomes [5, 6, 7].",
        "x=[5]\ny=x\ny.extend([6,7])\nanswer=len(x)",
      ),
      tc(
        "What immutable Python sequence commonly groups a fixed record?",
        "tuple",
        "A tuple is an immutable sequence, although mutable objects held inside it can still change.",
      ),
    ],
  },
];
