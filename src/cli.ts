import {Command} from "commander";
import { printBanner } from "./ui/banner.js";
import { checkEnvironment, requireApiKey } from "./config/env.js";
import { runQuery } from "./agents/run-query.js";

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