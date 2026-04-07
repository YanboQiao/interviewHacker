import { chmod } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { platform } from "node:process";

const require = createRequire(import.meta.url);

async function main() {
  if (platform !== "darwin") {
    return;
  }

  const packageJsonPath = require.resolve("node-global-key-listener/package.json");
  const packageDirectory = dirname(packageJsonPath);
  const macBinaryPath = join(packageDirectory, "bin", "MacKeyServer");

  try {
    await chmod(macBinaryPath, 0o755);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[postinstall] failed to chmod MacKeyServer: ${message}`);
  }
}

await main();
