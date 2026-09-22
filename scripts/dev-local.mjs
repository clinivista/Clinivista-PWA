// Starts the API and the PWA together for local development, loading `.env`.
// Usage: `pnpm dev` from the repo root (see `.env.example`).
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, ".env");

if (!existsSync(envFile)) {
  console.error("Missing .env — copy .env.example to .env and fill it in.");
  process.exit(1);
}
process.loadEnvFile(envFile);

for (const name of ["DATABASE_URL", "API_PORT", "WEB_PORT"]) {
  if (!process.env[name]) {
    console.error(`${name} is not set in .env.`);
    process.exit(1);
  }
}

const apiPort = process.env.API_PORT;
const webPort = process.env.WEB_PORT;

const services = [
  {
    name: "api",
    color: "\x1b[36m",
    filter: "@workspace/api-server",
    env: { PORT: apiPort },
  },
  {
    name: "web",
    color: "\x1b[35m",
    filter: "@workspace/estecapelli",
    env: {
      PORT: webPort,
      BASE_PATH: process.env.BASE_PATH ?? "/",
      API_PROXY_TARGET: process.env.API_PROXY_TARGET ?? `http://localhost:${apiPort}`,
    },
  },
];

const children = [];
let shuttingDown = false;

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode !== null) continue;
    // Signal the whole process group: pnpm does not forward signals to the server it spawned.
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  }
  process.exitCode = code;
}

function pipeWithPrefix(stream, target, prefix) {
  let buffer = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) target.write(`${prefix} ${line}\n`);
  });
  stream.on("end", () => {
    if (buffer) target.write(`${prefix} ${buffer}\n`);
  });
}

for (const service of services) {
  const prefix = `${service.color}[${service.name}]\x1b[0m`;
  const child = spawn("pnpm", ["--filter", service.filter, "run", "dev"], {
    cwd: root,
    // Both children would otherwise run pnpm's pre-run install at once and race on node_modules.
    env: { ...process.env, npm_config_verify_deps_before_run: "false", ...service.env },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  pipeWithPrefix(child.stdout, process.stdout, prefix);
  pipeWithPrefix(child.stderr, process.stderr, prefix);
  child.on("exit", (code, signal) => {
    if (!shuttingDown) {
      console.error(`${prefix} exited (${signal ?? code}); stopping the other services.`);
    }
    shutdown(code ?? 1);
  });
  children.push(child);
}

console.log(`API → http://localhost:${apiPort}/api   PWA → http://localhost:${webPort}`);

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
