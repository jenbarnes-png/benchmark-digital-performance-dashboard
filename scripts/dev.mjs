// Launches `next dev`, explicitly setting PATH first. The process that
// starts this script sometimes provides an environment with no PATH at
// all, which crashes Next's Turbopack worker pool (it shells out to
// spawn processes internally). This just makes sure PATH is always set.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(projectRoot, "node_modules/next/dist/bin/next");
const nodeBinDir = path.dirname(process.execPath);

const env = {
  ...process.env,
  PATH: [nodeBinDir, process.env.PATH, "/usr/bin", "/bin"].filter(Boolean).join(":"),
};

const child = spawn(process.execPath, [nextBin, "dev", projectRoot], {
  stdio: "inherit",
  env,
});

child.on("exit", (code) => process.exit(code ?? 0));
