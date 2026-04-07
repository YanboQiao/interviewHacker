import type { IGlobalKeyDownMap, IGlobalKeyEvent } from "node-global-key-listener";
import { platform } from "node:process";

export const DEFAULT_TRIGGER_HOTKEY =
  platform === "darwin" ? "Control + Option + ;" : "Ctrl + Alt + ;";

export function isTriggerHotkey(event: IGlobalKeyEvent, down: IGlobalKeyDownMap) {
  if (event.state !== "DOWN" || event.name !== "SEMICOLON") {
    return false;
  }

  const ctrlPressed = Boolean(down["LEFT CTRL"] || down["RIGHT CTRL"]);
  const altPressed = Boolean(down["LEFT ALT"] || down["RIGHT ALT"]);
  const metaPressed = Boolean(down["LEFT META"] || down["RIGHT META"]);
  const shiftPressed = Boolean(down["LEFT SHIFT"] || down["RIGHT SHIFT"]);

  return ctrlPressed && altPressed && !metaPressed && !shiftPressed;
}
