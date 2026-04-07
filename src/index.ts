import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { DEFAULT_TRIGGER_HOTKEY } from "./hotkeys/trigger-hotkey.js";
import { listenAndSend } from "./workflows/listen-and-send.js";
import type { AgentBackend, AgentMode } from "./utils/response.js";

const PROMPT_BY_MODE: Record<AgentMode, string> = {
  code: "请完成图片所示的题目，把答案或者代码发送到我的邮箱中",
  default: "请分析图片中的内容，把答案发送到我的邮箱中",
  personality: "请分析图片中的性格测试题目，给出最优选项，把答案发送到我的邮箱中",
};

async function main() {
  let mode: AgentMode = "code";
  let backend: AgentBackend = "codex";

  console.log("\n=== Interview Hacker ===\n");

  if (stdin.isTTY) {
    const rl = createInterface({ input: stdin, output: stdout });
    try {
      mode = await askMode(rl);
      backend = await askBackend(rl);
    } finally {
      rl.close();
    }
  } else {
    console.log("  Non-interactive mode, using defaults: mode=code, backend=codex\n");
  }

  console.log(`\n  Mode:    ${mode}`);
  console.log(`  Backend: ${backend}`);
  console.log(`  Hotkey:  ${DEFAULT_TRIGGER_HOTKEY}`);
  console.log("\n  Listening... Press hotkey to capture screenshot.\n");

  await listenAndSend({
    prompt: PROMPT_BY_MODE[mode],
    workingDirectory: process.cwd(),
    backend,
    mode,
  });
}

async function askMode(rl: ReturnType<typeof createInterface>): Promise<AgentMode> {
  console.log("  Select mode:");
  console.log("    1. code        - Code / algorithm problems (default)");
  console.log("    2. personality  - Personality / competency tests");
  console.log("    3. default      - General image Q&A");

  const answer = (await rl.question("\n  Enter choice [1]: ")).trim();

  if (answer === "2") return "personality";
  if (answer === "3") return "default";
  return "code";
}

async function askBackend(rl: ReturnType<typeof createInterface>): Promise<AgentBackend> {
  console.log("\n  Select backend:");
  console.log("    1. codex  - OpenAI Codex (default)");
  console.log("    2. claude - Claude Opus 4.6");
  console.log("    3. all    - Both in parallel (compare results)");

  const answer = (await rl.question("\n  Enter choice [1]: ")).trim();

  if (answer === "2") return "claude";
  if (answer === "3") return "all";
  return "codex";
}

void main();
