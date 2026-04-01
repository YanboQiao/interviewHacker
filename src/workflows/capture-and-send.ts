import { mkdir, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

import { ImageCodeMailerAgent } from "../agents/image-code-mailer-agent.js";

const execFileAsync = promisify(execFile);

export interface CaptureAndSendInput {
  prompt: string;
  subject?: string;
  workingDirectory: string;
  silent?: boolean;
}

export async function captureAndSend(input: CaptureAndSendInput) {
  const screenshotPath = await captureFullscreenScreenshot(input.workingDirectory);

  return sendCapturedScreenshot({
    ...input,
    imagePath: screenshotPath,
  });
}

interface SendCapturedScreenshotInput extends CaptureAndSendInput {
  imagePath: string;
}

export async function sendCapturedScreenshot(input: SendCapturedScreenshotInput) {
  const imagePath = resolve(input.imagePath);

  try {
    const agent = new ImageCodeMailerAgent();

    const result = await agent.run({
      imagePath,
      prompt: input.prompt,
      subject: input.subject,
      workingDirectory: input.workingDirectory,
    });

    if (!input.silent) {
      console.log(JSON.stringify(result, null, 2));
    }

    return result;
  } finally {
    await rm(imagePath, { force: true });
  }
}

export async function captureFullscreenScreenshot(
  workingDirectory: string,
  fileName = `capture-${Date.now()}.png`,
): Promise<string> {
  ensureMacOs();

  const pictureDirectory = join(resolve(workingDirectory), "pic");
  const screenshotPath = join(pictureDirectory, fileName);

  try {
    await mkdir(pictureDirectory, { recursive: true });
    await execFileAsync("screencapture", ["-x", screenshotPath]);
    const info = await stat(screenshotPath);

    if (info.size === 0) {
      throw new Error("Screenshot was empty");
    }

    return screenshotPath;
  } catch (error) {
    await rm(screenshotPath, { force: true });

    if (error instanceof Error) {
      throw new Error(`Screenshot cancelled or failed: ${error.message}`);
    }

    throw error;
  }
}

function ensureMacOs() {
  if (process.platform !== "darwin") {
    throw new Error("The capture workflow currently supports macOS only");
  }
}
