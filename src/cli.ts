import {Command} from "commander";

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

  program.action(() => {
    program.help();
  })

  return program;
}