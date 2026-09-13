import chalk from "chalk";

/**
 * Central styling palette. Everything visual routes through here so the whole
 * CLI shares one consistent look. Purely presentational — no behavior.
 */
export const fmt = {
  system: (text: string) => chalk.gray(text),
  assistant: (text: string) => chalk.cyanBright(text),
  tool: (text: string) => chalk.yellow(text),
  toolResult: (text: string) => chalk.dim.green(text),
  success: (text: string) => chalk.green(text),
  error: (text: string) => chalk.red(text),
  dim: (text: string) => chalk.dim(text),
  label: (text: string) => chalk.bold.white(text),
  mode: (text: string) => chalk.magenta(text),
  accent: (text: string) => chalk.hex("#d97757")(text),
  muted: (text: string) => chalk.hex("#8a8a8a")(text),
  heading: (text: string) => chalk.bold.hex("#d97757")(text),
  key: (text: string) => chalk.cyanBright.bold(text),
};

/** Common glyphs used across the UI. */
export const glyph = {
  prompt: "❯",
  bullet: "•",
  arrowRight: "→",
  arrowLeft: "←",
  spark: "✳",
  check: "✔",
  cross: "✖",
  dot: "·",
};

/** A soft accent-colored badge, e.g. a mode indicator. */
export function badge(text: string): string {
  return chalk.bgHex("#d97757").hex("#1e1e1e").bold(` ${text} `);
}

/** A full-width horizontal rule sized to the current terminal. */
export function divider(char = "─"): string {
  const width = Math.min(process.stdout.columns || 80, 80);
  return chalk.hex("#3a3a3a")(char.repeat(width));
}

export function truncate(text: string, max = 200): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}
