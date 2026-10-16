import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const REMOTE_CONFIRMATION = "I_CONFIRM_THIS_IS_A_DEDICATED_TEST_PROJECT";
const requiredVariables = [
  "SUPABASE_TEST_URL",
  "SUPABASE_TEST_ANON_KEY",
  "SUPABASE_TEST_SERVICE_ROLE_KEY",
];

function requireTestEnvironment() {
  const missing = requiredVariables.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing test-only environment variables: ${missing.join(", ")}`);
  }

  if (process.env.SUPABASE_TEST_ANON_KEY === process.env.SUPABASE_TEST_SERVICE_ROLE_KEY) {
    throw new Error("The test anon key and service-role key must be different.");
  }

  const url = new URL(process.env.SUPABASE_TEST_URL);
  const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (!isLoopback) {
    const expectedRef = process.env.SUPABASE_TEST_PROJECT_REF;
    const hostnameRef = url.hostname.split(".")[0];
    if (
      url.protocol !== "https:"
      || !url.hostname.endsWith(".supabase.co")
      || !expectedRef
      || expectedRef !== hostnameRef
      || process.env.SUPABASE_TEST_ALLOW_REMOTE !== REMOTE_CONFIRMATION
    ) {
      throw new Error(
        "Remote testing is blocked. Use loopback, or explicitly confirm a dedicated test project and matching project ref.",
      );
    }
  }

  return { isLoopback };
}

async function findAvailablePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  await new Promise((resolveClose, rejectClose) => {
    server.close((error) => error ? rejectClose(error) : resolveClose());
  });
  return port;
}

function start(command, args, env) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
    windowsHide: true,
  });
  child.once("error", (error) => {
    console.error(`Could not start ${command}: ${error.message}`);
  });
  return child;
}

async function waitForServer(child, url) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("The isolated Next.js test server exited before becoming ready.");
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // The development server is still starting.
    }
    await delay(500);
  }
  throw new Error("Timed out waiting for the isolated Next.js test server.");
}

async function stop(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([once(child, "exit"), delay(5_000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

async function run() {
  const { isLoopback } = requireTestEnvironment();
  const port = await findAvailablePort();
  const appUrl = `http://127.0.0.1:${port}`;
  const nextCli = resolve("node_modules/next/dist/bin/next");
  const testEnv = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_TEST_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_TEST_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_TEST_SERVICE_ROLE_KEY,
    SUPABASE_TEST_APP_URL: appUrl,
    NEXT_TELEMETRY_DISABLED: "1",
  };

  console.log(`Starting an isolated Next.js test server (${isLoopback ? "loopback Supabase" : "confirmed test project"}).`);
  const server = start(process.execPath, [nextCli, "dev", "--hostname", "127.0.0.1", "--port", String(port)], testEnv);
  try {
    await waitForServer(server, appUrl);
    const testProcess = start(process.execPath, ["--test", "supabase/tests/real-supabase.integration.mjs"], testEnv);
    const [code] = await once(testProcess, "exit");
    if (code !== 0) process.exitCode = code ?? 1;
  } finally {
    await stop(server);
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : "Supabase integration test setup failed.");
  process.exitCode = 1;
});