#!/usr/bin/env node
/**
 * Requests every source URL in every course bundle and writes what came back, so a person can
 * compare each record with the page it points at.
 *
 *   node scripts/check-sources.mjs --out <report.json> [--cache <file>] [--course <id>] [--refresh]
 *
 * For each record the report holds the HTTP status, the address after redirects and the page's
 * <title>, and for a DOI what Crossref has registered under it. It needs the network, so it is run by hand and is not part of `pnpm check` or CI.
 * Answers are cached by URL (default `node_modules/.cache/check-sources.json`); `--refresh`
 * ignores the cache. The script reports and never edits a bundle.
 */
import { mkdirSync, readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";

// Node tries IPv6 and IPv4 together and gives each 250 ms by default, which is too short for
// some hosts on a network without working IPv6: they time out although they are up.
net.setDefaultAutoSelectFamilyAttemptTimeout(5000);

const ROOT = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const out = option("--out");
if (!out) throw new Error("Usage: node scripts/check-sources.mjs --out <report.json> [--cache <file>] [--course <id>] [--refresh]");
const cacheFile = path.resolve(option("--cache") ?? path.join(ROOT, "node_modules", ".cache", "check-sources.json"));
const onlyCourse = option("--course");
const refresh = args.includes("--refresh");

const USER_AGENT = "Mozilla/5.0 (compatible; source-link-checker/1.0)";
const TIMEOUT_MS = 25_000;
const CONCURRENCY = 8;
const PER_HOST = 2;
const MAX_BODY = 512 * 1024;

const cache = !refresh && existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, "utf8")) : {};

const records = [];
for (const course of readdirSync(path.join(ROOT, "content")).sort()) {
  if (onlyCourse && course !== onlyCourse) continue;
  const file = path.join(ROOT, "content", course, "bundle.json");
  if (!existsSync(file)) continue;
  const bundle = JSON.parse(readFileSync(file, "utf8"));
  const reviewed = existsSync(path.join(ROOT, "content", course, "review", "publication.json"));
  for (const source of bundle.sources ?? []) {
    records.push({
      course,
      reviewed,
      id: source.id,
      title: source.title,
      publisher: source.publisher,
      licence: source.licence,
      url: source.url ?? null,
    });
  }
}

const decodeEntities = (text) =>
  text
    .replace(/&#x([0-9a-f]+);/giu, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/gu, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&amp;/gu, "&")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, '"')
    .replace(/&(?:apos|#39);/gu, "'")
    .replace(/&nbsp;/gu, " ")
    .replace(/&ndash;/gu, "–")
    .replace(/&mdash;/gu, "—");

async function request(url, method) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
        "accept-language": "en",
      },
    });
    const contentType = response.headers.get("content-type") ?? "";
    let pageTitle = null;
    if (method === "GET" && /html|xml/iu.test(contentType)) {
      // Only the head of the page is needed for its title.
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      while (size < MAX_BODY) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        size += value.length;
        if (/<\/title>/iu.test(Buffer.from(value).toString("latin1"))) break;
      }
      await reader.cancel().catch(() => {});
      const html = Buffer.concat(chunks).toString("utf8");
      const match = /<title[^>]*>([\s\S]*?)<\/title>/iu.exec(html);
      if (match) pageTitle = decodeEntities(match[1]).replace(/\s+/gu, " ").trim() || null;
    } else {
      await response.body?.cancel().catch(() => {});
    }
    return { status: response.status, finalUrl: response.url, contentType, pageTitle };
  } catch (error) {
    const cause = error?.cause?.code ?? error?.cause?.message ?? error?.name ?? String(error);
    return { status: null, error: String(cause) };
  } finally {
    clearTimeout(timer);
  }
}

/** HEAD first, because it is cheap; GET when HEAD is refused or when the page has a title to read. */
async function check(url) {
  const head = await request(url, "HEAD");
  const isPage = head.status && head.status < 400 && /html|xml/iu.test(head.contentType ?? "");
  if (head.status && head.status < 400 && !isPage) return { ...head, method: "HEAD" };
  const get = await request(url, "GET");
  return { ...get, method: "GET", headStatus: head.status ?? head.error };
}

/**
 * Publishers refuse automated readers, so a DOI is also looked up in Crossref's public index,
 * which says what the DOI is registered to whether or not the publisher's page will open.
 */
const doiOf = (url) => {
  const match = /(?:doi\.org\/|\/doi\/(?:abs\/|full\/|pdf\/)?)(10\.\d{4,9}\/[^?#\s]+)/u.exec(url);
  return match ? decodeURIComponent(match[1]) : null;
};
async function crossref(doi) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      signal: controller.signal,
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
    });
    if (!response.ok) return { doi, status: response.status };
    const work = (await response.json()).message;
    return {
      doi,
      status: 200,
      title: decodeEntities(work.title?.[0] ?? "").replace(/<[^>]+>/gu, "").replace(/\s+/gu, " ").trim(),
      authors: (work.author ?? []).map((author) => author.family ?? author.name).filter(Boolean),
      container: work["container-title"]?.[0] ?? null,
      year: work.issued?.["date-parts"]?.[0]?.[0] ?? null,
    };
  } catch (error) {
    return { doi, status: null, error: String(error?.cause?.code ?? error?.name ?? error) };
  } finally {
    clearTimeout(timer);
  }
}

const urls = [...new Set(records.map((record) => record.url).filter(Boolean))];
// A request that never got an answer is asked again on the next run; an answer is kept.
const todo = urls.filter((url) => !cache[url] || cache[url].status === null);
const busy = new Map();
let done = 0;
const save = () => {
  mkdirSync(path.dirname(cacheFile), { recursive: true });
  writeFileSync(cacheFile, `${JSON.stringify(cache, null, 1)}\n`);
};
async function worker() {
  while (todo.length) {
    // Take the first URL whose host is not already being asked by PER_HOST workers.
    const at = todo.findIndex((url) => (busy.get(new URL(url).host) ?? 0) < PER_HOST);
    if (at < 0) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      continue;
    }
    const [url] = todo.splice(at, 1);
    const host = new URL(url).host;
    busy.set(host, (busy.get(host) ?? 0) + 1);
    const doi = doiOf(url);
    cache[url] = {
      ...(await check(url)),
      ...(doi ? { crossref: await crossref(doi) } : {}),
      checkedAt: new Date().toISOString(),
    };
    busy.set(host, busy.get(host) - 1);
    done += 1;
    if (done % 25 === 0) {
      save();
      console.error(`${done} requested, ${todo.length} to go`);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}
console.error(`${records.length} records, ${urls.length} addresses, ${todo.length} not in the cache`);
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
save();

const outcome = (result) => {
  if (!result) return "no-url";
  if (result.status === null) return "failed";
  if (result.status === 404 || result.status === 410) return "dead";
  if ([401, 403, 429].includes(result.status) || result.status >= 500) return "blocked";
  if (result.status >= 400) return "dead";
  return "reachable";
};
const report = {
  generatedAt: new Date().toISOString(),
  records: records.map((record) => {
    const result = record.url ? cache[record.url] : undefined;
    return { ...record, http: outcome(result), ...(result ?? {}) };
  }),
};
const counts = {};
for (const record of report.records) counts[record.http] = (counts[record.http] ?? 0) + 1;
report.counts = counts;
mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
writeFileSync(path.resolve(out), `${JSON.stringify(report, null, 2)}\n`);
console.log(counts);
