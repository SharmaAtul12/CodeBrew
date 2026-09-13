import { select } from "@inquirer/prompts";
import boxen from "boxen";
import chalk from "chalk";
import { startChat } from "./chat.js";
import { checkEnvironment } from "../config/env.js";
import { CLI_MODES, MODE_DESCRIPTIONS } from "../config/constants.js";
import { printBanner } from "../ui/banner.js";
import { fmt, glyph, divider } from "../ui/format.js";
import type { CliMode } from "../agents/modes.js";

const ACCENT = "#d97757";

/** Per-mode visuals: a glyph, an accent color, and a short tagline. */
const MODE_META: Record<CliMode, { glyph: string; color: string; tag: string }> = {
  agent: { glyph: "◆", color: "#7ee787", tag: "full tool loop" },
  ask: { glyph: "◇", color: "#79c0ff", tag: "read-only" },
  plan: { glyph: "◈", color: "#e3b341", tag: "propose a plan" },
};

async function runDoctor(): Promise<void> {
  await checkEnvironment();
}

/** Strip ANSI escape codes so we can measure visible column width. */
function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

/** Word-wrap plain text to a given width. */
function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= width) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Place several multi-line blocks next to each other, top-aligned. */
function joinHorizontal(blocks: string[], gap = 2): string {
  const grids = blocks.map((b) => b.split("\n"));
  const height = Math.max(...grids.map((g) => g.length));
  const widths = grids.map((g) => Math.max(...g.map((l) => stripAnsi(l).length)));
  const spacer = " ".repeat(gap);

  const out: string[] = [];
  for (let row = 0; row < height; row++) {
    const cells = grids.map((g, i) => {
      const cell = g[row] ?? "";
      const pad = widths[i]! - stripAnsi(cell).length;
      return cell + " ".repeat(Math.max(0, pad));
    });
    out.push(cells.join(spacer));
  }
  return out.join("\n");
}

/** Build a single mode card. */
function modeCard(mode: CliMode, width: number): string {
  const meta = MODE_META[mode];
  const innerWidth = width - 4; // account for border + horizontal padding
  const title = chalk.hex(meta.color).bold(`${meta.glyph}  ${mode.toUpperCase()}`);
  const body = wrap(MODE_DESCRIPTIONS[mode], innerWidth)
    .map((l) => fmt.muted(l))
    .join("\n");

  return boxen(`${title}\n\n${body}`, {
    width,
    padding: { top: 0, bottom: 0, left: 1, right: 1 },
    borderStyle: "round",
    borderColor: meta.color,
  });
}

/** Render the three mode cards side-by-side, or stacked on narrow terminals. */
function printModeCards(): void {
  const cols = process.stdout.columns || 80;
  const gap = 2;

  if (cols >= 96) {
    const cardWidth = Math.min(34, Math.floor((cols - gap * 2) / 3));
    const cards = CLI_MODES.map((m) => modeCard(m, cardWidth));
    console.log(joinHorizontal(cards, gap));
  } else {
    for (const m of CLI_MODES) {
      console.log(modeCard(m, Math.min(cols - 2, 40)));
    }
  }
}

function sectionHeading(text: string): void {
  console.log(fmt.heading(`${glyph.spark} ${text}`));
}

export async function wakeUp(): Promise<void> {
  console.clear();
  printBanner();
  console.log();

  sectionHeading("Preflight");
  try {
    await runDoctor();
  } catch (error) {
    console.error(
      `  ${fmt.error(glyph.cross)}  ${fmt.error(error instanceof Error ? error.message : String(error))}`,
    );
    process.exit(1);
  }

  console.log();
  console.log(divider());
  console.log();

  sectionHeading("Choose your mode");
  console.log(
    fmt.muted(`  Use ${fmt.key("↑ ↓")} to navigate ${glyph.dot} ${fmt.key("Enter")} to launch`),
  );
  console.log();
  printModeCards();
  console.log();

  const mode = await select<CliMode>({
    message: "Start session in",
    choices: CLI_MODES.map((value) => {
      const meta = MODE_META[value];
      return {
        name: `${chalk.hex(meta.color)(meta.glyph)}  ${chalk.bold(value.padEnd(6))} ${fmt.muted(meta.tag)}`,
        value,
        description: `  ${MODE_DESCRIPTIONS[value]}`,
      };
    }),
    default: "agent",
    theme: {
      prefix: chalk.hex(ACCENT)(glyph.spark),
      icon: { cursor: chalk.hex(ACCENT).bold(glyph.prompt) },
      style: {
        message: (text: string) => chalk.bold.white(text),
        highlight: (text: string) => chalk.hex(ACCENT).bold(text),
        description: (text: string) => fmt.muted(text),
      },
    },
  });

  const meta = MODE_META[mode];
  console.log();
  console.log(
    `${chalk.hex(meta.color)(glyph.check)} Launching ${chalk.hex(meta.color).bold(mode)} mode ${fmt.muted(glyph.dot)} ${fmt.muted(MODE_DESCRIPTIONS[mode])}`,
  );
  console.log();

  await startChat({ mode });
}
