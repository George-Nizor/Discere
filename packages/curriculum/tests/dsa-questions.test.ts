import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import {
  type CourseBundle,
  ORDER_ANSWER_IDEA,
  type Question,
  SORT_ANSWER_IDEA,
} from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * Data Structures and Algorithms follows docs/question-writing-guide.md, adapted to a course whose skills are
 * tracing and judgement. Numeric and order questions stay where the trace is the point (a heap after a removal,
 * the order a search visits vertices in, the table a dynamic program fills) and each is recomputed here by
 * running the algorithm. The rest put a described input in front of the learner and ask which structure fits,
 * why an algorithm is slow, what a loop costs at a stated size, or whether a rule such as greedy holds.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/data-structures-and-algorithms/bundle.json", import.meta.url),
    "utf8",
  ),
) as CourseBundle;
const questions = new Map(bundle.questions.map((question) => [question.id, question]));
const kind = (question: Question): "numeric" | "choice" | "typed" | "order" | "sort" =>
  question.responseType === "numeric"
    ? "numeric"
    : question.responseType === "order" || question.responseType === "sort"
      ? question.responseType
      : question.choices
        ? "choice"
        : "typed";
const byName = (name: string): Question => {
  const question = questions.get(`datsa-${name}`);
  if (!question) throw new Error(`No question ${name}`);
  return question;
};

// ---------- the algorithms the questions are about ----------

const range = (n: number) => Array.from({ length: n }, (_, index) => index);

function copiesWhenGrowing(appends: number, next: (capacity: number) => number) {
  let capacity = 1;
  let size = 0;
  let copies = 0;
  const resizes: [number, number][] = [];
  for (let append = 1; append <= appends; append += 1) {
    if (size === capacity) {
      copies += size;
      resizes.push([append, size]);
      capacity = next(capacity);
    }
    size += 1;
  }
  return { copies, resizes };
}

function insertionShifts(items: number[]) {
  const list = [...items];
  let shifts = 0;
  for (let index = 1; index < list.length; index += 1) {
    const key = list[index] as number;
    let hole = index - 1;
    while (hole >= 0 && (list[hole] as number) > key) {
      list[hole + 1] = list[hole] as number;
      hole -= 1;
      shifts += 1;
    }
    list[hole + 1] = key;
  }
  return shifts;
}

function merge(left: number[], right: number[]) {
  const out: number[] = [];
  let comparisons = 0;
  let a = 0;
  let b = 0;
  while (a < left.length && b < right.length) {
    comparisons += 1;
    if ((left[a] as number) <= (right[b] as number)) out.push(left[a++] as number);
    else out.push(right[b++] as number);
  }
  return { merged: [...out, ...left.slice(a), ...right.slice(b)], comparisons };
}

function mergeSortSteps(list: number[], steps: string[] = []): number[] {
  if (list.length <= 1) return list;
  const half = Math.floor(list.length / 2);
  const left = list.slice(0, half);
  const right = list.slice(half);
  steps.push(
    `Split \`[${list.join(", ")}]\` into \`[${left.join(", ")}]\` and \`[${right.join(", ")}]\``,
  );
  const sortedLeft = mergeSortSteps(left, steps);
  const sortedRight = mergeSortSteps(right, steps);
  const { merged } = merge(sortedLeft, sortedRight);
  steps.push(
    `Merge \`[${sortedLeft.join(", ")}]\` and \`[${sortedRight.join(", ")}]\` into \`[${merged.join(", ")}]\``,
  );
  return merged;
}

function lomuto(list: number[]) {
  const out = [...list];
  const pivot = out[out.length - 1] as number;
  let boundary = -1;
  for (let scan = 0; scan < out.length - 1; scan += 1) {
    if ((out[scan] as number) <= pivot) {
      boundary += 1;
      [out[boundary], out[scan]] = [out[scan] as number, out[boundary] as number];
    }
  }
  [out[boundary + 1], out[out.length - 1]] = [
    out[out.length - 1] as number,
    out[boundary + 1] as number,
  ];
  return { list: out, pivotIndex: boundary + 1 };
}

type Tree = { key: number; left?: Tree; right?: Tree };
function insertKey(tree: Tree | undefined, key: number): Tree {
  if (!tree) return { key };
  if (key < tree.key) tree.left = insertKey(tree.left, key);
  else tree.right = insertKey(tree.right, key);
  return tree;
}
const buildTree = (keys: number[]) => keys.reduce<Tree | undefined>(insertKey, undefined) as Tree;
function longestPath(tree: Tree | undefined): number[] {
  if (!tree) return [];
  const left = longestPath(tree.left);
  const right = longestPath(tree.right);
  return [tree.key, ...(left.length >= right.length ? left : right)];
}
function searchPath(tree: Tree | undefined, key: number): number[] {
  const path: number[] = [];
  let node = tree;
  while (node) {
    path.push(node.key);
    node = key < node.key ? node.left : key > node.key ? node.right : undefined;
  }
  return path;
}
const preOrder = (tree: Tree | undefined): number[] =>
  tree ? [tree.key, ...preOrder(tree.left), ...preOrder(tree.right)] : [];
const postOrder = (tree: Tree | undefined): number[] =>
  tree ? [...postOrder(tree.left), ...postOrder(tree.right), tree.key] : [];

function pushHeap(heap: number[], value: number) {
  heap.push(value);
  let index = heap.length - 1;
  let swaps = 0;
  while (index > 0 && (heap[Math.floor((index - 1) / 2)] as number) > (heap[index] as number)) {
    const parent = Math.floor((index - 1) / 2);
    [heap[parent], heap[index]] = [heap[index] as number, heap[parent] as number];
    index = parent;
    swaps += 1;
  }
  return { index, swaps };
}
function popHeap(heap: number[]) {
  const out = [...heap];
  const last = out.pop() as number;
  if (out.length === 0) return out;
  out[0] = last;
  let index = 0;
  for (;;) {
    const left = 2 * index + 1;
    const right = left + 1;
    let smallest = index;
    if (left < out.length && (out[left] as number) < (out[smallest] as number)) smallest = left;
    if (right < out.length && (out[right] as number) < (out[smallest] as number)) smallest = right;
    if (smallest === index) return out;
    [out[index], out[smallest]] = [out[smallest] as number, out[index] as number];
    index = smallest;
  }
}

const graph: Record<string, string[]> = {
  A: ["B", "C"],
  B: ["A", "D", "E"],
  C: ["A", "F"],
  D: ["B"],
  E: ["B", "F"],
  F: ["C", "E"],
};
function bfs(lists: Record<string, string[]>, start: string) {
  const seen = new Set([start]);
  const queue = [start];
  const order: string[] = [];
  while (queue.length) {
    const vertex = queue.shift() as string;
    order.push(vertex);
    for (const next of lists[vertex] ?? [])
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
  }
  return order;
}
function dfs(lists: Record<string, string[]>, start: string, seen: string[] = []): string[] {
  seen.push(start);
  for (const next of lists[start] ?? []) if (!seen.includes(next)) dfs(lists, next, seen);
  return seen;
}
function hops(lists: Record<string, string[]>, from: string, to: string) {
  const distance: Record<string, number> = { [from]: 0 };
  const queue = [from];
  while (queue.length) {
    const vertex = queue.shift() as string;
    for (const next of lists[vertex] ?? [])
      if (!(next in distance)) {
        distance[next] = (distance[vertex] as number) + 1;
        queue.push(next);
      }
  }
  return distance[to] as number;
}

function dijkstra(edges: [string, string, number][], start: string) {
  const adjacent: Record<string, [string, number][]> = {};
  for (const [a, b, cost] of edges) {
    adjacent[a] = [...(adjacent[a] ?? []), [b, cost]];
    adjacent[b] = [...(adjacent[b] ?? []), [a, cost]];
  }
  const distance: Record<string, number> = { [start]: 0 };
  const done: string[] = [];
  while (done.length < Object.keys(adjacent).length) {
    const open = Object.keys(distance)
      .filter((vertex) => !done.includes(vertex))
      .sort((p, q) => (distance[p] as number) - (distance[q] as number));
    const vertex = open[0] as string;
    done.push(vertex);
    for (const [next, cost] of adjacent[vertex] ?? [])
      if (!(next in distance) || (distance[vertex] as number) + cost < (distance[next] as number))
        distance[next] = (distance[vertex] as number) + cost;
  }
  return { distance, done };
}

function fewestCoins(coins: number[], amount: number) {
  const best = [0];
  for (let value = 1; value <= amount; value += 1) {
    let fewest = Number.POSITIVE_INFINITY;
    for (const coin of coins)
      if (coin <= value) fewest = Math.min(fewest, 1 + (best[value - coin] as number));
    best.push(fewest);
  }
  return best;
}
function greedyCoins(coins: number[], amount: number) {
  let left = amount;
  let count = 0;
  for (const coin of [...coins].sort((p, q) => q - p)) {
    count += Math.floor(left / coin);
    left %= coin;
  }
  return count;
}
const greedyAlwaysWorks = (coins: number[]) => {
  const best = fewestCoins(coins, 200);
  return range(200).every((index) => greedyCoins(coins, index + 1) === best[index + 1]);
};
const fibCalls = (n: number): number => {
  let [previous, current] = [1, 1];
  for (let index = 2; index <= n; index += 1)
    [previous, current] = [current, previous + current + 1];
  return n < 2 ? 1 : current;
};

// ---------- each numeric answer is recomputed here ----------

const probe = (slots: number, keys: number[], target: number) => {
  const table: (number | null)[] = Array(slots).fill(null);
  let slotOfTarget = -1;
  for (const key of keys) {
    let slot = key % slots;
    while (table[slot] !== null) slot = (slot + 1) % slots;
    table[slot] = key;
    if (key === target) slotOfTarget = slot;
  }
  return slotOfTarget;
};
const flattenCalls = (value: unknown): number =>
  Array.isArray(value)
    ? 1 +
      value.reduce<number>(
        (total, item) => total + (Array.isArray(item) ? flattenCalls(item) : 0),
        0,
      )
    : 0;
const reverseList = (items: number[]) => [...items].reverse();
const stackPops = (operations: (number | "pop")[]) => {
  const stack: number[] = [];
  const popped: number[] = [];
  for (const operation of operations)
    if (operation === "pop") popped.push(stack.pop() as number);
    else stack.push(operation);
  return popped;
};
const digitSum = (n: number): number => (n < 10 ? n : (n % 10) + digitSum(Math.floor(n / 10)));
const costOf = (edges: [string, string, number][], start: string, end: string) =>
  dijkstra(edges, start).distance[end] as number;

const recompute: Record<string, { value: () => number; uses: number[] }> = {
  "arrays-and-contiguous-memory-sc-remove-at": {
    value: () => {
      const out: (number | null)[] = [3, 6, 9, 12, 15];
      for (let index = 2; index < 4; index += 1) out[index] = out[index + 1] as number;
      out[4] = null;
      return out[3] as number;
    },
    uses: [3, 6, 9, 12, 15, 2],
  },
  "dynamic-arrays-and-amortised-cost-copies-nine": {
    value: () => copiesWhenGrowing(9, (c) => c * 2).copies,
    uses: [9],
  },
  "dynamic-arrays-and-amortised-cost-six-appends": {
    value: () => copiesWhenGrowing(6, (c) => c * 2).copies,
    uses: [6],
  },
  "linked-lists-and-pointers-third-after-reverse": {
    value: () => reverseList([2, 6, 1, 8])[2] as number,
    uses: [2, 6, 1, 8],
  },
  "stacks-and-queues-final-pop": {
    value: () => stackPops([3, 5, "pop", 8, "pop", "pop"]).at(-1) as number,
    uses: [3, 5, 8],
  },
  "stacks-and-queues-sc-stack-trace": {
    value: () => stackPops([6, 2, "pop", 4, "pop", "pop"]).at(-1) as number,
    uses: [6, 2, 4],
  },
  "hash-tables-chain-compares": {
    value: () => [12, 7, 20, 15, 3, 27].filter((key) => key % 5 === 2).indexOf(27) + 1,
    uses: [5, 12, 7, 27],
  },
  "hash-tables-slot-of-24": {
    value: () => probe(7, [10, 17, 3, 24], 24),
    uses: [7, 10, 17, 3, 24],
  },
  "hash-tables-wrap-round": { value: () => probe(7, [12, 19, 5], 5), uses: [7, 12, 19, 5] },
  "recursion-and-the-call-stack-flatten-faded": {
    value: () =>
      flattenCalls([
        [1, 2],
        [3, [4]],
      ]),
    uses: [1, 2, 3, 4],
  },
  "recursion-and-the-call-stack-fib-four-calls": { value: () => fibCalls(4), uses: [4] },
  "recursion-and-the-call-stack-sc-digit-sum": { value: () => digitSum(4821), uses: [4821, 10] },
  "insertion-and-merge-sort-shifts-mixed": {
    value: () => insertionShifts([3, 6, 1, 5, 2, 4]),
    uses: [3, 6, 1, 5, 2, 4],
  },
  "insertion-and-merge-sort-merge-four-nine": {
    value: () => merge([4, 9], [1, 5, 7]).comparisons,
    uses: [4, 9, 1, 5, 7],
  },
  "insertion-and-merge-sort-merge-sort-comparisons": {
    value: () =>
      merge([5], [2]).comparisons + merge([4], [7]).comparisons + merge([2, 5], [4, 7]).comparisons,
    uses: [5, 2, 4, 7],
  },
  "quicksort-and-partition-worked-last-index": {
    value: () => lomuto([4, 7, 1, 6, 3, 5]).list[5] as number,
    uses: [4, 7, 1, 6, 3, 5],
  },
  "quicksort-and-partition-faded-pivot-index": {
    value: () => lomuto([6, 2, 9, 4, 1, 3]).pivotIndex,
    uses: [6, 2, 9, 4, 1, 3],
  },
  "binary-search-trees-preorder-fifth": {
    value: () => preOrder(buildTree([50, 20, 80, 10, 40, 70, 90, 30]))[6] as number,
    uses: [50, 20, 80, 10, 40, 70, 90, 30, 7],
  },
  "binary-search-trees-postorder-fourth": {
    value: () => postOrder(buildTree([4, 2, 6, 1, 3, 5, 7]))[3] as number,
    uses: [4, 2, 6, 1, 3, 5, 7],
  },
  "heaps-and-priority-queues-insert-one": {
    value: () => pushHeap([2, 5, 3, 9, 6], 1).index,
    uses: [2, 5, 3, 9, 6, 1],
  },
  "heaps-and-priority-queues-remove-from-five": {
    value: () => popHeap([2, 5, 3, 9, 6])[0] as number,
    uses: [2, 5, 3, 9, 6],
  },
  "heaps-and-priority-queues-remove-from-seven": {
    value: () => popHeap([1, 3, 2, 7, 4, 5, 6])[2] as number,
    uses: [1, 3, 2, 7, 4, 5, 6, 2],
  },
  "graphs-and-traversal-dfs-small": {
    value: () => dfs({ P: ["Q", "R"], Q: ["P", "S"], R: ["P"], S: ["Q"] }, "P").indexOf("R") + 1,
    uses: [],
  },
  "graphs-and-traversal-sc-dfs-position": {
    value: () =>
      dfs({ G: ["H", "I"], H: ["G", "J"], I: ["G", "J"], J: ["H", "I"] }, "G").indexOf("I") + 1,
    uses: [],
  },
  "weighted-shortest-paths-dijkstra-p-s": {
    value: () =>
      costOf(
        [
          ["P", "Q", 2],
          ["P", "R", 5],
          ["Q", "R", 1],
          ["Q", "S", 7],
          ["R", "S", 2],
        ],
        "P",
        "S",
      ),
    uses: [2, 5, 1, 7, 2],
  },
  "weighted-shortest-paths-dijkstra-w-z": {
    value: () =>
      costOf(
        [
          ["W", "X", 3],
          ["W", "Y", 1],
          ["Y", "X", 1],
          ["X", "Z", 4],
          ["Y", "Z", 9],
        ],
        "W",
        "Z",
      ),
    uses: [3, 1, 1, 4, 9],
  },
  "weighted-shortest-paths-sc-dijkstra-mp": {
    value: () =>
      costOf(
        [
          ["M", "N", 3],
          ["M", "O", 8],
          ["N", "O", 2],
          ["N", "P", 6],
          ["O", "P", 3],
        ],
        "M",
        "P",
      ),
    uses: [3, 8, 2, 6, 3],
  },
  "dynamic-programming-coins-five": {
    value: () => fewestCoins([1, 3, 4], 5)[5] as number,
    uses: [1, 3, 4, 5],
  },
  "dynamic-programming-coins-six": {
    value: () => fewestCoins([1, 3, 4], 6)[6] as number,
    uses: [1, 3, 4, 6],
  },
  "dynamic-programming-coins-ten": {
    value: () => fewestCoins([1, 3, 4], 10)[10] as number,
    uses: [1, 3, 4, 10],
  },
};
const mentions = (prompt: string, value: number) => {
  const text = prompt.replace(/,/gu, "");
  return new RegExp(
    `(^|[^\\d.])${String(value).replace(".", "\\.")}([^\\d]|\\.\\D|\\.$|$)`,
    "u",
  ).test(text);
};
const itemText = (question: Question) =>
  (question.order?.items ?? []).map((item) => item.replace(/^(Vertex|Key) /u, ""));

describe("questions in Data Structures and Algorithms", () => {
  it("asks every question from a lesson, and every lesson question exists", () => {
    const asked = new Set(
      bundle.lessons.flatMap((lesson) => [
        lesson.intro?.hook.questionId ?? "",
        ...lesson.questionIds,
        ...lesson.steps.flatMap((step) => [
          step.checkQuestionId,
          ...(step.workedSteps ?? []).flatMap((line) => [
            line.blank?.questionId ?? "",
            line.selfExplain?.questionId ?? "",
          ]),
        ]),
      ]),
    );
    asked.delete("");
    expect([...asked].filter((id) => !questions.has(id))).toEqual([]);
    expect(bundle.questions.filter((question) => !asked.has(question.id)).map((q) => q.id)).toEqual(
      [],
    );
    expect(new Set(bundle.questions.map((question) => question.id)).size).toBe(
      bundle.questions.length,
    );
    const cards = new Set(bundle.lessons.flatMap((lesson) => lesson.flashcardIds));
    expect(bundle.flashcards.filter((card) => !cards.has(card.id)).map((card) => card.id)).toEqual(
      [],
    );
    expect([...cards].filter((id) => !bundle.flashcards.some((card) => card.id === id))).toEqual(
      [],
    );
  });

  it("ends each lesson with three questions of at least two types and at most one numeric", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
      expect(types.filter((type) => type === "numeric").length, lesson.id).toBeLessThanOrEqual(1);
    }
  });

  it("keeps numeric questions to traces and recomputes every answer by running the algorithm", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(30);
    expect(numeric.map((question) => question.id.replace(/^datsa-/u, "")).sort()).toEqual(
      Object.keys(recompute).sort(),
    );
    for (const question of numeric) {
      expect(question.hints.length, question.id).toBe(3);
      const authority = question.answerAuthority;
      if (authority.kind !== "numeric") throw new Error(`${question.id} is not numeric`);
      const entry = recompute[question.id.replace(/^datsa-/u, "")];
      if (!entry) throw new Error(question.id);
      expect(entry.value(), question.id).toBe(authority.value);
      for (const number of entry.uses)
        expect(mentions(question.prompt, number), `${question.id} mentions ${number}`).toBe(true);
      for (const item of question.misconceptions ?? [])
        for (const wrong of item.match.numeric ?? [])
          expect(Math.abs(wrong - authority.value), question.id).toBeGreaterThan(
            authority.absoluteTolerance,
          );
    }
  });

  it("checks the order and sort questions by running the algorithm", () => {
    expect(itemText(byName("graphs-and-traversal-bfs-order-from-e"))).toEqual(bfs(graph, "E"));
    expect(itemText(byName("graphs-and-traversal-dfs-order-from-c"))).toEqual(dfs(graph, "C"));
    expect(hops(graph, "D", "F")).toBe(3);
    expect(bfs(graph, "D")).toEqual(["D", "B", "A", "E", "C", "F"]);
    expect(dfs(graph, "D")).toEqual(["D", "B", "A", "C", "F", "E"]);

    const edges: [string, string, number][] = [
      ["S", "A", 4],
      ["S", "B", 1],
      ["B", "A", 2],
      ["A", "C", 1],
      ["B", "C", 5],
      ["C", "D", 3],
      ["B", "D", 5],
    ];
    expect(itemText(byName("weighted-shortest-paths-finalise-order"))).toEqual(
      dijkstra(edges, "S").done,
    );
    expect(dijkstra(edges, "S").distance).toMatchObject({ S: 0, B: 1, A: 3, C: 4, D: 6 });
    // The routes of the route question: only the three-edge route is the cheapest.
    const routes = { "S-T": 10, "S-A-T": 3 + 8, "S-A-B-T": 3 + 2 + 4 };
    expect(
      dijkstra(
        [
          ["S", "T", 10],
          ["S", "A", 3],
          ["A", "T", 8],
          ["A", "B", 2],
          ["B", "T", 4],
        ],
        "S",
      ).distance["T"],
    ).toBe(Math.min(...Object.values(routes)));
    expect(routes["S-A-B-T"]).toBe(9);
    // Dijkstra settles A at 5 before B can offer 6 - 3, so with a negative edge it reports 5 and the truth is 3.
    expect(Math.min(5, 6 + -3)).toBe(3);
    const finalAtFirstSight = Math.min(5, 6);
    expect(finalAtFirstSight).toBe(5);
    expect(
      costOf(
        [
          ["M", "N", 3],
          ["M", "O", 8],
          ["N", "O", 2],
          ["N", "P", 6],
          ["O", "P", 3],
        ],
        "M",
        "P",
      ),
    ).toBe(3 + 2 + 3);
    expect(3 + 6).toBe(9);

    const steps: string[] = [];
    expect(mergeSortSteps([6, 3, 8, 1], steps)).toEqual([1, 3, 6, 8]);
    expect(byName("insertion-and-merge-sort-sc-merge-order").order?.items).toEqual(steps);

    const heap = [1, 3, 2, 7, 8, 9, 6];
    const placed = pushHeap(heap, 5);
    expect(placed).toEqual({ index: 3, swaps: 1 });
    expect(heap).toEqual([1, 3, 2, 5, 8, 9, 6, 7]);
    expect(byName("heaps-and-priority-queues-sc-sift-order").order?.items.at(-1)).toBe(
      "Read off the heap `[1, 3, 2, 5, 8, 9, 6, 7]`",
    );
    expect(popHeap([2, 4, 3, 8, 6, 5])).toEqual([3, 4, 5, 8, 6]);
    const removal = byName("heaps-and-priority-queues-sc-remove-min-mc");
    expect(removal.choices?.map((choice) => choice.label)).toContain("`[3, 4, 5, 8, 6]`");
    expect(pushHeap([2, 5, 3, 9, 6], 4)).toEqual({ index: 5, swaps: 0 });

    // The four lines of the reversal pass: only the stated order reverses a list, and the order is unique.
    const lines = ["nxt = cur.next", "cur.next = prev", "prev = cur", "cur = nxt"];
    const permutations = (items: string[]): string[][] =>
      items.length <= 1
        ? [items]
        : items.flatMap((item, index) =>
            permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [
              item,
              ...rest,
            ]),
          );
    const reverses = (order: string[]) => {
      type Node = { value: number; next: Node | null };
      const nodes: Node[] = [5, 1, 8].map((value) => ({ value, next: null }));
      nodes.forEach((node, index) => {
        node.next = nodes[index + 1] ?? null;
      });
      let prev: Node | null = null;
      let cur: Node | null = nodes[0] ?? null;
      let nxt: Node | null = null;
      for (let pass = 0; cur && pass < 10; pass += 1) {
        for (const line of order) {
          if (!cur && line !== "cur = nxt") break;
          if (line === "nxt = cur.next") nxt = cur?.next ?? null;
          if (line === "cur.next = prev" && cur) cur.next = prev;
          if (line === "prev = cur") prev = cur;
          if (line === "cur = nxt") cur = nxt;
        }
      }
      const out: number[] = [];
      for (let node = prev, guard = 0; node && guard < 10; node = node.next, guard += 1)
        out.push(node.value);
      return out.join() === "8,1,5";
    };
    expect(permutations(lines).filter(reverses)).toEqual([lines]);
    expect(byName("linked-lists-and-pointers-sc-reversal-lines").order?.items).toEqual(
      lines.map((line) => `\`${line}\``),
    );

    // fact(2): the calls pile up and then return in the opposite order.
    const events: string[] = [];
    const fact = (n: number): number => {
      if (n === 0) {
        return 1;
      }
      events.push(`\`fact(${n})\` calls \`fact(${n - 1})\``);
      const result = n * fact(n - 1);
      events.push(
        n === 2 ? "`fact(2)` returns 2" : `\`fact(${n})\` returns ${result} to \`fact(${n + 1})\``,
      );
      return result;
    };
    expect(fact(2)).toBe(2);
    expect(events).toEqual([
      "`fact(2)` calls `fact(1)`",
      "`fact(1)` calls `fact(0)`",
      "`fact(1)` returns 1 to `fact(2)`",
      "`fact(2)` returns 2",
    ]);
    const unwind = byName("recursion-and-the-call-stack-sc-unwind-order").order?.items;
    expect(unwind?.filter((item) => events.includes(item))).toEqual(events);
    expect(unwind).toHaveLength(5);

    // Greedy coin sets: the sort question's groups are the ones the table computes.
    const coinSort = byName("dynamic-programming-sc-sort-greedy").sort;
    expect(coinSort?.items).toHaveLength(6);
    for (const item of coinSort?.items ?? []) {
      const coins = (item.label.match(/\d+/gu) ?? []).map(Number);
      expect(greedyAlwaysWorks(coins), item.label).toBe(item.bin === "works");
    }
  });

  it("checks the figures that choices, prompts and feedback quote", () => {
    // Dynamic arrays: the next resize, fixed growth, tripling and a million appends.
    expect(copiesWhenGrowing(9, (c) => c * 2).resizes).toEqual([
      [2, 1],
      [3, 2],
      [5, 4],
      [9, 8],
    ]);
    expect(copiesWhenGrowing(17, (c) => c * 2)).toMatchObject({ copies: 31 });
    expect(copiesWhenGrowing(17, (c) => c * 2).resizes.at(-1)).toEqual([17, 16]);
    expect(copiesWhenGrowing(25, (c) => c + 10)).toEqual({
      copies: 33,
      resizes: [
        [2, 1],
        [12, 11],
        [22, 21],
      ],
    });
    expect(copiesWhenGrowing(1_000_000, (c) => c * 3).copies).toBeLessThan(1.5 * 1_000_000);
    expect(copiesWhenGrowing(100_000, (c) => c + 10).copies).toBeGreaterThan(100_000 ** 2 / 25);
    expect(copiesWhenGrowing(1_000_000, (c) => c + c / 2).copies).toBeLessThan(3 * 1_000_000);
    // Arrays: addresses and the unsafe order of moves.
    expect(1000 + 12 * 8).toBe(1096);
    expect(2000 + 9 * 4).toBe(2036);
    const forward = [4, 8, 15, 16, 23, 42, 0];
    for (let index = 2; index <= 6; index += 1) forward[index] = forward[index - 1] as number;
    expect(forward).toEqual([4, 8, 8, 8, 8, 8, 8]);
    const backward = [4, 8, 15, 16, 23, 42, 0];
    for (let index = 6; index >= 2; index -= 1) backward[index] = backward[index - 1] as number;
    backward[1] = 99;
    expect(backward).toEqual([4, 99, 8, 15, 16, 23, 42]);
    // Loops: the staircase and the share of a single loop.
    expect(range(1000).reduce((total, index) => total + index, 0)).toBe(499_500);
    expect(range(100).reduce((total, index) => total + (100 - index), 0)).toBe(5050);
    expect(range(100).reduce((total, index) => total + index, 0)).toBe(4950);
    expect(1000 / (1000 * 1000 + 1000)).toBeCloseTo(0.001, 4);
    // Recursion: Python's limit, the digits of 2000!, and growth in the number of fib calls.
    let digits = 0;
    for (let n = 2; n <= 2000; n += 1) digits += Math.log10(n);
    expect(Math.floor(digits) + 1).toBe(5736);
    expect([fibCalls(30), fibCalls(31)]).toEqual([2_692_537, 4_356_617]);
    expect(fibCalls(31) / fibCalls(30)).toBeCloseTo(1.618, 2);
    const halve = (n: number, depth = 0): number =>
      n === 1 ? depth : depth > 100 ? -1 : halve(Math.floor(n / 2), depth + 1);
    expect([halve(8), halve(0)]).toEqual([3, -1]);
    // Sorting.
    expect(insertionShifts(range(1000).reverse())).toBe(499_500);
    expect(insertionShifts(range(1000))).toBe(0);
    expect(merge([1, 2, 3], [4, 5, 6]).comparisons).toBe(3);
    expect(merge([2, 6, 7], [1, 3, 9]).merged[3]).toBe(6);
    const nLogN = (n: number) => n * Math.log2(n);
    expect(nLogN(1_000_000) / nLogN(1000)).toBeCloseTo(2000, -1);
    expect(nLogN(2_000_000) / nLogN(1_000_000)).toBeGreaterThan(2);
    expect(nLogN(2_000_000) / nLogN(1_000_000)).toBeLessThan(2.11);
    expect(lomuto([5, 9, 2, 7, 1, 8, 3, 6]).pivotIndex).toBe(4);
    expect(lomuto([2, 8, 7, 1, 3, 5, 6, 4])).toEqual({
      list: [2, 1, 3, 4, 7, 5, 6, 8],
      pivotIndex: 3,
    });
    expect((100_000 * 99_999) / 2).toBe(4_999_950_000);
    expect(nLogN(100_000)).toBeLessThan(1_700_000);
    let logFactorial = 0;
    for (let n = 2; n <= 1000; n += 1) logFactorial += Math.log2(n);
    expect(Math.ceil(logFactorial)).toBe(8530);
    // Trees: paths, the chain and the balanced height.
    expect(longestPath(buildTree([4, 9, 2, 1, 3, 7, 8, 6, 5]))).toEqual([4, 9, 7, 6, 5]);
    expect(searchPath(buildTree([20, 10, 30, 5, 15, 25, 35, 12, 13]), 13)).toEqual([
      20, 10, 15, 12, 13,
    ]);
    expect(searchPath(buildTree([1, 2, 3, 4, 5]), 5)).toEqual([1, 2, 3, 4, 5]);
    expect(Math.ceil(Math.log2(1_000_001))).toBe(20);
    expect(Math.floor(Math.log2(1_000_000))).toBe(19);
    // Hash tables and graphs.
    expect([12, 7, 20, 15, 3, 27].filter((key) => key % 5 === 2)).toEqual([12, 7, 27]);
    expect(14 / 2).toBe(7);
    // Coins.
    expect([greedyCoins([1, 3, 4], 6), fewestCoins([1, 3, 4], 6)[6]]).toEqual([3, 2]);
    expect([greedyCoins([1, 4, 5], 8), fewestCoins([1, 4, 5], 8)[8]]).toEqual([4, 2]);
    expect(
      fewestCoins([2, 5], 20).flatMap((count, amount) =>
        count === Number.POSITIVE_INFINITY ? [amount] : [],
      ),
    ).toEqual([1, 3]);
    const calls = (n: number, memo = new Set<number>()): number => {
      if (memo.has(n)) return 1;
      memo.add(n);
      return 1 + (n < 2 ? 0 : calls(n - 1, memo) + calls(n - 2, memo));
    };
    expect([calls(7), calls(50)]).toEqual([13, 99]);
    expect([fibCalls(8), new Set(range(9)).size]).toEqual([67, 9]);
  });

  it("puts a described input in front of the learner in most questions", () => {
    const situation =
      /\b(you|your|array|list|lists|tree|trees|graph|heap|stack|queue|table|keys?|items?|loop|loops|function|program|programmer|service|server|teammate|colleague|cashier|till|job|jobs|coins?|string|nodes?|vertex|vertices|app|network|sort|search|expression|partition|pivot|bucket|buckets|dict|script|library|user|users|insertion|merge|quicksort|fib|depth-first|breadth-first|dijkstra|dijkstra's|unit|memoisation|recursive|flatten|call|calls|array|map|coin|amortised|resize|append|appends|capacity)\b/iu;
    expect(
      bundle.questions.filter((question) => situation.test(question.prompt)).length,
    ).toBeGreaterThanOrEqual(bundle.questions.length * 0.9);
    const judgement = bundle.questions.filter(
      (question) => kind(question) === "choice" || kind(question) === "sort",
    );
    expect(judgement.length).toBeGreaterThanOrEqual(bundle.questions.length * 0.6);
  });

  it("keeps dashes out of questions, hints and feedback, and verdict words out of feedback", () => {
    for (const question of bundle.questions) {
      const text = [
        question.prompt,
        ...question.hints,
        question.onCorrect ?? "",
        ...(question.misconceptions ?? []).map((item) => item.feedback),
        ...(question.choices ?? []).map((choice) => choice.label),
        ...(question.order?.items ?? []),
        ...(question.sort?.bins ?? []).map((bin) => bin.label),
        ...(question.sort?.items ?? []).flatMap((item) => [item.label, item.explanation ?? ""]),
        question.answerAuthority.kind === "text" ? question.answerAuthority.exampleAnswer : "",
      ].join(" ");
      // The edge costs in the graph questions use an en dash between vertex names, as the lesson text does.
      const withoutEdges = text.replace(/(?<=[A-Z])–(?=[A-Z])/gu, "");
      expect(withoutEdges, question.id).not.toMatch(/[—–]/u);
      expect(text, question.id).not.toMatch(/\b(Correct|Not quite|Great job|Well done)\b/u);
    }
    for (const card of bundle.flashcards)
      expect(`${card.front} ${card.back}`, card.id).not.toMatch(/[—–]/u);
  });

  it("marks one option right, keeps options alike in length and form, and explains each wrong one", () => {
    const places = new Set<number>();
    let threeOrMore = 0;
    let rightLongest = 0;
    let rightShortest = 0;
    for (const question of bundle.questions) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const authority = question.answerAuthority;
      const right = question.choices.filter(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
      expect(right, question.id).toHaveLength(1);
      const others = question.choices.filter((choice) => choice !== right[0]);
      const longestOther = Math.max(...others.map((choice) => choice.label.length));
      const shortestOther = Math.min(...others.map((choice) => choice.label.length));
      const rightLength = right[0]?.label.length ?? 0;
      if (question.choices.length >= 3) {
        threeOrMore += 1;
        if (rightLength > longestOther) rightLongest += 1;
        if (rightLength < shortestOther) rightShortest += 1;
        expect(rightLength, question.id).toBeLessThanOrEqual(longestOther * 1.15);
      }
      const stops = new Set(question.choices.map((choice) => /[.!?]$/u.test(choice.label)));
      expect(stops.size, `${question.id} mixes final stops`).toBe(1);
      const explained = new Set(
        (question.misconceptions ?? []).flatMap((item) => item.match.choiceIds ?? []),
      );
      for (const choice of others)
        expect(explained.has(choice.id), `${question.id} ${choice.id}`).toBe(true);
      for (const item of question.misconceptions ?? [])
        expect(item.feedback.trim().length, question.id).toBeGreaterThan(20);
      places.add(question.choices.indexOf(right[0] as (typeof question.choices)[number]));
    }
    expect(rightLongest / threeOrMore).toBeLessThanOrEqual(0.3);
    expect(rightShortest / threeOrMore).toBeLessThanOrEqual(0.4);
    expect([...places].sort()).toEqual([0, 1, 2, 3]);
  });

  it("keeps most questions multiple choice or short text, with some order and sort", () => {
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(4);
    expect(counts.sort).toBeGreaterThanOrEqual(4);
    expect(counts.order + counts.sort).toBeGreaterThanOrEqual(8);
    expect(counts.order + counts.sort).toBeLessThanOrEqual(12);
    expect(counts.choice + counts.typed).toBeGreaterThanOrEqual(bundle.questions.length * 0.6);
    expect(counts.numeric).toBeLessThanOrEqual(30);
  });

  it("writes an order question as distinct items and a sort question with every bin used", () => {
    for (const question of bundle.questions) {
      if (question.answerAuthority.kind !== "text") continue;
      const { order, sort } = question;
      if (order) {
        expect(new Set(order.items).size, question.id).toBe(order.items.length);
        expect(order.items.length, question.id).toBeGreaterThanOrEqual(4);
        expect(order.items.length, question.id).toBeLessThanOrEqual(6);
        expect(question.answerAuthority.acceptedIdeas, question.id).toEqual([ORDER_ANSWER_IDEA]);
        expect(
          order.items.filter((item) => /^\d/u.test(item)),
          question.id,
        ).toEqual([]);
      }
      if (sort) {
        expect(new Set(sort.items.map((item) => item.label)).size, question.id).toBe(
          sort.items.length,
        );
        expect(sort.items.length, question.id).toBeGreaterThanOrEqual(5);
        for (const bin of sort.bins)
          expect(
            sort.items.some((item) => item.bin === bin.id),
            `${question.id} ${bin.id}`,
          ).toBe(true);
        for (const item of sort.items) expect(item.explanation, question.id).toBeTruthy();
        expect(question.answerAuthority.acceptedIdeas, question.id).toEqual([SORT_ANSWER_IDEA]);
      }
      if (order || sort) {
        expect(question.answerAuthority.exampleAnswer.length, question.id).toBeGreaterThan(40);
        expect(question.onCorrect, question.id).toBeTruthy();
      }
    }
  });

  it("covers the judgements an algorithm gets wrong", () => {
    const text = bundle.questions.map((question) =>
      [
        question.prompt,
        ...(question.choices ?? []).map((choice) => choice.label),
        ...(question.sort?.items ?? []).map((item) => item.label),
        ...(question.sort?.bins ?? []).map((bin) => bin.label),
        ...(question.order?.items ?? []),
        ...(question.misconceptions ?? []).map((item) => item.feedback),
        question.onCorrect ?? "",
      ].join(" "),
    );
    for (const phrase of [
      /`in` on a list|scans/iu,
      /`pop\(0\)`|`del lst\[0\]`/u,
      /worst case/iu,
      /chain/iu,
      /RecursionError/u,
      /base case/iu,
      /greedy/iu,
      /counterexample|4 and 4 would|3 and 3 use|5 and 5 use/iu,
      /adjacency lists/iu,
      /hash table/iu,
      /balanced search tree|self-balancing|balanced tree/iu,
      /heap/iu,
      /amortised/iu,
      /sorted order|already sorted|sorted input/iu,
      /negative/iu,
      /lower bound/iu,
    ])
      expect(
        text.some((entry) => phrase.test(entry)),
        String(phrase),
      ).toBe(true);
  });

  it("does not mark a typed answer right when it only repeats the prompt", () => {
    for (const question of bundle.questions) {
      if (question.choices || question.answerAuthority.kind !== "text") continue;
      if (question.order || question.sort) continue;
      expect(assessTextAnswer(question.prompt, question.answerAuthority).correct, question.id).toBe(
        false,
      );
      expect(
        assessTextAnswer(question.answerAuthority.exampleAnswer, question.answerAuthority).correct,
        question.id,
      ).toBe(true);
    }
    const worst = byName("quicksort-and-partition-sc-name-the-case");
    if (worst.answerAuthority.kind !== "text") throw new Error("not text");
    for (const answer of ["worst case", "the worst case", "Worst-case"])
      expect(assessTextAnswer(answer, worst.answerAuthority).correct, answer).toBe(true);
    for (const answer of ["best case", "average case", "a sorted list", "n squared"])
      expect(assessTextAnswer(answer, worst.answerAuthority).correct, answer).toBe(false);
  });

  it("gives hints that guide, with no first letters and no bare sums", () => {
    for (const question of bundle.questions) {
      for (const hint of question.hints) {
        expect(hint, question.id).not.toMatch(
          /begins with|starts with|first letter|letter [a-z]\b/iu,
        );
        expect(hint, question.id).not.toMatch(/^[\d\s,.+−×÷*/=-]+\.?$/u);
        expect(hint, question.id).not.toMatch(/^Work out [\d\s×÷+−-]+\.?$/u);
      }
      if (kind(question) !== "numeric")
        expect(question.hints.length, question.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps a review card for each lesson that asks for a name, a number or a choice, or is self-rated", () => {
    for (const card of bundle.flashcards)
      expect(Boolean(card.answerAuthority) || card.recall === "self", card.id).toBe(true);
    for (const card of bundle.flashcards) {
      if (card.answerAuthority?.kind !== "text") continue;
      expect(assessTextAnswer(card.front, card.answerAuthority).correct, card.id).toBe(false);
    }
    // The cards that drilled replaced arithmetic are gone.
    for (const lesson of bundle.lessons)
      expect(
        bundle.flashcards.filter((card) => lesson.flashcardIds.includes(card.id)).length,
        lesson.id,
      ).toBe(3);
  });
});
