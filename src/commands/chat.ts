import { input } from "@inquirer/prompts";
import type { Query } from "@anthropic-ai/claude-agent-sdk";
import { createSession } from "../agents/create-session.js";
import { handleMessage } from "../agents/message-handler.js";
import {
  cliModeToPermissionMode,
  parseCliMode,
  type CliMode,
} from "../agents/modes.js";
import { SLASH_COMMANDS } from "../config/constants.js";
import { fmt } from "../ui/format.js";
import { startSpinner, stopSpinner } from "../ui/spinner.js";

export type ChatOptions = {
  mode?: CliMode;
  verbose?: boolean;
};

function printSlashHelp(): void {
  console.log(fmt.label("\nSlash commands:"));
  for (const { command, description } of SLASH_COMMANDS) {
    console.log(fmt.dim(`  ${command.padEnd(22)} ${description}`));
  }
  console.log();
}

async function handleSlashCommand(
  line: string,
  session: { query: Query; mode: CliMode },
  verbose: boolean
): Promise<{ handled: boolean; newMode?: CliMode }> {
  const trimmed = line.trim();

  if (trimmed === "/help") {
    printSlashHelp();
    return { handled: true };
  }

  if (trimmed === "/exit") {
    return { handled: true };
  }

  if (trimmed === "/context") {
    try {
      const usage = await session.query.getContextUsage();
      console.log(fmt.system(JSON.stringify(usage, null, 2)));
    } catch {
      console.log(fmt.error("Context usage not available for this session."));
    }
    return { handled: true };
  }

  if (trimmed.startsWith("/mode")) {
    const parts = trimmed.split(/\s+/);
    const modeArg = parts[1];
    if (!modeArg) {
      console.log(fmt.error("Usage: /mode agent|ask|plan"));
      return { handled: true };
    }

    const newMode = parseCliMode(modeArg);
    if (!newMode) {
      console.log(fmt.error(`Unknown mode: ${modeArg}`));
      return { handled: true };
    }

    await session.query.setPermissionMode(cliModeToPermissionMode(newMode));
    session.mode = newMode;
    console.log(fmt.mode(`Mode switched to ${newMode}`));
    if (verbose) {
      console.log(fmt.dim(`permissionMode → ${cliModeToPermissionMode(newMode)}`));
    }
    return { handled: true, newMode };
  }

  // Any other slash-prefixed input is an unknown local command. Reject it here
  // so it is never forwarded to the SDK (which would try to run it as one of
  // Claude Code's own built-in slash commands).
  if (trimmed.startsWith("/")) {
    console.log(fmt.error(`Unknown command: ${trimmed.split(/\s+/)[0]}`));
    printSlashHelp();
    return { handled: true };
  }

  return { handled: false };
}

function createTurnGate() {
  let pending: Promise<void> | null = null;
  let resolvePending: (() => void) | null = null;

  return {
    begin(): void {
      if (pending) return;
      pending = new Promise<void>((resolve) => {
        resolvePending = resolve;
      });
    },
    finish(): void {
      resolvePending?.();
      resolvePending = null;
      pending = null;
    },
    async wait(): Promise<void> {
      if (pending) await pending;
    },
    isActive(): boolean {
      return pending !== null;
    },
  };
}

export async function startChat(options: ChatOptions = {}): Promise<void> {
  const { mode: initialMode = "agent", verbose = false } = options;
  const session = createSession(initialMode);
  const turnGate = createTurnGate();

  console.log(fmt.mode(`Chat started in ${initialMode} mode`));
  console.log(fmt.dim("Type /help for commands, /exit to quit.\n"));
  printSlashHelp();

  const processing = (async () => {
    try {
      for await (const message of session.query) {
        // Ignore control/system chatter that arrives outside an active turn
        // (session init, post-/mode-switch acknowledgements). Rendering it
        // here would corrupt the input prompt that's currently waiting.
        if (!turnGate.isActive() && message.type === "system") {
          continue;
        }

        handleMessage(message, { verbose, manageSpinner: false, interactive: true });
        if (message.type === "result") {
          stopSpinner();
          turnGate.finish();
        } else if (turnGate.isActive()) {
          // Keep the spinner alive between streamed messages, but only while a
          // real turn is in flight. Stray messages (e.g. from a mode switch)
          // arrive with no active turn and must not start the spinner.
          startSpinner("Agent working…");
        }
      }
    } catch (error) {
      stopSpinner();
      turnGate.finish();
      console.error(
        fmt.error(`Session error: ${error instanceof Error ? error.message : error}`)
      );
    }
  })();

  let running = true;

  while (running) {
    await turnGate.wait();
    stopSpinner();

    const line = await input({ message: fmt.label("You:") });
    const trimmed = line.trim();

    if (!trimmed) continue;

    if (trimmed === "/exit") {
      running = false;
      break;
    }

    const slash = await handleSlashCommand(trimmed, session, verbose);
    if (slash.handled) {
      if (slash.newMode) session.mode = slash.newMode;
      continue;
    }

    turnGate.begin();
    startSpinner("Agent working…");
    session.inputQueue.push(trimmed);
  }

  session.inputQueue.close();
  session.query.close();
  await processing;
  stopSpinner();
  console.log(fmt.dim("Session ended."));
}