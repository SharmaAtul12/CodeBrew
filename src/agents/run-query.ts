import "dotenv/config";
import {query} from "@anthropic-ai/claude-agent-sdk";
import chalk from "chalk";
import { handleMessage, MessageHandlerOptions } from "./message-handler.js";
import { buildModeOptions, CliMode } from "./modes.js";
import { startSpinner, stopSpinner } from "../ui/spinner.js";

export type RunQueryOptions = {
  mode?: CliMode;
  verbose?: boolean;
}

export async function runQuery(prompt: string, options: RunQueryOptions = {}) {
  try {
    const { mode = "agent", verbose = false } = options;

    startSpinner("Thinking…");

    for await (const message of query({
      prompt,
      options: buildModeOptions(mode)
    }))

    {
      handleMessage(message, { verbose });
    }

  } catch (error) {
    stopSpinner();
    console.log(chalk.red("Error running query:"), error);
  }
}