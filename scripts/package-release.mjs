// Builds the Windows release bundle Instrumenta installs: dist/release/discere-<version>.zip.
//
// The bundle keeps the repository's layout for every file the server reads (content/, prompts/,
// apps/web/dist, apps/server/drizzle and the Python runner scripts), so the same path code works
// in a checkout and in an install. `discere-bundle.json` at the root marks it. Beside those it
// carries a pinned node.exe, the server bundled into one file, better-sqlite3's Windows build and
// the sandbox helper. Run `pnpm build` first. The sandbox helper is built on Windows
// (tools/windows-sandbox); pass --sandbox <exe> or leave it at tools/windows-sandbox/dist.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NODE = {
  version: "22.22.2",
  sha256: "7c93e9d92bf68c07182b471aa187e35ee6cd08ef0f24ab060dfff605fcc1c57c",
};
const args = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const version = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).version;
const out = path.join(root, "dist/release");
const stage = path.join(out, "stage");
const cache = path.join(root, ".cache/release");
const sandbox = path.resolve(
  option("--sandbox") ?? path.join(root, "tools/windows-sandbox/dist/discere-sandbox.exe"),
);

function run(command, commandArgs, cwd = root) {
  const result = spawnSync(command, commandArgs, { cwd, stdio: "inherit", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${commandArgs.join(" ")} failed.`);
}
const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

async function nodeExecutable() {
  const name = `node-v${NODE.version}-win-x64`;
  const zip = path.join(cache, `${name}.zip`);
  mkdirSync(cache, { recursive: true });
  if (!existsSync(zip) || sha256(zip) !== NODE.sha256) {
    const response = await fetch(`https://nodejs.org/dist/v${NODE.version}/${name}.zip`);
    if (!response.ok)
      throw new Error(`Node ${NODE.version} could not be downloaded (${response.status}).`);
    writeFileSync(zip, Buffer.from(await response.arrayBuffer()));
  }
  if (sha256(zip) !== NODE.sha256)
    throw new Error("The Node download does not match its pinned SHA-256.");
  const extracted = path.join(cache, name);
  if (!existsSync(path.join(extracted, "node.exe"))) {
    rmSync(extracted, { recursive: true, force: true });
    if (process.platform === "win32")
      run(path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe"), [
        "-xf",
        zip,
        "-C",
        cache,
        `${name}/node.exe`,
        `${name}/LICENSE`,
      ]);
    else run("unzip", ["-q", "-o", zip, `${name}/node.exe`, `${name}/LICENSE`, "-d", cache]);
  }
  return extracted;
}

const copy = (from, to = from, filter) =>
  cpSync(path.join(root, from), path.join(stage, to), {
    recursive: true,
    ...(filter ? { filter } : {}),
  });

if (!existsSync(path.join(root, "apps/web/dist/index.html")))
  throw new Error("Run pnpm build first.");
if (!existsSync(sandbox))
  throw new Error(
    `The sandbox helper is missing at ${sandbox}. Build tools/windows-sandbox on Windows.`,
  );

rmSync(out, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

await build({
  entryPoints: [path.join(root, "apps/server/src/index.ts")],
  outfile: path.join(stage, "apps/server/dist/index.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  external: ["better-sqlite3"],
  legalComments: "linked",
  // Fastify and its plugins are CommonJS; an ES module bundle needs require and __dirname back.
  banner: {
    js: [
      'import { createRequire as __discereRequire } from "node:module";',
      'import { fileURLToPath as __discereFileUrl } from "node:url";',
      "const require = __discereRequire(import.meta.url);",
      "const __filename = __discereFileUrl(import.meta.url);",
      'const __dirname = __filename.replace(/[\\\\/][^\\\\/]*$/, "");',
    ].join("\n"),
  },
  logLevel: "warning",
});

// Course bundles, their reviewed assets and project files. Authoring sources stay behind.
copy("content", "content", (source) => !source.split(path.sep).includes("authoring"));
copy("prompts");
copy("apps/web/dist");
copy("apps/server/drizzle");
for (const file of [
  "apps/server/src/python-projects/bootstrap.py",
  "apps/server/src/sql-projects/runner.py",
])
  copy(file);

// better-sqlite3 is a Node-API addon, so its prebuilt Windows binary loads in any Node 22.
const sqlite = path.dirname(
  spawnSync(process.execPath, ["-p", "require.resolve('better-sqlite3/package.json')"], {
    cwd: path.join(root, "apps/server"),
    encoding: "utf8",
  }).stdout.trim(),
);
const sqliteTarget = path.join(stage, "node_modules/better-sqlite3");
for (const part of ["package.json", "LICENSE", "lib", "prebuilds/win32-x64.node"])
  cpSync(path.join(sqlite, part), path.join(sqliteTarget, part), { recursive: true });

const nodeDirectory = await nodeExecutable();
cpSync(path.join(nodeDirectory, "node.exe"), path.join(stage, "runtime/node.exe"));
cpSync(path.join(nodeDirectory, "LICENSE"), path.join(stage, "runtime/NODE-LICENSE"));
cpSync(sandbox, path.join(stage, "runtime/discere-sandbox.exe"));

const product = JSON.parse(readFileSync(path.join(root, "instrumenta/product.json"), "utf8"));
const { launch } = product;
mkdirSync(path.join(stage, "instrumenta"), { recursive: true });
writeFileSync(
  path.join(stage, "instrumenta/product.json"),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      id: product.id,
      displayName: product.displayName,
      kind: product.kind,
      adapter: "web-service",
      versionSource: { type: "package-json", path: "package.json" },
      launch: {
        type: "service",
        port: launch.port,
        fallbackPort: launch.fallbackPort,
        health: launch.health,
        command: ["runtime/node.exe", "apps/server/dist/index.mjs"],
        cwd: ".",
        env: { ...launch.env, DISCERE_PACKAGED: "1" },
      },
      assets: product.assets,
    },
    null,
    2,
  )}\n`,
);
mkdirSync(path.dirname(path.join(stage, product.assets.mark)), { recursive: true });
cpSync(path.join(root, product.assets.mark), path.join(stage, product.assets.mark));
writeFileSync(
  path.join(stage, "package.json"),
  `${JSON.stringify({ name: "discere", version, private: true }, null, 2)}\n`,
);
writeFileSync(
  path.join(stage, "discere-bundle.json"),
  `${JSON.stringify({ version, node: NODE.version, builtAt: new Date().toISOString() }, null, 2)}\n`,
);

const zip = path.join(out, `discere-${version}.zip`);
// Python's zipfile writes the same archive on every platform: forward slashes, no directory
// entries the launcher's extractor would have to skip, and nothing outside the stage.
run(process.platform === "win32" ? "python" : "python3", [
  "-I",
  "-c",
  [
    "import os, sys, zipfile",
    "stage, target = sys.argv[1], sys.argv[2]",
    "with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:",
    "    for folder, _, files in sorted(os.walk(stage)):",
    "        for name in sorted(files):",
    "            full = os.path.join(folder, name)",
    "            z.write(full, os.path.relpath(full, stage).replace(os.sep, '/'))",
  ].join("\n"),
  stage,
  zip,
]);
console.log(`${path.relative(root, zip)} (${(readFileSync(zip).length / 1048576).toFixed(1)} MB)`);
