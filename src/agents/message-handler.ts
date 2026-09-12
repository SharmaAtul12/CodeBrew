import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { fmt, truncate } from "../ui/format.js";
import { startSpinner, stopSpinner } from "../ui/spinner.js";

export type MessageHandlerOptions = {
  verbose?: boolean;
  /**
   * When true (default), the handler restarts the "Thinking…" spinner after
   * every non-result message. Interactive callers (chat REPL) set this to
   * false so they can own the spinner via their turn gate — otherwise stray
   * system messages (e.g. from setPermissionMode) would spin the spinner
   * while the input prompt is waiting.
   */
  manageSpinner?: boolean;
  /**
   * Interactive chat mode. When true, the handler:
   *  - skips the per-turn "Session started" (system:init) line, since a
   *    streaming session re-emits it every turn and the chat prints its own
   *    banner once at startup.
   *  - skips re-printing message.result at the end of a turn, because the
   *    assistant text has already been streamed live. Only the summary
   *    (turns · cost) is shown.
   */
  interactive?: boolean;
};

function contentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return String(content ?? "");

  return content
    .map((block) => {
      if (typeof block !== "object" || block === null) return "";
      const b = block as Record<string, unknown>;
      if (b.type === "text" && typeof b.text === "string") return b.text;
      if (b.type === "tool_use" && typeof b.name === "string")
        return `[tool: ${b.name}]`;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function extractToolNames(content: unknown): string[] {
  if (!Array.isArray(content)) return [];
  return content
    .filter(
      (block): block is { type: "tool_use"; name: string } =>
        typeof block === "object" &&
        block !== null &&
        (block as { type?: string }).type === "tool_use" &&
        typeof (block as { name?: string }).name === "string",
    )
    .map((block) => block.name);
}

export function handleMessage(
  message: SDKMessage,
  options: MessageHandlerOptions = {},
) {
  const { verbose = false, manageSpinner = true, interactive = false } = options;

  stopSpinner();

  // Collect output lines first, then print. This lets us show the verbose
  // [type] tag only when a message actually renders something, avoiding the
  // pile-up of bare [system] / [assistant] tags during long agent turns.
  const lines: string[] = [];

  switch (message.type) {
    case "system": {
      if (message.subtype === "init") {
        if (!interactive) {
          lines.push(
            fmt.system(
              `Session started · model: ${message.model} · id: ${message.session_id.slice(0, 8)}…`,
            ),
          );
        }
      } else if (message.subtype === "compact_boundary") {
        lines.push(fmt.system("Context compacted — older history summarized"));
      }
      break;
    }

    case "assistant": {
      const content = message.message.content;
      const text = contentToString(content);
      const tools = extractToolNames(content);

      if (text.trim()) {
        lines.push(fmt.assistant(text.trim()));
      }

      for (const tool of tools) {
        lines.push(fmt.tool(`  → ${tool}`));
      }
      break;
    }

    case "user": {
      if (message.parent_tool_use_id) {
        const result = contentToString(message.message.content);
        if (result.trim()) {
          lines.push(fmt.toolResult(`  ← ${truncate(result.trim(), 120)}`));
        }
      }
      break;
    }

    case "stream_event": {
      // Streaming deltas are intentionally silent; too noisy to render.
      break;
    }

    case "result": {
      if (message.subtype === "success") {
        if (!interactive && message.result?.trim()) {
          lines.push(fmt.success("\n" + message.result.trim()));
        }
        lines.push(
          fmt.dim(
            `Done · ${message.num_turns} turns · $${message.total_cost_usd.toFixed(4)}`,
          ),
        );
      } else {
        lines.push(fmt.error(`Stopped: ${message.subtype}`));
        lines.push(
          fmt.dim(
            `${message.num_turns} turns · $${message.total_cost_usd.toFixed(4)}`,
          ),
        );
      }
      break;
    }

    default:
      break;
  }

  // Only emit the verbose tag when the message produced visible output.
  if (lines.length > 0) {
    if (verbose) {
      console.log(fmt.dim(`[${message.type}]`));
    }
    for (const line of lines) {
      console.log(line);
    }
  }

  if (manageSpinner && message.type !== "result") {
    startSpinner("Thinking…");
  }
}
