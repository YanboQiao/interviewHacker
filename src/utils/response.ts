import type { McpToolCallItem, ThreadItem } from "@openai/codex-sdk";

export type AgentMode = "code" | "default" | "personality";
export type AgentBackend = "codex" | "claude" | "all";

export interface CodexToolCall {
  backend: "codex";
  server: string;
  tool: string;
  status: McpToolCallItem["status"];
  errorMessage: string | null;
}

export interface ClaudeToolCall {
  backend: "claude";
  tool: string;
  input: Record<string, unknown>;
}

export type AgentToolCall = CodexToolCall | ClaudeToolCall;

export interface AgentStructuredResponse<T> {
  backend: AgentBackend;
  sessionId: string;
  rawText: string;
  data: T;
  toolCalls: AgentToolCall[];
  costUsd?: number;
}

export function extractCodexToolCalls(items: ThreadItem[]): CodexToolCall[] {
  return items
    .filter((item): item is McpToolCallItem => item.type === "mcp_tool_call")
    .map((item) => ({
      backend: "codex" as const,
      server: item.server,
      tool: item.tool,
      status: item.status,
      errorMessage: item.error?.message ?? null,
    }));
}

export function toPlainObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected a plain object response");
  }

  return Object.fromEntries(Object.entries(value));
}
