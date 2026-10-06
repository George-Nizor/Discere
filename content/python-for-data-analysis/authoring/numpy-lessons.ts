import {
  type PythonLesson,
  ex,
  pair,
  numeric as n,
  choose as c,
  numberCard as nc,
  termCard as tc,
} from "./definition.js";
export const numpyLessons: PythonLesson[] = [
  {
    id: "arrays-and-shape",
    title: "Give data a shape",
    moduleId: "python-arrays",
    summary: "Build NumPy arrays and track dimensions, shape and element counts.",
    sourceId: "np-quickstart",
    section: "The basics; array creation; shape manipulation",
    beats: [
      {
        title: "A list and an array behave differently",
        text: "A Python list is a general sequence. A NumPy array stores elements using a dtype and supports elementwise arithmetic. Multiplying a list repeats it; multiplying a numeric array scales its values.",
        examples: pair(
          ex("Python list", ["values = [2, 4, 6]", "result = values * 2"], ["values", "result"]),
          ex(
            "NumPy array",
            ["import numpy as np\nvalues = np.array([2, 4, 6])", "result = values * 2"],
            ["values", "result"],
          ),
        ),
      },
      {
        title: "Shape counts each axis",
        text: "The shape of a two-dimensional array gives rows first, then columns. size counts all elements. ndim counts the number of axes, not the number of stored values.",
        examples: pair(
          ex(
            "Two by three",
            [
              "import numpy as np\na = np.arange(6).reshape(2, 3)",
              "shape = a.shape\nsize = a.size",
            ],
            ["a", "shape", "size"],
          ),
          ex(
            "Three by two",
            [
              "import numpy as np\na = np.arange(6).reshape(3, 2)",
              "shape = a.shape\nsize = a.size",
            ],
            ["a", "shape", "size"],
          ),
        ),
      },
      {
        title: "Reshape preserves the element count",
        text: "reshape changes the arrangement without changing how many elements there are. The product of the requested dimensions must equal size. A single -1 lets NumPy infer the remaining dimension.",
        examples: pair(
          ex(
            "Infer columns",
            ["import numpy as np\na = np.arange(12)", "result = a.reshape(3, -1)"],
            ["result"],
          ),
          ex(
            "Infer rows",
            ["import numpy as np\na = np.arange(12)", "result = a.reshape(-1, 2)"],
            ["result"],
          ),
        ),
      },
      {
        title: "A dtype is a storage choice",
        text: "NumPy integer dtypes have fixed widths. That differs from Python's arbitrary-precision int. Choose a dtype suited to the expected range rather than assuming all integers grow automatically.",
        examples: pair(
          ex(
            "16-bit storage",
            [
              "import numpy as np\na = np.array([12, 30], dtype=np.int16)",
              "bytes_per_item = a.itemsize",
            ],
            ["a", "bytes_per_item"],
          ),
          ex(
            "64-bit storage",
            [
              "import numpy as np\na = np.array([12, 30], dtype=np.int64)",
              "bytes_per_item = a.itemsize",
            ],
            ["a", "bytes_per_item"],
          ),
        ),
      },
    ],
    questions: [
      n(
        "What is the sum of np.array([3, 5]) * 2?",
        16,
        "Elementwise multiplication gives [6, 10], whose sum is 16.",
        "Scale each array element before adding.",
        "import numpy as np\nanswer=(np.array([3,5])*2).sum()",
      ),
      n(
        "How many elements are in an array with shape (3, 4)?",
        12,
        "There are 3 rows of 4 values, giving 12 elements.",
        "Multiply the dimension sizes.",
        "import numpy as np\nanswer=np.zeros((3,4)).size",
      ),
      c(
        "Can an array of ten values be reshaped to (3, 4)?",
        [
          "No, the element counts differ",
          "Yes, reshape adds two zeros",
          "Yes, reshape drops two values",
        ],
        0,
        "A (3, 4) shape requires twelve elements. reshape does not add or remove values.",
        "Compare the size with the product of the dimensions.",
      ),
      c(
        "Which integer representation has a fixed width?",
        ["np.int16", "Python's built-in int", "Every Python integer literal"],
        0,
        "np.int16 is a fixed-width NumPy dtype. Python's built-in int can grow.",
        "Distinguish an array dtype from a Python built-in type.",
      ),
      n(
        "np.arange(18).reshape(3, -1) has how many columns?",
        6,
        "Eighteen values divided among three rows gives six columns.",
        "The inferred dimension must preserve all elements.",
        "import numpy as np\nanswer=np.arange(18).reshape(3,-1).shape[1]",
      ),
      n(
        "How many dimensions does np.zeros((2, 3, 4)) have?",
        3,
        "The shape has three axes, so ndim is 3. Its size is 24.",
        "Count the axes, not their product.",
        "import numpy as np\nanswer=np.zeros((2,3,4)).ndim",
      ),
    ],
    cards: [
      nc(
        "How many elements are in np.zeros((2, 5, 3))?",
        30,
        "The size is 2 × 5 × 3 = 30.",
        "import numpy as np\nanswer=np.zeros((2,5,3)).size",
      ),
      tc(
        "Which NumPy array attribute gives its dimensions as a tuple?",
        "shape",
        "shape lists the length of each axis.",
      ),
    ],
  },
  {
    id: "array-calculations",
    title: "Calculate across the right axis",
    moduleId: "python-arrays",
    summary: "Apply elementwise operations, broadcasting and reductions.",
    sourceId: "np-quickstart",
    section: "Basic operations; universal functions; indexing and slicing",
    beats: [
      {
        title: "An operation reaches every element",
        text: "Arithmetic between equal-shaped arrays acts on matching positions. Arithmetic with a scalar broadcasts that scalar across all elements.",
        examples: pair(
          ex(
            "Add a scalar",
            ["import numpy as np\na = np.array([2, 4, 8])", "result = a + 3"],
            ["a", "result"],
          ),
          ex(
            "Multiply positions",
            [
              "import numpy as np\na = np.array([2, 4, 8])\nb = np.array([1, 2, 3])",
              "result = a * b",
            ],
            ["a", "b", "result"],
          ),
        ),
      },
      {
        title: "Reduce rows to column totals",
        text: "For a two-dimensional array, sum(axis=0) combines values down the row axis, leaving one result per column. sum(axis=1) combines columns within each row.",
        examples: pair(
          ex(
            "Down the columns",
            ["import numpy as np\na = np.array([[1, 2, 3], [4, 5, 6]])", "result = a.sum(axis=0)"],
            ["a", "result"],
          ),
          ex(
            "Across each row",
            ["import numpy as np\na = np.array([[1, 2, 3], [4, 5, 6]])", "result = a.sum(axis=1)"],
            ["a", "result"],
          ),
        ),
      },
      {
        title: "Broadcast only compatible shapes",
        text: "A one-dimensional array matching the final dimension can be combined with every row. NumPy compares dimensions from the right; each pair must match or one must be 1.",
        examples: pair(
          ex(
            "Column offsets",
            [
              "import numpy as np\na = np.array([[1, 2], [3, 4]])",
              "result = a + np.array([10, 20])",
            ],
            ["a", "result"],
          ),
          ex(
            "One offset everywhere",
            ["import numpy as np\na = np.array([[1, 2], [3, 4]])", "result = a + 10"],
            ["a", "result"],
          ),
        ),
      },
      {
        title: "A slice may share storage",
        text: "A basic NumPy slice usually views the original storage. Editing the view can change the original array. Use copy when you need an independent array.",
        examples: pair(
          ex(
            "View",
            ["import numpy as np\na = np.array([2, 4, 6])\nb = a[:2]", "b[0] = 99"],
            ["a", "b"],
          ),
          ex(
            "Copy",
            ["import numpy as np\na = np.array([2, 4, 6])\nb = a[:2].copy()", "b[0] = 99"],
            ["a", "b"],
          ),
        ),
      },
    ],
    questions: [
      n(
        "What is the sum of np.array([1, 3, 5]) + 2?",
        15,
        "Adding 2 gives [3, 5, 7], whose sum is 15.",
        "Add the scalar to every element.",
        "import numpy as np\nanswer=(np.array([1,3,5])+2).sum()",
      ),
      n(
        "For [[2, 4], [6, 8]], what is the first value of sum(axis=0)?",
        8,
        "The first column reduces to 2 + 6 = 8.",
        "axis=0 combines rows at each column.",
        "import numpy as np\nanswer=np.array([[2,4],[6,8]]).sum(axis=0)[0]",
      ),
      c(
        "Can shapes (2, 3) and (2,) broadcast together?",
        [
          "No, the trailing dimensions conflict",
          "Yes, because both start with 2",
          "Yes, NumPy silently drops a column",
        ],
        0,
        "The trailing dimensions are 3 and 2. They differ and neither is 1, so broadcasting fails.",
        "Compare dimensions from the right.",
      ),
      c(
        "How do you make an independent array from a basic slice?",
        ["Call copy() on the slice", "Assign the slice to a second name only", "Print the slice"],
        0,
        "copy creates independent storage. Assigning a basic slice alone usually retains shared storage.",
        "Check whether the underlying data is shared.",
      ),
      n(
        "For [[3, 7], [2, 8]], what is the second value of mean(axis=1)?",
        5,
        "The second row has mean (2 + 8) ÷ 2 = 5.",
        "Reduce the columns within the second row.",
        "import numpy as np\nanswer=np.array([[3,7],[2,8]]).mean(axis=1)[1]",
      ),
      n(
        "a = np.array([5, 6, 7]); b = a[:2]; b[1] = 20. What is a[1]?",
        20,
        "b is a view into a, so the write changes a[1] to 20.",
        "A basic slice shares the original data.",
        "import numpy as np\na=np.array([5,6,7])\nb=a[:2]\nb[1]=20\nanswer=a[1]",
      ),
    ],
    cards: [
      nc(
        "For [[2, 3, 4], [5, 6, 7]], what is the first row sum?",
        9,
        "The first row sums to 2 + 3 + 4 = 9.",
        "import numpy as np\nanswer=np.array([[2,3,4],[5,6,7]]).sum(axis=1)[0]",
      ),
      tc(
        "Which axis argument reduces rows to one total per column in a 2D array? Type axis= followed by the number.",
        "axis=0",
        "axis=0 reduces the row axis and leaves one value per column.",
      ),
    ],
  },
  {
    id: "ranges-and-randomness",
    title: "Generate values with clear boundaries",
    moduleId: "python-arrays",
    summary: "Distinguish arange, linspace and reproducible random draws.",
    sourceId: "np-quickstart",
    section: "Array creation; np.random.Generator.integers parameters and seeding",
    beats: [
      {
        title: "arange stops before the boundary",
        text: "arange(start, stop, step) produces a spacing sequence and excludes stop. For integer steps, reason about the last value strictly before that boundary.",
        examples: pair(
          ex("Start at zero", ["import numpy as np", "values = np.arange(5)"], ["values"]),
          ex(
            "Choose start and step",
            ["import numpy as np", "values = np.arange(2, 12, 3)"],
            ["values"],
          ),
        ),
      },
      {
        title: "linspace chooses a count",
        text: "linspace uses the requested number of evenly spaced samples. It includes both endpoints by default. With endpoint=False, the final boundary is excluded and the spacing changes.",
        examples: pair(
          ex(
            "Include the endpoint",
            ["import numpy as np", "values = np.linspace(0, 12, 4)"],
            ["values"],
          ),
          ex(
            "Exclude the endpoint",
            ["import numpy as np", "values = np.linspace(0, 12, 4, endpoint=False)"],
            ["values"],
          ),
        ),
      },
      {
        title: "A random upper bound is usually exclusive",
        text: "Generator.integers(low, high) includes low and excludes high by default. To simulate a six-sided die, use low=1 and high=7. A seed makes this demonstration reproducible in the recorded environment.",
        examples: pair(
          ex(
            "Die outcomes",
            [
              "import numpy as np\nrng = np.random.default_rng(21)",
              "draws = rng.integers(1, 7, size=6)",
            ],
            ["draws"],
          ),
          ex(
            "Different seed",
            [
              "import numpy as np\nrng = np.random.default_rng(22)",
              "draws = rng.integers(1, 7, size=6)",
            ],
            ["draws"],
          ),
        ),
      },
      {
        title: "Repeat a run, not a guarantee",
        text: "Resetting the same generator seed and repeating the same operations reproduces a sequence in the same environment. Repeated draws without resetting advance the generator. Reproducibility does not prove that a sample represents a population.",
        examples: pair(
          ex(
            "Reset the seed",
            [
              "import numpy as np\na = np.random.default_rng(9).integers(0, 10, 4)",
              "b = np.random.default_rng(9).integers(0, 10, 4)\nequal = np.array_equal(a, b)",
            ],
            ["a", "b", "equal"],
          ),
          ex(
            "Advance the generator",
            [
              "import numpy as np\nrng = np.random.default_rng(9)\na = rng.integers(0, 10, 4)",
              "b = rng.integers(0, 10, 4)\nequal = np.array_equal(a, b)",
            ],
            ["a", "b", "equal"],
          ),
        ),
      },
    ],
    questions: [
      n(
        "How many values are in np.arange(3, 15, 3)?",
        4,
        "The values are 3, 6, 9 and 12. The stop 15 is excluded.",
        "List the values before the stop.",
        "import numpy as np\nanswer=len(np.arange(3,15,3))",
      ),
      n(
        "What is the final value of np.linspace(2, 14, 5)?",
        14,
        "linspace includes the endpoint by default, so the final value is 14.",
        "The third argument is the sample count.",
        "import numpy as np\nanswer=np.linspace(2,14,5)[-1]",
      ),
      c(
        "Which call generates integers from 1 through 6 with the default endpoint setting?",
        ["rng.integers(1, 7)", "rng.integers(1, 6)", "rng.integers(0, 6)"],
        0,
        "The lower bound is included and the upper bound excluded, so [1, 7) contains 1 through 6.",
        "Make high one larger than the largest outcome.",
      ),
      c(
        "What does a fixed random seed establish?",
        [
          "Repeatability under the same setup",
          "A sample guaranteed to be representative",
          "A guarantee that no value repeats",
        ],
        0,
        "The seed supports repeatability. Sampling design and uncertainty still determine how a sample can be interpreted.",
        "Separate reproducing a draw from validating a study.",
      ),
      n(
        "How many possible integer outcomes does rng.integers(4, 9) allow?",
        5,
        "The possible values are 4, 5, 6, 7 and 8.",
        "Count integers in the half-open interval.",
        "answer=len(range(4,9))",
      ),
      n(
        "What is the spacing in np.linspace(0, 15, 6)?",
        3,
        "Six points including both ends create five equal gaps: 15 ÷ 5 = 3.",
        "There is one fewer gap than endpoint-inclusive samples.",
        "import numpy as np\na=np.linspace(0,15,6)\nanswer=a[1]-a[0]",
      ),
    ],
    cards: [
      nc(
        "What is the largest value in np.arange(1, 10, 2)?",
        9,
        "The sequence is 1, 3, 5, 7, 9.",
        "import numpy as np\nanswer=np.arange(1,10,2)[-1]",
      ),
      tc(
        "Which NumPy function requests a number of evenly spaced samples rather than a step size?",
        "linspace",
        "linspace selects a sample count and includes both endpoints by default.",
      ),
    ],
  },
];
