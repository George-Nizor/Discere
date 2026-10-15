import path from "node:path";
import { describe, expect, it } from "vitest";
import { dataDirectory, resolveCliCommand, resolveFromRepoRoot } from "../src/index.js";

describe("the data directory", () => {
  it("is data/ in a checkout and the user's profile in an installed release", () => {
    expect(dataDirectory({}, "linux")).toBe(resolveFromRepoRoot("data"));
    expect(
      dataDirectory(
        { DISCERE_PACKAGED: "1", LOCALAPPDATA: "C:\\Users\\Ada\\AppData\\Local" },
        "win32",
      ),
    ).toBe(path.join("C:\\Users\\Ada\\AppData\\Local", "Discere"));
    expect(
      dataDirectory({ DISCERE_PACKAGED: "1", XDG_DATA_HOME: "/home/ada/.data" }, "linux"),
    ).toBe("/home/ada/.data/discere");
    expect(
      dataDirectory({ DISCERE_PACKAGED: "1", DISCERE_DATA_DIR: "/srv/discere" }, "win32"),
    ).toBe("/srv/discere");
  });
});

describe("finding a command-line tool", () => {
  it("leaves the name alone off Windows", () => {
    expect(resolveCliCommand("codex", { PATH: "/usr/bin" }, "linux")).toBe("codex");
  });
  it("finds the native binary behind npm's codex.cmd on Windows", () => {
    const npm = "C:\\Users\\Ada\\AppData\\Roaming\\npm";
    const binary = `${npm}\\node_modules\\@openai\\codex\\bin\\codex-x86_64-pc-windows-msvc.exe`;
    const files = new Set([`${npm}\\codex.cmd`, binary]);
    const exists = (file: string) => files.has(file);
    expect(resolveCliCommand("codex", { PATH: `C:\\nowhere;${npm}` }, "win32", exists)).toBe(
      binary,
    );
    expect(resolveCliCommand("claude", { PATH: npm }, "win32", exists)).toBe("claude");
    files.add(`${npm}\\claude.exe`);
    expect(resolveCliCommand("claude", { PATH: npm }, "win32", exists)).toBe(`${npm}\\claude.exe`);
  });
});
