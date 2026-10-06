import { IsolatedPythonRuntime } from "../apps/server/src/python-projects/runtime.js";
const executed = await new IsolatedPythonRuntime().execute(
  "import sys\nimport numpy as np\nimport pandas as pd\nresult = {'python': sys.version.split()[0], 'numpy': np.__version__, 'pandas': pd.__version__}",
  {},
);
if ("error" in executed) {
  console.error(executed.message);
  process.exitCode = 1;
} else console.log(JSON.stringify(executed.result));
