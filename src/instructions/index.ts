import type { AgentMode } from "../utils/response.js";
import { imageCodeMailerInstructions } from "./image-code-mailer.js";
import { defaultModeInstructions } from "./default-mode.js";
import { personalityTestInstructions } from "./personality-test.js";

const instructionsByMode: Record<AgentMode, string> = {
  code: imageCodeMailerInstructions,
  default: defaultModeInstructions,
  personality: personalityTestInstructions,
};

export function getInstructions(mode: AgentMode): string {
  return instructionsByMode[mode];
}
