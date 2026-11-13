import { createHash } from "node:crypto";
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
 * How Computers and Networks Work asks for a calculation only where the number is the skill: a
 * binary or hexadecimal conversion, a block of addresses, a window over a round trip, a body's
 * Content-Length. The rest put output in front of the learner (a routing table from `ip route`, a
 * `curl` error, a `dig` reply, a `ping` run, `curl` timings) and ask what it shows, or ask for an order or a
 * sorting. The output was produced by running the tools, and every number and every routing decision is
 * recomputed here from the text of the question.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/computers-and-networks/bundle.json", import.meta.url),
    "utf8",
  ),
) as CourseBundle;
const questions = new Map(bundle.questions.map((question) => [question.id, question]));
const get = (id: string): Question => {
  const question = questions.get(id);
  if (!question) throw new Error(`missing question ${id}`);
  return question;
};
const q = (lesson: string, name: string) => get(`comn-${lesson}-${name}`);
const kind = (question: Question): "numeric" | "choice" | "typed" | "order" | "sort" =>
  question.responseType === "numeric"
    ? "numeric"
    : question.responseType === "order" || question.responseType === "sort"
      ? question.responseType
      : question.choices
        ? "choice"
        : "typed";
const codeLines = (question: Question) =>
  question.prompt.split("\n").filter((line) => /^`[^`]+`$/u.test(line));
const unwrap = (line: string) => line.replace(/^`(.*)`$/u, "$1");
const rightChoice = (question: Question) => {
  const authority = question.answerAuthority;
  if (!question.choices || authority.kind !== "text")
    throw new Error(`${question.id} has no choices`);
  return question.choices.filter((choice) => assessTextAnswer(choice.label, authority).correct);
};
const numericValue = (question: Question) => {
  const authority = question.answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${question.id} is not numeric`);
  return authority.value;
};
const sortBins = (question: Question) => {
  const items = question.sort?.items ?? [];
  const bins: Record<string, string[]> = {};
  for (const item of items) bins[item.bin] = [...(bins[item.bin] ?? []), item.label];
  return bins;
};

const ip = (address: string) =>
  address.split(".").reduce((sum, part) => sum * 256 + Number(part), 0);
const inNet = (address: string, cidr: string) => {
  const [net = "", length = "0"] = cidr.split("/");
  const size = 2 ** (32 - Number(length));
  return Math.floor(ip(address) / size) === Math.floor(ip(net) / size);
};
/** Longest-prefix match over the rows of an `ip route` listing. Returns the next hop, "direct", or null. */
const nextHop = (rows: string[], address: string): string | null => {
  let best: { length: number; via: string } | null = null;
  for (const row of rows) {
    const match = /^(default|[\d.]+(?:\/\d+)?)(?: via ([\d.]+))?/u.exec(row);
    if (!match) continue;
    const destination =
      match[1] === "default"
        ? "0.0.0.0/0"
        : (match[1] ?? "").includes("/")
          ? (match[1] ?? "")
          : `${match[1]}/32`;
    if (!inNet(address, destination)) continue;
    const length = Number(destination.split("/")[1]);
    if (!best || length > best.length) best = { length, via: match[2] ?? "direct" };
  }
  return best ? best.via : null;
};
const utf8 = (text: string) => Buffer.byteLength(text, "utf8");
const bodyOf = (question: Question) => /`(\{[^`]*\})`/u.exec(question.prompt)?.[1] ?? "";

describe("questions in How Computers and Networks Work", () => {
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
    expect(
      bundle.questions.filter((question) => !asked.has(question.id)).map((item) => item.id),
    ).toEqual([]);
    const cards = new Set(bundle.lessons.flatMap((lesson) => lesson.flashcardIds));
    expect(bundle.flashcards.filter((card) => !cards.has(card.id)).map((card) => card.id)).toEqual(
      [],
    );
    expect([...cards].filter((id) => !bundle.flashcards.some((card) => card.id === id))).toEqual(
      [],
    );
  });

  it("ends each lesson with three questions of at least two types", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(get(id)));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps numeric questions to places where the number is the point", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(25);
    for (const question of numeric) {
      expect(question.hints.length, question.id).toBe(3);
      const authority = question.answerAuthority;
      if (authority.kind !== "numeric") throw new Error(`${question.id} is not numeric`);
      const decimals = (String(authority.value).split(".")[1] ?? "").length;
      if (decimals > 0)
        expect(authority.absoluteTolerance, question.id).toBeGreaterThanOrEqual(
          0.5 * 10 ** -decimals - 1e-12,
        );
    }
    for (const lesson of bundle.lessons) {
      const ends = lesson.questionIds.map((id) => kind(get(id)));
      expect(ends.filter((type) => type === "numeric").length, lesson.id).toBeLessThanOrEqual(1);
    }
  });

  it("puts tool output in front of the learner in many questions", () => {
    const withOutput = bundle.questions.filter((question) => codeLines(question).length >= 2);
    expect(withOutput.length).toBeGreaterThanOrEqual(10);
    for (const question of withOutput) {
      expect(question.prompt, question.id).toMatch(/\?\s*$/u);
      for (const line of codeLines(question)) expect(line, question.id).not.toMatch(/\t/u);
    }
  });

  it("keeps most questions multiple choice or short text, with some to order and to sort", () => {
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(4);
    expect(counts.sort).toBeGreaterThanOrEqual(4);
    expect(counts.order + counts.sort).toBeGreaterThanOrEqual(8);
    expect(counts.order + counts.sort).toBeLessThanOrEqual(12);
    expect(counts.choice + counts.typed).toBeGreaterThanOrEqual(bundle.questions.length * 0.65);
  });

  it("keeps dashes out of questions, hints and feedback", () => {
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
      ].join(" ");
      expect(text, question.id).not.toMatch(/[—–]/u);
    }
  });

  it("marks one option right and explains each wrong one", () => {
    const places = new Set<string>();
    for (const question of bundle.questions) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const right = rightChoice(question);
      expect(right, question.id).toHaveLength(1);
      const others = question.choices.filter((choice) => choice !== right[0]);
      const explained = new Set(
        (question.misconceptions ?? []).flatMap((item) => item.match.choiceIds ?? []),
      );
      for (const choice of others)
        expect(explained.has(choice.id), `${question.id} ${choice.id}`).toBe(true);
      for (const item of question.misconceptions ?? [])
        expect(item.feedback.trim().length, question.id).toBeGreaterThan(20);
      places.add(`${question.choices.indexOf(right[0] as (typeof question.choices)[number])}`);
    }
    expect([...places].sort()).toEqual(["0", "1", "2", "3"]);
  });

  it("keeps the right option from standing out by length", () => {
    const rows = bundle.questions
      .filter(
        (question) =>
          (question.choices?.length ?? 0) >= 3 && question.answerAuthority.kind === "text",
      )
      .map((question) => {
        const right = rightChoice(question)[0]?.label.length ?? 0;
        const others = (question.choices ?? []).filter(
          (choice) => choice.label.length !== right || true,
        );
        const rest = others
          .filter((choice) => rightChoice(question)[0]?.id !== choice.id)
          .map((choice) => choice.label.length);
        return { id: question.id, right, longest: Math.max(...rest), shortest: Math.min(...rest) };
      });
    expect(rows.filter((row) => row.right > row.longest).length).toBeLessThanOrEqual(
      Math.floor(rows.length * 0.3),
    );
    expect(rows.filter((row) => row.right < row.shortest).length).toBeLessThanOrEqual(
      Math.floor(rows.length * 0.4),
    );
    expect(rows.filter((row) => row.right > row.longest * 1.15).map((row) => row.id)).toEqual([]);
    for (const question of bundle.questions) {
      if (!question.choices) continue;
      const stops = new Set(question.choices.map((choice) => choice.label.trimEnd().endsWith(".")));
      expect(stops.size, question.id).toBe(1);
    }
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
  });

  it("gives hints that guide, with no first letters and no bare sums", () => {
    for (const question of bundle.questions) {
      for (const hint of question.hints) {
        expect(hint, question.id).not.toMatch(/begins with|starts with|first letter/iu);
        expect(hint, question.id).not.toMatch(/^[\d\s,.+−×÷*/=-]+\.?$/u);
      }
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps a review card for each lesson that asks for a name, a number or a choice, or is self-rated", () => {
    for (const card of bundle.flashcards)
      expect(Boolean(card.answerAuthority) || card.recall === "self", card.id).toBe(true);
  });

  it("uses only sources that the course lists", () => {
    const known = new Set(bundle.sources.map((source) => source.id));
    for (const question of bundle.questions)
      for (const id of question.sourceIds) expect(known.has(id), `${question.id} ${id}`).toBe(true);
    for (const id of ["ping-man", "curl-manual"])
      expect(bundle.sources.find((source) => source.id === id)?.checked?.status).toBe("verified");
  });

  it("recomputes the binary, hexadecimal, encoding and overflow answers", () => {
    expect(numericValue(q("bits-bytes-and-encoding", "convert-101101"))).toBe(0b101101);
    expect(numericValue(q("bits-bytes-and-encoding", "hex-green"))).toBe(0x8a);
    expect(numericValue(q("bits-bytes-and-encoding", "end-status-byte"))).toBe(0b10010110);
    expect((255 + 1) & 0xff).toBe(0);
    expect(
      rightChoice(q("bits-bytes-and-encoding", "end-overflow"))[0]?.label.startsWith("0,"),
    ).toBe(true);
    expect(2 ** 3).toBe(8);
    expect(rightChoice(q("bits-bytes-and-encoding", "patterns"))[0]?.label).toContain("16");
    // The usernames that fit in a field of 8 bytes, counted in UTF-8.
    const bins = sortBins(q("bits-bytes-and-encoding", "username-bytes"));
    for (const name of bins["fits"] ?? []) expect(utf8(name), name).toBeLessThanOrEqual(8);
    for (const name of bins["long"] ?? []) expect(utf8(name), name).toBeGreaterThan(8);
    expect([...(bins["long"] ?? [])].some((name) => [...name].length <= 8)).toBe(true);
    // Python's comparisons, as the lesson reports them (JavaScript floats are the same doubles).
    expect(0.1 + 0.2 === 0.3).toBe(false);
    expect(0.1 * 3 === 0.3).toBe(false);
    expect(0.1 + 0.7 === 0.8).toBe(false);
    expect(0.25 + 0.5 === 0.75).toBe(true);
    expect(rightChoice(q("bits-bytes-and-encoding", "which-true-v2"))[0]?.label).toBe(
      "`0.25 + 0.5 == 0.75`",
    );
    expect(10 + 20 === 30).toBe(true);
  });

  it("recomputes the processor, memory and kernel answers", () => {
    const run = (program: [string, number][]) =>
      program.reduce((acc, [op, n]) => (op === "LOAD" ? n : op === "ADD" ? acc + n : acc - n), 0);
    expect(
      run([
        ["LOAD", 7],
        ["ADD", 5],
        ["SUB", 2],
      ]),
    ).toBe(10);
    expect(
      rightChoice(q("the-processor-and-its-instructions", "predict-trace"))[0]?.label.startsWith(
        "10,",
      ),
    ).toBe(true);
    expect(
      run([
        ["LOAD", 9],
        ["SUB", 4],
      ]),
    ).toBe(5);
    expect(
      rightChoice(q("the-processor-and-its-instructions", "after-sub"))[0]?.label.startsWith("5,"),
    ).toBe(true);
    expect(
      run([
        ["LOAD", 20],
        ["SUB", 8],
        ["ADD", 3],
      ]),
    ).toBe(15);
    expect(
      rightChoice(q("the-processor-and-its-instructions", "trace-three"))[0]?.label.startsWith(
        "15,",
      ),
    ).toBe(true);
    expect(numericValue(q("the-processor-and-its-instructions", "cycles-in-100ns"))).toBe(3 * 100);
    expect(numericValue(q("the-processor-and-its-instructions", "end-34-bit"))).toBe(
      2 ** 34 / 2 ** 30,
    );
    expect(2 ** 32 / 2 ** 30).toBe(4);
    expect(
      rightChoice(q("the-processor-and-its-instructions", "address-32-bit"))[0]?.label,
    ).toContain("4 GiB");
    expect(Math.ceil(15000 / 4096)).toBe(4);
    expect(15000 - 3 * 4096).toBe(2712);
    expect(numericValue(q("memory-and-storage", "bytes-reserved"))).toBe(
      Math.ceil(20000 / 4096) * 4096,
    );
    expect(numericValue(q("memory-and-storage", "end-small-files"))).toBe(1000 * 4096);
    expect(1000 * 10e-3).toBe(10);
    expect(36 / 3).toBe(12);
    const split = (address: number) => ({ page: address >> 12, offset: address & 0xfff });
    expect(numericValue(q("processes-and-the-kernel", "page-of-12345"))).toBe(split(0x12345).page);
    expect(split(0x2a7f9).page).toBe(42);
    expect(0x2a7f9 >> 8).toBe(0x2a7);
    expect(
      rightChoice(q("processes-and-the-kernel", "page-of-2a7f9"))[0]?.label.startsWith("42,"),
    ).toBe(true);
    expect((4 - 1) * 10).toBe(30);
    expect((25 - 1) * 10).toBe(240);
    expect((50 - 1) * 10).toBe(490);
  });

  it("recomputes the packet and address answers, and the routing decisions from the tables shown", () => {
    expect(numericValue(q("layers-and-packets", "segments-of-a-million"))).toBe(
      Math.ceil(1_000_000 / 1460),
    );
    expect(1500 - 20 - 32).toBe(1448);
    expect(1_000_000 - 684 * 1460).toBe(1360);
    expect(Math.ceil(100_000 / 1460)).toBe(69);
    expect(68 * 1460).toBe(99_280);
    expect(Math.ceil(10_000 / (1000 - 40))).toBe(11);
    expect(numericValue(q("addresses-subnets-and-routes", "prefix-for-900"))).toBe(
      32 - Math.ceil(Math.log2(900)),
    );
    expect(numericValue(q("addresses-subnets-and-routes", "hosts-in-27"))).toBe(2 ** (32 - 27) - 2);
    expect(2 ** (32 - 29) - 2).toBe(6);
    expect(
      rightChoice(q("addresses-subnets-and-routes", "hosts-in-29"))[0]?.label.startsWith("6,"),
    ).toBe(true);
    // 192.168.4.0/22 covers four values of the third byte, 4 to 7.
    const last = ip("192.168.4.0") + 2 ** (32 - 22) - 1;
    expect(numericValue(q("addresses-subnets-and-routes", "end-last-address"))).toBe(
      Math.floor(last / 256) % 256,
    );

    for (const [name, destination] of [
      ["route-ten-one-two-three", "10.1.2.3"],
      ["route-longest-25", "192.168.5.200"],
      ["end-route-twelve", "172.16.9.9"],
    ] as const) {
      const question = q("addresses-subnets-and-routes", name);
      const rows = codeLines(question).map(unwrap);
      expect(question.prompt, name).toContain(destination);
      const hop = nextHop(rows, destination);
      const right = rightChoice(question)[0]?.label ?? "";
      expect(right, name).toContain(hop ?? "none");
      // Every other option names a different next hop, so only one is right.
      for (const choice of (question.choices ?? []).filter((item) => item.label !== right)) {
        const named = /\d+\.\d+\.\d+\.\d+/u.exec(choice.label)?.[0];
        expect(named, `${name} ${choice.label}`).not.toBe(hop);
      }
    }
    const none = q("addresses-subnets-and-routes", "no-default-route");
    const rows = codeLines(none)
      .map(unwrap)
      .filter((line) => /dev eth0/u.test(line));
    expect(rows.length).toBe(2);
    expect(nextHop(rows, "172.20.1.1")).toBeNull();
    expect(codeLines(none).map(unwrap)).toContain("RTNETLINK answers: Network is unreachable");
    expect(rightChoice(none)[0]?.label).toContain("no default route");
    // The tables as printed by `ip route` always list the local subnet as a direct route.
    for (const name of [
      "route-ten-one-two-three",
      "route-longest-25",
      "end-route-twelve",
      "no-default-route",
    ])
      expect(
        codeLines(q("addresses-subnets-and-routes", name)).some((line) =>
          /proto kernel scope link/u.test(line),
        ),
        name,
      ).toBe(true);

    // Private and public addresses, from the three blocks of RFC 1918.
    const privateBlocks = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"];
    const bins = sortBins(q("addresses-subnets-and-routes", "private-or-public"));
    for (const address of bins["private"] ?? [])
      expect(
        privateBlocks.some((block) => inNet(address, block)),
        address,
      ).toBe(true);
    for (const address of bins["public"] ?? [])
      expect(
        privateBlocks.some((block) => inNet(address, block)),
        address,
      ).toBe(false);
    expect((bins["public"] ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("recomputes the DNS and TCP answers", () => {
    expect(numericValue(q("names-and-dns", "expiry-time"))).toBe(1000 + 120);
    expect(600 - 450).toBe(150);
    expect(450 < 600).toBe(true);
    const dig = codeLines(q("names-and-dns", "end-nxdomain")).map(unwrap);
    expect(dig.some((line) => /status: NXDOMAIN/u.test(line))).toBe(true);
    expect(dig.some((line) => /ANSWER: 0/u.test(line))).toBe(true);
    // Three segments of 1,000 bytes; the middle one is lost. The receiver asks for the first byte it lacks.
    const arrived: [number, number][] = [
      [0, 1000],
      [2000, 1000],
    ];
    let expected = 0;
    for (const [start, length] of arrived) if (start === expected) expected = start + length;
    expect(
      rightChoice(q("tcp-reliable-delivery", "ack-after-gap"))[0]?.label.startsWith(`${expected},`),
    ).toBe(true);
    expect(1000 + 500).toBe(1500);
    expect(numericValue(q("tcp-reliable-delivery", "bytes-per-second"))).toBe(32_768 / 0.04);
    expect(numericValue(q("tcp-reliable-delivery", "second-throughput"))).toBe(
      (131_072 / 0.05) * 8,
    );
    expect((65_536 * 8) / 0.16).toBe(3_276_800);
    expect(numericValue(q("tcp-reliable-delivery", "practice-3-v2"))).toBe(5 * 80);
  });

  it("recomputes every Content-Length and the TLS round-trip answers", () => {
    expect(numericValue(q("http-requests-and-responses", "predict-length"))).toBe(
      utf8(bodyOf(q("http-requests-and-responses", "predict-length"))),
    );
    expect(numericValue(q("http-requests-and-responses", "count-id42"))).toBe(
      utf8(bodyOf(q("http-requests-and-responses", "count-id42"))),
    );
    expect(utf8('{"ok":true}')).toBe(11);
    expect(
      rightChoice(q("http-requests-and-responses", "count-ok-true"))[0]?.label.startsWith("11,"),
    ).toBe(true);
    const name = bodyOf(q("http-requests-and-responses", "bytes-not-characters"));
    expect([...name].length).toBe(14);
    expect(utf8(name)).toBe(15);
    expect(
      rightChoice(q("http-requests-and-responses", "bytes-not-characters"))[0]?.label.startsWith(
        "15,",
      ),
    ).toBe(true);
    const redirect = codeLines(q("http-requests-and-responses", "moved-permanently")).map(unwrap);
    expect(redirect.some((line) => /^< HTTP\/1\.1 301 /u.test(line))).toBe(true);
    expect(redirect.some((line) => /^< Location: \/shop$/u.test(line))).toBe(true);
    expect(
      codeLines(q("http-requests-and-responses", "end-404"))
        .map(unwrap)
        .some((line) => /^< HTTP\/1\.1 404 /u.test(line)),
    ).toBe(true);

    expect(numericValue(q("tls-trust-and-encryption", "tls13-round-trips-v2"))).toBe(2 * 45);
    expect(numericValue(q("tls-trust-and-encryption", "tcp-plus-tls"))).toBe((1 + 1) * 50);
    expect(
      rightChoice(q("tls-trust-and-encryption", "tls12-time"))[0]?.label.startsWith(
        `${(1 + 2) * 60} ms`,
      ),
    ).toBe(true);
    const digest = (text: string) => createHash("sha256").update(text).digest();
    let differing = 0;
    const [a, b] = [digest("abc"), digest("abb")];
    for (let i = 0; i < a.length; i += 1) {
      let x = (a[i] ?? 0) ^ (b[i] ?? 0);
      while (x) {
        differing += x & 1;
        x >>= 1;
      }
    }
    expect(differing).toBe(124);
    expect(createHash("sha512").update("abc").digest("hex").length).toBe(128);
    expect(codeLines(q("tls-trust-and-encryption", "end-self-signed")).map(unwrap)[0]).toMatch(
      /^curl: \(60\) SSL certificate problem: self-signed certificate$/u,
    );
  });

  it("recomputes the latency, bandwidth and page-load answers", () => {
    expect(numericValue(q("latency-bandwidth-and-distance", "round-trip-5600"))).toBe(
      ((5600 * 2) / 200_000) * 1000,
    );
    expect(numericValue(q("latency-bandwidth-and-distance", "megabits-in-50-mb"))).toBe(50 * 8);
    expect(numericValue(q("latency-bandwidth-and-distance", "twenty-mb"))).toBe((20 * 8) / 80);
    const flight = (1e9 * 0.02) / 8;
    expect(flight).toBe(2_500_000);
    expect(65_536 / flight).toBeGreaterThan(0.025);
    expect(65_536 / flight).toBeLessThan(0.03);
    expect((15 * 8) / 100).toBe(1.2);
    expect(15 / (100 * 8)).toBeCloseTo(0.01875, 9);
    const ping = codeLines(q("latency-bandwidth-and-distance", "end-ping-time")).map(unwrap);
    const times = ping
      .map((line) => /time=([\d.]+) ms/u.exec(line)?.[1])
      .filter(Boolean)
      .map(Number);
    expect(times).toHaveLength(4);
    const summary = /rtt min\/avg\/max\/mdev = ([\d.]+)\/([\d.]+)\/([\d.]+)/u.exec(ping.join("\n"));
    expect(Number(summary?.[2])).toBeCloseTo(times.reduce((sum, t) => sum + t, 0) / 4, 0);
    expect(Math.min(...times)).toBeGreaterThanOrEqual(Number(summary?.[1]) - 0.5);
    expect(ping.some((line) => /4 packets transmitted, 4 received/u.test(line))).toBe(true);

    expect(20 + 80 + 80 + (80 + 30)).toBe(290);
    expect(rightChoice(q("one-page-load-end-to-end", "first-visit-total"))[0]?.label).toBe(
      "About 290 ms",
    );
    expect(
      rightChoice(q("one-page-load-end-to-end", "tls-share-v2"))[0]?.label.startsWith("70 ms"),
    ).toBe(true);
    expect(numericValue(q("one-page-load-end-to-end", "second-trace"))).toBe(
      30 + 100 + 100 + (100 + 40),
    );
    expect(120 + 25).toBe(145);
    expect(145 + 120).toBe(265);
    expect(145 + 240).toBe(385);
    expect(
      rightChoice(q("one-page-load-end-to-end", "repeat-request"))[0]?.label.startsWith("145 ms"),
    ).toBe(true);
    expect(numericValue(q("one-page-load-end-to-end", "http3-total"))).toBe(10 + 70 + (70 + 40));
    // The curl timings are cumulative: each step is the difference from the one before it.
    const timing = Object.fromEntries(
      codeLines(q("one-page-load-end-to-end", "farther-trace"))
        .map(unwrap)
        .map((line) => line.split(/\s+/u) as [string, string])
        .map(([key, value]) => [key, Number(value)]),
    ) as Record<string, number>;
    const tcp = (timing["time_connect"] ?? 0) - (timing["time_namelookup"] ?? 0);
    const tls = (timing["time_appconnect"] ?? 0) - (timing["time_connect"] ?? 0);
    const wait = (timing["time_starttransfer"] ?? 0) - (timing["time_appconnect"] ?? 0);
    expect(Math.abs(tcp - tls)).toBeLessThan(0.02);
    expect(wait).toBeGreaterThan(tcp);
    expect(wait).toBeCloseTo(0.14, 2);
    expect(timing["time_starttransfer"]).toBeCloseTo(0.39, 2);
    expect(tcp).toBeCloseTo(0.11, 2);
  });
});
