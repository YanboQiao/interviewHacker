import { mkdir, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

import { ImageCodeMailerAgent } from "../agents/image-code-mailer-agent.js";
import { ClaudeImageCodeMailerAgent } from "../agents/claude-image-code-mailer-agent.js";
import type { ImageCodeMailerOutput } from "../schemas/image-code-mailer.js";
import type { AgentBackend, AgentMode, AgentStructuredResponse } from "../utils/response.js";

const execFileAsync = promisify(execFile);

export interface CaptureAndSendInput {
  prompt: string;
  subject?: string;
  workingDirectory: string;
  backend?: AgentBackend;
  mode?: AgentMode;
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
  const backend = input.backend ?? "codex";
  const mode = input.mode;
  const runInput = {
    imagePath,
    prompt: input.prompt,
    subject: input.subject,
    workingDirectory: input.workingDirectory,
  };

  try {
    const results: AgentStructuredResponse<ImageCodeMailerOutput>[] = [];

    if (backend === "all") {
      const settled = await Promise.allSettled([
        new ImageCodeMailerAgent({ mode }).run(runInput),
        new ClaudeImageCodeMailerAgent({ mode }).run(runInput),
      ]);
      for (const s of settled) {
        if (s.status === "fulfilled") results.push(s.value);
        else console.error(`[${s.reason?.backend ?? "unknown"}] failed:`, s.reason);
      }
    } else if (backend === "claude") {
      results.push(await new ClaudeImageCodeMailerAgent({ mode }).run(runInput));
    } else {
      results.push(await new ImageCodeMailerAgent({ mode }).run(runInput));
    }

    if (!input.silent) {
      for (const result of results) {
        console.log(`\n--- ${result.backend.toUpperCase()} ---`);
        console.log(JSON.stringify(result, null, 2));
      }
    }

    return results;
  } finally {
    await rm(imagePath, { force: true });
  }
}

export async function captureFullscreenScreenshot(
  workingDirectory: string,
  fileName = `capture-${Date.now()}.png`,
): Promise<string> {
  const pictureDirectory = join(resolve(workingDirectory), "pic");
  const screenshotPath = join(pictureDirectory, fileName);

  try {
    await mkdir(pictureDirectory, { recursive: true });

    if (process.platform === "darwin") {
      await execFileAsync("screencapture", ["-x", screenshotPath]);
    } else if (process.platform === "win32") {
      await captureScreenshotWindows(screenshotPath);
    } else {
      throw new Error(`Unsupported platform: ${process.platform}`);
    }

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

async function captureScreenshotWindows(outputPath: string): Promise<void> {
  const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
$bitmap.Save('${outputPath.replaceAll("'", "''")}', [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
`.trim();

  await execFileAsync("powershell", ["-NoProfile", "-Command", psScript]);
}
