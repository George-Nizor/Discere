import { IsolatedRustRuntime } from "../apps/server/src/rust/runtime.js";

const runtime = new IsolatedRustRuntime();
const [result] = await runtime.run(
  {
    code: 'use std::io::Read;\nfn main() {\n    let mut name = String::new();\n    std::io::stdin().read_to_string(&mut name).unwrap();\n    let home = std::fs::read_dir("/home").is_ok();\n    let net = std::net::TcpStream::connect("1.1.1.1:443").is_ok();\n    println!("hello {} home={} net={}", name.trim(), home, net);\n}\n',
  },
  ["sandbox"],
);
console.log(JSON.stringify(result, null, 2));
if (result?.status !== "ok" || result.stdout.trim() !== "hello sandbox home=false net=false")
  process.exitCode = 1;
