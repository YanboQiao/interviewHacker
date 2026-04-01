import { resolve } from "node:path";

import { ImageCodeMailerAgent } from "./agents/image-code-mailer-agent.js";
import { DEFAULT_TRIGGER_HOTKEY } from "./hotkeys/trigger-hotkey.js";
import { captureAndSend, type CaptureAndSendInput } from "./workflows/capture-and-send.js";
import { listenAndSend } from "./workflows/listen-and-send.js";

type CommandName = "run" | "capture" | "listen";
const LISTEN_PROMPT = "请完成图片所示的题目，把答案或者代码发送到我的邮箱中";

interface CommonArgs {
  prompt: string;
  subject?: string;
}

interface RunArgs extends CommonArgs {
  imagePath: string;
  workingDirectory: string;
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const command = parseCommand(rawArgs);
  const restArgs = command ? rawArgs.slice(1) : rawArgs;
  const requestedHelp = rawArgs.includes("--help") || rawArgs.includes("-h");

  if (command === "listen") {
    await listenAndSend({
      prompt: LISTEN_PROMPT,
      workingDirectory: process.cwd(),
    });
    return;
  }

  if (command === "capture") {
    const args = parseCommonArgs(restArgs);

    if (!args) {
      printUsage();
      process.exitCode = requestedHelp ? 0 : 1;
      return;
    }

    await captureAndSend({
      ...args,
      workingDirectory: process.cwd(),
    });
    return;
  }

  const args = parseRunArgs(command ? restArgs : rawArgs);

  if (!args) {
    printUsage();
    process.exitCode = requestedHelp ? 0 : 1;
    return;
  }

  const agent = new ImageCodeMailerAgent();
  const result = await agent.run(args);
  console.log(JSON.stringify(result, null, 2));
}

function parseCommand(argv: string[]): CommandName | null {
  const candidate = argv[0];

  if (candidate === "run" || candidate === "capture" || candidate === "listen") {
    return candidate;
  }

  return null;
}

function parseRunArgs(argv: string[]): RunArgs | null {
  const common = parseCommonArgs(argv);

  if (!common) {
    return null;
  }

  const imagePath = readOption(argv, "--image");
  if (!imagePath) {
    return null;
  }

  return {
    ...common,
    imagePath: resolve(imagePath),
    workingDirectory: process.cwd(),
  };
}

function parseCommonArgs(argv: string[]): CommonArgs | null {
  const prompt = readOption(argv, "--prompt");

  if (!prompt) {
    return null;
  }

  return {
    prompt,
    subject: readOption(argv, "--subject") ?? undefined,
  };
}

function readOption(argv: string[], name: string) {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--" || arg === "--help" || arg === "-h") {
      continue;
    }

    if (arg === name) {
      const value = argv[index + 1];

      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for argument: ${name}`);
      }

      return value;
    }
  }

  return null;
}

function printUsage() {
  console.log(
    [
      "Usage:",
      "pnpm once -- --image <path> --prompt <text> [--subject <text>]",
      "pnpm capture -- --prompt <text> [--subject <text>]",
      "pnpm listen",
      "",
      `Default trigger hotkey: ${DEFAULT_TRIGGER_HOTKEY}`,
    ].join("\n"),
  );
}

void main();
