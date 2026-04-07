import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { Codex, type ApprovalMode, type ModelReasoningEffort, type SandboxMode, type Thread, type ThreadOptions } from "@openai/codex-sdk";

import { getInstructions } from "../instructions/index.js";
import {
  imageCodeMailerJsonSchema,
  imageCodeMailerOutputSchema,
  type ImageCodeMailerOutput,
} from "../schemas/image-code-mailer.js";
import {
  extractCodexToolCalls,
  toPlainObject,
  type AgentMode,
  type AgentStructuredResponse,
} from "../utils/response.js";

interface ImageCodeMailerAgentOptions {
  profile?: string;
  model?: string;
  mode?: AgentMode;
  modelReasoningEffort?: ModelReasoningEffort;
  sandboxMode?: SandboxMode;
  approvalPolicy?: ApprovalMode;
}

export interface ImageCodeMailerRunInput {
  workingDirectory: string;
  imagePath: string;
  prompt: string;
  subject?: string;
}

export class ImageCodeMailerAgent {
  private codex: Codex | null = null;
  private thread: Thread | null = null;
  private threadId: string | null = null;
  private threadOptions: ThreadOptions | undefined;
  private readonly profile?: string;
  private readonly model?: string;
  private readonly modelReasoningEffort?: ModelReasoningEffort;
  private readonly sandboxMode?: SandboxMode;
  private readonly approvalPolicy?: ApprovalMode;
  private readonly developerInstructions: string;

  constructor(options: ImageCodeMailerAgentOptions = {}) {
    this.profile = options.profile;
    this.model = options.model;
    this.modelReasoningEffort = options.modelReasoningEffort;
    this.sandboxMode = "danger-full-access";
    this.approvalPolicy = "never";
    this.developerInstructions = getInstructions(options.mode ?? "code");
  }

  async run(input: ImageCodeMailerRunInput): Promise<AgentStructuredResponse<ImageCodeMailerOutput>> {
    const workingDirectory = resolve(input.workingDirectory);
    const imagePath = resolve(input.imagePath);

    if (!existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    this.codex = this.createCodex();
    this.threadOptions = {
      workingDirectory,
      skipGitRepoCheck: true,
      model: this.model,
      modelReasoningEffort: this.modelReasoningEffort,
      sandboxMode: this.sandboxMode,
      approvalPolicy: this.approvalPolicy,
    };
    this.thread = this.codex.startThread(this.threadOptions);

    const turn = await this.thread.run(
      [
        {
          type: "text",
          text: this.buildRunPrompt({
            ...input,
            workingDirectory,
            imagePath,
          }),
        },
        {
          type: "local_image",
          path: imagePath,
        },
      ],
      { outputSchema: imageCodeMailerJsonSchema },
    );

    return this.toResponse(turn.finalResponse, turn.items);
  }

  async continue(
    threadId: string,
    prompt: string,
  ): Promise<AgentStructuredResponse<ImageCodeMailerOutput>> {
    this.codex ??= this.createCodex();

    if (!this.thread || this.threadId !== threadId) {
      this.thread = this.codex.resumeThread(threadId, this.threadOptions);
      this.threadId = threadId;
    }

    const turn = await this.thread.run(prompt, { outputSchema: imageCodeMailerJsonSchema });
    return this.toResponse(turn.finalResponse, turn.items);
  }

  private createCodex(): Codex {
    if (this.profile) {
      throw new Error(
        "The current @openai/codex-sdk does not expose the Codex CLI --profile flag. Set defaults in ~/.codex/config.toml or pass explicit agent options instead.",
      );
    }

    return new Codex({
      config: {
        developer_instructions: this.developerInstructions,
      },
    });
  }

  private buildRunPrompt(input: ImageCodeMailerRunInput): string {
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

  private toResponse(
    rawText: string,
    items: Parameters<typeof extractCodexToolCalls>[0],
  ): AgentStructuredResponse<ImageCodeMailerOutput> {
    if (!this.thread?.id) {
      throw new Error("No active thread id");
    }

    this.threadId = this.thread.id;

    const payload = toPlainObject(JSON.parse(rawText));

    return {
      backend: "codex",
      sessionId: this.threadId,
      rawText,
      data: imageCodeMailerOutputSchema.parse(payload),
      toolCalls: extractCodexToolCalls(items),
    };
  }
}
