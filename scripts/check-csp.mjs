#!/usr/bin/env node
/**
 * The packaged posture check.
 *
 * Instrumenta opens Discere in a hardened window and replaces whatever headers the server sent
 * with its own policy: `script-src 'self'`, `style-src 'self' 'unsafe-inline'`,
 * `connect-src 'self'`, `font-src 'self'`, and no other origin anywhere. A bundle that reaches
 * for a CDN font, an external script, or a remote stylesheet would fail to load there, and it
 * would fail silently. This reads the built bundle so that failure is caught here instead.
 *
 * It looks for the constructs that actually issue a request. A bare URL inside an error
 * message, a licence banner, or a JSON Schema identifier is not a request and is not flagged;
 * a `fetch`, a stylesheet, a font face, or a script element pointed at another origin is.
 *
 * Development is unaffected. Vite's dev server injects its own inline scripts and never runs
 * under this policy.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLE = path.resolve(REPO_ROOT, process.argv[2] ?? "apps/web/dist");

/** Constructs in generated JavaScript that fetch from wherever their argument names. */
const SCRIPT_REQUESTS = [
  [/\bfetch\s*\(\s*["'`]https?:\/\//i, "fetch() to another origin"],
  [/\bimport\s*\(\s*["'`]https?:\/\//i, "dynamic import() from another origin"],
  [/new\s+WebSocket\s*\(\s*["'`]wss?:\/\//i, "WebSocket to another origin"],
  [/new\s+(?:Worker|SharedWorker)\s*\(\s*["'`]https?:\/\//i, "worker loaded from another origin"],
  [/\bimportScripts\s*\(\s*["'`]https?:\/\//i, "importScripts() from another origin"],
  [/\.open\s*\(\s*["'][A-Za-z]+["']\s*,\s*["'`]https?:\/\//i, "XMLHttpRequest to another origin"],
  [/\.(?:src|href)\s*=\s*["'`]https?:\/\//i, "element pointed at another origin"],
  [/\bnew\s+EventSource\s*\(\s*["'`]https?:\/\//i, "EventSource on another origin"],
];

/** Constructs in generated CSS that fetch. `style-src` allows inline style, not remote style. */
const STYLE_REQUESTS = [
  [/@import\s+(?:url\(\s*)?["']?https?:\/\//i, "CSS @import of a remote stylesheet"],
  [/\burl\(\s*["']?https?:\/\//i, "CSS url() pointing at another origin"],
];

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const absolute = path.join(directory, entry);
    if (statSync(absolute).isDirectory()) files.push(...walk(absolute));
    else files.push(absolute);
  }
  return files;
}

function checkHtml(relative, source, problems) {
  // `script-src 'self'` allows no inline script, with or without a nonce.
  for (const tag of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attributes = tag[1] ?? "";
    const body = (tag[2] ?? "").trim();
    if (body.length > 0) {
      problems.push(`${relative}: inline <script> body of ${body.length} characters.`);
    }
    const source_ = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attributes)?.[1];
    if (source_ && !source_.startsWith("/") && !source_.startsWith("./")) {
      problems.push(`${relative}: <script src="${source_}"> is not a same-origin path.`);
    }
  }
  for (const handler of source.matchAll(/\son[a-z]+\s*=\s*["'][^"']*["']/gi)) {
    problems.push(`${relative}: inline event handler ${handler[0].trim().split("=")[0]}.`);
  }
  for (const tag of source.matchAll(/<(link|img|iframe|source|video|audio)\b[^>]*>/gi)) {
    const attribute = /\b(?:href|src)\s*=\s*["']([^"']+)["']/i.exec(tag[0] ?? "")?.[1];
    if (attribute && /^https?:\/\//i.test(attribute)) {
      problems.push(`${relative}: <${tag[1]}> loads ${attribute} from another origin.`);
    }
  }
  if (/<style\b[^>]*>[\s\S]*?@import/i.test(source)) {
    problems.push(`${relative}: inline <style> with an @import.`);
  }
}

function failures() {
  const problems = [];
  const files = walk(BUNDLE);
  const html = files.filter((file) => file.endsWith(".html"));
  if (html.length === 0) {
    problems.push(`${BUNDLE} holds no HTML. Run 'pnpm build' first.`);
    return problems;
  }

  for (const file of files) {
    const relative = path.relative(REPO_ROOT, file);
    const extension = path.extname(file);
    if (extension === ".html") {
      checkHtml(relative, readFileSync(file, "utf8"), problems);
      continue;
    }
    const rules =
      extension === ".css"
        ? STYLE_REQUESTS
        : extension === ".js" || extension === ".mjs"
          ? SCRIPT_REQUESTS
          : null;
    if (!rules) continue;
    const source = readFileSync(file, "utf8");
    for (const [pattern, description] of rules) {
      const match = pattern.exec(source);
      if (match) problems.push(`${relative}: ${description} — ${match[0].slice(0, 120)}`);
    }
  }
  return problems;
}

const problems = failures();
if (problems.length > 0) {
  console.error(
    `The built bundle would not load under Instrumenta's Content Security Policy:\n${problems
      .map((problem) => `  - ${problem}`)
      .join("\n")}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `${path.relative(REPO_ROOT, BUNDLE)} satisfies script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'.`,
  );
}
