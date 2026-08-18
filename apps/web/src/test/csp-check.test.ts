// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const SCRIPT = fileURLToPath(new URL("../../../../scripts/check-csp.mjs", import.meta.url));
const CLEAN_HTML =
  '<!doctype html><html lang="en"><head><title>Discere</title>' +
  '<script type="module" crossorigin src="/assets/index-abc.js"></script>' +
  '<link rel="stylesheet" href="/assets/index-abc.css"></head><body><div id="root"></div></body></html>';

let bundle: string;

beforeEach(() => {
  bundle = mkdtempSync(path.join(tmpdir(), "discere-csp-"));
  mkdirSync(path.join(bundle, "assets"), { recursive: true });
  writeFileSync(path.join(bundle, "index.html"), CLEAN_HTML, "utf8");
  writeFileSync(path.join(bundle, "assets", "index-abc.js"), 'fetch("/api/health");\n', "utf8");
  writeFileSync(
    path.join(bundle, "assets", "index-abc.css"),
    "@font-face{font-family:X;src:url(/assets/x.woff2)}\n",
    "utf8",
  );
});

afterEach(() => rmSync(bundle, { recursive: true, force: true }));

function check(): { ok: boolean; output: string } {
  try {
    return { ok: true, output: execFileSync("node", [SCRIPT, bundle], { encoding: "utf8" }) };
  } catch (error) {
    const failure = error as { stderr?: string; stdout?: string };
    return { ok: false, output: `${failure.stdout ?? ""}${failure.stderr ?? ""}` };
  }
}

describe("packaged Content Security Policy check", () => {
  it("passes a bundle that only names its own origin", () => {
    expect(check().ok).toBe(true);
  });

  it("fails an inline script, which script-src 'self' forbids", () => {
    writeFileSync(
      path.join(bundle, "index.html"),
      CLEAN_HTML.replace("<body>", '<body><script>window.go=1</script>'),
      "utf8",
    );
    const result = check();
    expect(result.ok).toBe(false);
    expect(result.output).toContain("inline <script>");
  });

  it("fails an external stylesheet", () => {
    writeFileSync(
      path.join(bundle, "index.html"),
      CLEAN_HTML.replace(
        '<link rel="stylesheet" href="/assets/index-abc.css">',
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">',
      ),
      "utf8",
    );
    const result = check();
    expect(result.ok).toBe(false);
    expect(result.output).toContain("another origin");
  });

  it("fails a font fetched from a CDN", () => {
    writeFileSync(
      path.join(bundle, "assets", "index-abc.css"),
      "@font-face{font-family:Inter;src:url(https://rsms.me/inter/inter.woff2)}\n",
      "utf8",
    );
    const result = check();
    expect(result.ok).toBe(false);
    expect(result.output).toContain("url()");
  });

  it("fails a request to an origin connect-src would refuse", () => {
    writeFileSync(
      path.join(bundle, "assets", "index-abc.js"),
      'fetch("https://api.example.com/v1/telemetry");\n',
      "utf8",
    );
    const result = check();
    expect(result.ok).toBe(false);
    expect(result.output).toContain("fetch()");
  });

  it("does not mistake a URL in an error message for a request", () => {
    writeFileSync(
      path.join(bundle, "assets", "index-abc.js"),
      'throw new Error("See https://react.dev/errors/418 for details");\n',
      "utf8",
    );
    expect(check().ok).toBe(true);
  });

  it("fails when there is no built bundle to check", () => {
    rmSync(path.join(bundle, "index.html"));
    const result = check();
    expect(result.ok).toBe(false);
    expect(result.output).toContain("pnpm build");
  });
});
