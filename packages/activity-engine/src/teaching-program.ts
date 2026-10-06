export interface ProgramStep {
  line: number;
  x: number;
  event: string;
}
export interface ProgramResult {
  steps: ProgramStep[];
  value: number | null;
  error: string | null;
}
type Node = { line: number; text: string; body: Node[]; otherwise: Node[] };
const NUMBER = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)";
const assignment = new RegExp(`^x\\s*=\\s*(${NUMBER})$`);
const update = new RegExp(`^x\\s*(?:([+*/-])=|=\\s*x\\s*([+*/-]))\\s*(${NUMBER})$`);
const condition = new RegExp(`^(if|while)\\s+x\\s*(>=|<=|==|!=|>|<)\\s*(${NUMBER}):$`);
const loop = /^for i in range\((\d+)\):$/;

/** A bounded teaching language with Python spellings. No eval, host access or arbitrary code. */
export function runTeachingProgram(code: string, limit = 100): ProgramResult {
  const steps: ProgramStep[] = [];
  let x: number | null = null;
  try {
    if (code.length > 2_000 || !Number.isInteger(limit) || limit < 1 || limit > 1_000)
      throw new Error("Keep the program within 2,000 characters and the step limit within 1,000.");
    const lines = code
      .split("\n")
      .map((text, index) => ({
        text: text.trim(),
        indent: text.match(/^ */)?.[0].length ?? 0,
        line: index + 1,
        raw: text,
      }))
      .filter((line) => line.text && !line.text.startsWith("#"));
    if (lines.some((line) => line.raw.includes("\t")))
      throw new Error("Use spaces for indentation.");
    let at = 0;
    function parse(indent: number, depth: number): Node[] {
      if (depth > 6) throw new Error("Keep nesting within six levels.");
      const nodes: Node[] = [];
      while (at < lines.length) {
        const current = lines[at];
        if (!current || current.indent < indent) break;
        if (current.indent > indent)
          throw new Error(`Line ${current.line}: unexpected indentation.`);
        if (current.text === "else:") break;
        const branch = condition.test(current.text);
        const repeat = loop.test(current.text);
        if (!branch && !repeat && !assignment.test(current.text) && !update.test(current.text))
          throw new Error(
            `Line ${current.line}: use x assignments, arithmetic updates, if/else, while or for i in range(n).`,
          );
        const node: Node = { line: current.line, text: current.text, body: [], otherwise: [] };
        at += 1;
        if (branch || repeat) {
          const next = lines[at];
          if (!next || next.indent <= indent)
            throw new Error(`Line ${current.line}: indent the instructions inside this block.`);
          node.body = parse(next.indent, depth + 1);
          if (
            current.text.startsWith("if ") &&
            lines[at]?.text === "else:" &&
            lines[at]?.indent === indent
          ) {
            at += 1;
            const alternative = lines[at];
            if (!alternative || alternative.indent <= indent)
              throw new Error("Indent the instructions after else.");
            node.otherwise = parse(alternative.indent, depth + 1);
          }
        }
        nodes.push(node);
      }
      return nodes;
    }
    const program = parse(0, 0);
    if (at !== lines.length) throw new Error(`Line ${lines[at]?.line}: else needs a matching if.`);
    if (program.length === 0) throw new Error("Write at least one instruction.");
    function record(node: Node, event: string) {
      if (x === null) throw new Error(`Line ${node.line}: assign a starting value to x first.`);
      if (!Number.isFinite(x) || Math.abs(x) > 1e12)
        throw new Error(`Line ${node.line}: the value is too large to trace.`);
      if (steps.length >= limit)
        throw new Error(
          `Stopped after ${limit} steps. Check whether the loop can reach its stopping condition.`,
        );
      steps.push({ line: node.line, x, event });
    }
    function test(node: Node, operator: string, right: number) {
      record(node, "Test");
      return operator === ">"
        ? x! > right
        : operator === "<"
          ? x! < right
          : operator === ">="
            ? x! >= right
            : operator === "<="
              ? x! <= right
              : operator === "=="
                ? x === right
                : x !== right;
    }
    function execute(nodes: Node[]) {
      for (const node of nodes) {
        const set = node.text.match(assignment);
        const change = node.text.match(update);
        const branch = node.text.match(condition);
        const repeat = node.text.match(loop);
        if (set) {
          x = Number(set[1]);
          record(node, "Set x");
        } else if (change) {
          if (x === null) throw new Error(`Line ${node.line}: assign x first.`);
          const operand = Number(change[3]);
          const operator = change[1] ?? change[2];
          if (operator === "/" && operand === 0)
            throw new Error(`Line ${node.line}: division by zero.`);
          x =
            operator === "+"
              ? x + operand
              : operator === "-"
                ? x - operand
                : operator === "*"
                  ? x * operand
                  : x / operand;
          record(node, "Update x");
        } else if (branch) {
          if (branch[1] === "if")
            execute(test(node, branch[2]!, Number(branch[3])) ? node.body : node.otherwise);
          else while (test(node, branch[2]!, Number(branch[3]))) execute(node.body);
        } else if (repeat) {
          const count = Number(repeat[1]);
          if (count > limit)
            throw new Error(`Line ${node.line}: this loop exceeds the step limit.`);
          for (let iteration = 0; iteration < count; iteration += 1) {
            record(node, `Iteration ${iteration + 1}`);
            execute(node.body);
          }
        }
      }
    }
    execute(program);
    return { steps, value: x, error: null };
  } catch (error) {
    return {
      steps,
      value: null,
      error: error instanceof Error ? error.message : "The program could not run.",
    };
  }
}
