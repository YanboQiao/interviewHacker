import type { McpToolCallItem, ThreadItem } from "@openai/codex-sdk";

export interface AgentToolCall {
  server: string;
  tool: string;
  status: McpToolCallItem["status"];
  errorMessage: string | null;
}

export interface AgentStructuredResponse<T> {
  threadId: string;
  rawText: string;
  data: T;
  toolCalls: AgentToolCall[];
}

export function extractToolCalls(items: ThreadItem[]): AgentToolCall[] {
  return items
    .filter((item): item is McpToolCallItem => item.type === "mcp_tool_call")
    .map((item) => ({
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
