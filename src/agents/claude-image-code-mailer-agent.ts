import { existsSync, readFileSync } from "node:fs";
import { resolve, extname } from "node:path";

import { query } from "@anthropic-ai/claude-agent-sdk";
import type { SDKUserMessage, SDKResultSuccess } from "@anthropic-ai/claude-agent-sdk";

import { getInstructions } from "../instructions/index.js";
import {
  imageCodeMailerJsonSchema,
  imageCodeMailerOutputSchema,
  type ImageCodeMailerOutput,
} from "../schemas/image-code-mailer.js";
import {
  toPlainObject,
  type AgentMode,
  type AgentStructuredResponse,
  type ClaudeToolCall,
} from "../utils/response.js";

interface ClaudeImageCodeMailerAgentOptions {
  model?: string;
  mode?: AgentMode;
}

export interface ClaudeRunInput {
  workingDirectory: string;
  imagePath: string;
  prompt: string;
  subject?: string;
}

const EXT_TO_MEDIA_TYPE: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export class ClaudeImageCodeMailerAgent {
  private readonly model: string;
  private readonly systemPrompt: string;
  private sessionId: string | null = null;

  constructor(options: ClaudeImageCodeMailerAgentOptions = {}) {
    this.model = options.model ?? "claude-opus-4-6";
    this.systemPrompt = getInstructions(options.mode ?? "code");
  }

  async run(input: ClaudeRunInput): Promise<AgentStructuredResponse<ImageCodeMailerOutput>> {
    const workingDirectory = resolve(input.workingDirectory);
    const imagePath = resolve(input.imagePath);

    if (!existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    const imageData = readFileSync(imagePath).toString("base64");
    const mediaType = EXT_TO_MEDIA_TYPE[extname(imagePath).toLowerCase()] ?? "image/png";
    const promptText = this.buildRunPrompt({ ...input, workingDirectory, imagePath });

    const toolCalls: ClaudeToolCall[] = [];

    async function* imagePrompt(): AsyncGenerator<SDKUserMessage> {
      yield {
        type: "user",
        message: {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/png",
                data: imageData,
              },
            },
            {
              type: "text",
              text: promptText,
            },
          ],
        },
        parent_tool_use_id: null,
      };
    }

    let result: SDKResultSuccess | undefined;

    for await (const msg of query({
      prompt: imagePrompt(),
      options: {
        model: this.model,
        systemPrompt: this.systemPrompt,
        cwd: workingDirectory,
        permissionMode: "bypassPermissions",
        maxTurns: 30,
        outputFormat: {
          type: "json_schema",
          schema: imageCodeMailerJsonSchema,
        },
      },
    })) {
      if (msg.type === "assistant" && "message" in msg) {
        for (const block of msg.message.content) {
          if (block.type === "tool_use") {
            toolCalls.push({
              backend: "claude",
              tool: block.name,
              input: (block.input ?? {}) as Record<string, unknown>,
            });
          }
        }
      }

      if (msg.type === "result" && msg.subtype === "success") {
        result = msg;
      }
    }

    if (!result) {
      throw new Error("Claude agent returned no result");
    }

    this.sessionId = result.session_id;

    const rawText = result.result;
    const data = result.structured_output
      ? imageCodeMailerOutputSchema.parse(result.structured_output)
      : imageCodeMailerOutputSchema.parse(toPlainObject(JSON.parse(rawText)));

    return {
      backend: "claude",
      sessionId: result.session_id,
      rawText,
      data,
      toolCalls,
      costUsd: result.total_cost_usd,
    };
  }

  async continue(
    sessionId: string,
    prompt: string,
  ): Promise<AgentStructuredResponse<ImageCodeMailerOutput>> {
    const toolCalls: ClaudeToolCall[] = [];
    let result: SDKResultSuccess | undefined;

    for await (const msg of query({
      prompt,
      options: {
        resume: sessionId,
        outputFormat: {
          type: "json_schema",
          schema: imageCodeMailerJsonSchema,
        },
      },
    })) {
      if (msg.type === "assistant" && "message" in msg) {
        for (const block of msg.message.content) {
          if (block.type === "tool_use") {
            toolCalls.push({
              backend: "claude",
              tool: block.name,
              input: (block.input ?? {}) as Record<string, unknown>,
            });
          }
        }
      }

      if (msg.type === "result" && msg.subtype === "success") {
        result = msg;
      }
    }

    if (!result) {
      throw new Error("Claude agent returned no result");
    }

    this.sessionId = result.session_id;

    const rawText = result.result;
    const data = result.structured_output
      ? imageCodeMailerOutputSchema.parse(result.structured_output)
      : imageCodeMailerOutputSchema.parse(toPlainObject(JSON.parse(rawText)));

    return {
      backend: "claude",
      sessionId: result.session_id,
      rawText,
      data,
      toolCalls,
      costUsd: result.total_cost_usd,
    };
  }

  private buildRunPrompt(input: ClaudeRunInput): string {
    const subject = input.subject ?? "Agent generated answer";

    return [
      "Analyze the attached image and follow the system instructions to produce the answer, then email the result.",
      `Working directory: ${input.workingDirectory}`,
      "Recipient email: send the email to the currently authenticated Gmail account itself.",
      `Email subject: ${subject}`,
      `Request: ${input.prompt}`,
      "The final response must be valid JSON that matches the provided schema exactly.",
    ].join("\n\n");
  }
}
