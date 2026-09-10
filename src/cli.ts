import {Command} from "commander";
import { printBanner } from "./ui/banner.js";
import { checkEnvironment, requireApiKey } from "./config/env.js";
import { runQuery } from "./agents/run-query.js";
import { CliMode, parseCliMode } from "./agents/modes.js";

function parseMode(value: string): CliMode {
    const mode = parseCliMode(value);
    if (!mode) {
      throw new Error(`Invalid mode "${value}". Use agent, ask, or plan.`);
    }
    return mode;
  }

export function createCli() {

  const program = new Command()
    .name("claude-cli")
    .description("A CLI tool for interacting with Claude AI")
    .version("1.0.0");

  program
    .command("hello")
    .description("A simple hello command")
    .action(() => {
      console.log("Hello, World!");
    });

  program
    .command("banner")
    .description("Show the Welcome Banner")
    .action(() => {
      printBanner();
    })

  program
    .command("doctor")
    .description("Check the environment")
    .action(() => {
      checkEnvironment();
    });

  program
    .command("wakeup")
    .description("Show the Welcome Banner")
    .argument("<prompt>", "The prompt to send to Claude AI")
    .option("-m, --mode <mode>", "The mode to run the query in (agent, ask, plan)", "agent")
    .option("-v, --verbose", "Enable verbose output", false)
    .action(async (prompt: string, options: { mode : string; verbose : boolean }) => {
      requireApiKey();
      await runQuery(prompt, { mode: parseMode(options.mode) , verbose: options.verbose });
    })

  program
    .command("talk")
    .description("Talk to Claude AI")
    .argument("<prompt>", "The prompt to send to Claude AI")
    .option("-v, --verbose", "Enable verbose output")
    .action(async (prompt: string, options: { verbose?: boolean }) => {
      requireApiKey();
      await runQuery(prompt, { verbose: options.verbose });
    });

  program.action(() => {
    program.help();
  })

  return program;
}