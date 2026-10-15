/**
 * The exact files a Windows install downloads to run practice code, with the SHA-256 and size
 * each must match. Rust matches the Linux pin (scripts/setup-rust-runtime.mjs); the GNU target
 * is used because rust-mingw ships its own linker, so no Visual Studio install is needed.
 * Python 3.12.10 is the last 3.12 release with an embeddable build, and the wheels match
 * scripts/python-runtime-requirements.txt (pandas also needs tzdata on Windows).
 */
export interface RuntimeArtifact {
  file: string;
  url: string;
  sha256: string;
  bytes: number;
  kind: "rust-component" | "python-embed" | "wheel";
}
export interface RuntimePin {
  version: string;
  target?: string;
  artifacts: RuntimeArtifact[];
}

const rust = (component: string, sha256: string, bytes: number): RuntimeArtifact => {
  const file = `${component}-1.93.1-x86_64-pc-windows-gnu.tar.xz`;
  return {
    file,
    url: `https://static.rust-lang.org/dist/${file}`,
    sha256,
    bytes,
    kind: "rust-component",
  };
};
const wheel = (url: string, sha256: string, bytes: number): RuntimeArtifact => ({
  file: url.slice(url.lastIndexOf("/") + 1),
  url,
  sha256,
  bytes,
  kind: "wheel",
});

export const RUST_RUNTIME: RuntimePin = {
  version: "1.93.1",
  target: "x86_64-pc-windows-gnu",
  artifacts: [
    rust("rustc", "c7c1048e3f56088aa623d09ad1033ed247849747cd78fa1679fe82cf8283c8db", 99362768),
    rust("rust-std", "ecc44147c49635205d0f7b418144604faa1c3926d8f20d7d3f109f08fa2fd02a", 26228964),
    rust("rust-mingw", "c6cd17eb2f127346876595bbc810c1366a0264c8787d371eb488b1ce9de4340d", 5472212),
  ],
};

export const PYTHON_RUNTIME: RuntimePin = {
  version: "3.12.10",
  artifacts: [
    {
      file: "python-3.12.10-embed-amd64.zip",
      url: "https://www.python.org/ftp/python/3.12.10/python-3.12.10-embed-amd64.zip",
      sha256: "4acbed6dd1c744b0376e3b1cf57ce906f9dc9e95e68824584c8099a63025a3c3",
      bytes: 11133606,
      kind: "python-embed",
    },
    wheel(
      "https://files.pythonhosted.org/packages/2d/57/8aeaf160312f7f489dea47ab61e430b5cb051f59a98ae68b7133ce8fa06a/numpy-2.3.5-cp312-cp312-win_amd64.whl",
      "86945f2ee6d10cdfd67bcb4069c1662dd711f7e2a4343db5cecec06b87cf31aa",
      12782922,
    ),
    wheel(
      "https://files.pythonhosted.org/packages/75/08/67cc404b3a966b6df27b38370ddd96b3b023030b572283d035181854aac5/pandas-3.0.1-cp312-cp312-win_amd64.whl",
      "536232a5fe26dd989bd633e7a0c450705fdc86a207fec7254a55e9a22950fe43",
      9741627,
    ),
    wheel(
      "https://files.pythonhosted.org/packages/ec/57/56b9bcc3c9c6a792fcbaf139543cee77261f3651ca9da0c93f5c1221264b/python_dateutil-2.9.0.post0-py2.py3-none-any.whl",
      "a8b2bc7bffae282281c8140a97d3aa9c14da0b136dfe83f850eea9a5f7470427",
      229892,
    ),
    wheel(
      "https://files.pythonhosted.org/packages/b7/ce/149a00dd41f10bc29e5921b496af8b574d8413afcd5e30dfa0ed46c2cc5e/six-1.17.0-py2.py3-none-any.whl",
      "4721f391ed90541fddacab5acf947aa0d3dc7d27b2e1e8eda2be8970586c3274",
      11050,
    ),
    wheel(
      "https://files.pythonhosted.org/packages/5c/23/c7abc0ca0a1526a0774eca151daeb8de62ec457e77262b66b359c3c7679e/tzdata-2025.2-py2.py3-none-any.whl",
      "1a403fada01ff9221ca8044d701868fa132215d84beb92242d9acd2147f667a8",
      347839,
    ),
  ],
};
