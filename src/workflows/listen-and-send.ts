import { GlobalKeyboardListener } from "node-global-key-listener";

import { isTriggerHotkey } from "../hotkeys/trigger-hotkey.js";
import { patchLegacyNodeApis } from "../utils/patch-legacy-node-apis.js";
import {
  captureFullscreenScreenshot,
  sendCapturedScreenshot,
  type CaptureAndSendInput,
} from "./capture-and-send.js";

export async function listenAndSend(input: CaptureAndSendInput) {
  patchLegacyNodeApis();
  const listener = new GlobalKeyboardListener();
  const queue: string[] = [];
  let nextScreenshotId = 1;
  let running = false;

  await listener.addListener((event, down) => {
    if (!isTriggerHotkey(event, down)) {
      return false;
    }

    const fileName = `${nextScreenshotId}.png`;
    nextScreenshotId += 1;

    void captureFullscreenScreenshot(input.workingDirectory, fileName)
      .then((imagePath) => {
        queue.push(imagePath);
        if (!running) {
          void drainQueue();
        }
      })
      .catch(() => {
        return;
      });

    return true;
  });

  async function drainQueue() {
    running = true;

    try {
      while (queue.length > 0) {
        const imagePath = queue.shift();

        if (!imagePath) {
          continue;
        }

        await sendCapturedScreenshot({
          ...input,
          imagePath,
          silent: true,
        }).catch(() => {
          return;
        });
      }
    } finally {
      running = false;
    }
  }

  await waitForExit(() => {
    listener.kill();
  });
}

function waitForExit(cleanup: () => void) {
  return new Promise<void>((resolve) => {
    const keepAlive = setInterval(() => {
      return;
    }, 60_000);

    const stop = () => {
      clearInterval(keepAlive);
      cleanup();
      process.off("SIGINT", stop);
      process.off("SIGTERM", stop);
      resolve();
    };

    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
  });
}
