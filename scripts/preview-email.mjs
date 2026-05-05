import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = join(scriptDir, "..");
const tsxEntry = join(root, "node_modules", "tsx", "dist", "cli.mjs");
const runner = join(scriptDir, "preview-email-run.ts");

const result = spawnSync(process.execPath, [tsxEntry, runner], {
  cwd: root,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
