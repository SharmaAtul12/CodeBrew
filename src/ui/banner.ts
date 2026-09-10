import chalk from "chalk";
import boxen from "boxen";
import figlet from "figlet";

export function printBanner() {
  const title = figlet.textSync("claude-cli", {font: "Standard"});

  const panel = boxen(
    chalk.cyan("Learn the Claude Agent SDK with this CLI tool\n") + chalk.dim("Full Production Ready CLI Tool for Claude AI"),
    {padding: 1, borderColor: "cyan"}
  );

  console.log(title);
  console.log(panel);
}