import {Command} from "commander";
import { printBanner } from "./ui/banner.js";
import { checkEnvironment, requireApiKey } from "./config/env.js";
import { runQuery } from "./agents/run-query.js";
import { CliMode, parseCliMode } from "./agents/modes.js";
import { startChat } from "./commands/chat.js";
import { wakeUp } from "./commands/wake-up.js";

function parseMode(value: string): CliMode {
    const mode = parseCliMode(value);
    if (!mode) {
      throw new Error(`Invalid mode "${value}". Use agent, ask, or plan.`);
    }
    return mode;
  }

export function createCli() {

  const program = new Command()
    .name("codebrew")
    .description("CodeBrew — brew your code with AI")
    .version("1.0.0");

  program
    .command("hello")
    .description("Show the welcome banner")
    .action(() => {
      printBanner();
    });

  program
    .command("wakeup")
    .description("Banner, preflight, mode picker, then chat")
    .action(async () => {
      await wakeUp();
    });

  program
      .command("chat")
      .description("Interactive streaming chat session")
      .option("-m, --mode <mode>", "agent | ask | plan", "agent")
      .option("-v, --verbose", "Show agent loop message types", false)
      .action(async (opts: { mode: string; verbose: boolean }) => {
        requireApiKey();
        await startChat({ mode: parseMode(opts.mode), verbose: opts.verbose });
    });

  program
    .command("doctor")
    .description("Check the environment")
    .action(() => {
      checkEnvironment();
    });

  program
    .command("talk")
    .description("Talk to CodeBrew")
    .argument("<prompt>", "The prompt to send to CodeBrew")
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