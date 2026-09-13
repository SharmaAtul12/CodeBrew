import chalk from "chalk";
import boxen from "boxen";
import figlet from "figlet";
import stringWidth from "string-width";

const ACCENT = "#d97757";
const CREAM = "#f5efe0";

type Feature = { icon: string; color: string; title: string; sub: string };

// U+FE0E (text variation selector) forces terminals to render these symbols
// in their narrow, text form (1 column) rather than a wide emoji form. This
// keeps the on-screen width in sync with what `string-width` measures, so the
// feature columns line up regardless of terminal font.
const TEXT_VS = "\uFE0E";

const FEATURES: Feature[] = [
  { icon: `✦${TEXT_VS}`, color: "#7ee787", title: "Build", sub: "Faster" },
  { icon: `▤${TEXT_VS}`, color: "#79c0ff", title: "Understand", sub: "Your code" },
  { icon: `⏣${TEXT_VS}`, color: "#d2a8ff", title: "Automate", sub: "Repetitive work" },
  { icon: `⧉${TEXT_VS}`, color: "#ff7b9c", title: "Collaborate", sub: "With AI" },
];

// Larger coffee cup with rising steam + a code glyph on the mug, sized to sit
// beside the figlet wordmark (same 6-row height as the "Standard" font).
const CUP_ART = [
  "   ) ) )    ",
  "  ( ( (     ",
  " .-------.  ",
  " |  </>  |__ ",
  " |       |  )",
  " '-------'-' ",
];

/** Visual column width of a string, accounting for ANSI codes and wide/emoji glyphs. */
function visibleWidth(text: string): number {
  return stringWidth(text);
}

function padEndVisible(text: string, width: number): string {
  return text + " ".repeat(Math.max(0, width - visibleWidth(text)));
}

function center(text: string, width: number): string {
  const total = Math.max(0, width - visibleWidth(text));
  const left = Math.floor(total / 2);
  return " ".repeat(left) + text + " ".repeat(total - left);
}

/** Lay several multi-line blocks out side-by-side, top-aligned. */
function joinRows(blocks: string[], gap: number): { text: string; width: number } {
  const grids = blocks.map((b) => b.split("\n"));
  const height = Math.max(...grids.map((g) => g.length));
  const widths = grids.map((g) => Math.max(...g.map((l) => visibleWidth(l))));
  const spacer = " ".repeat(gap);

  const rows: string[] = [];
  for (let row = 0; row < height; row++) {
    rows.push(grids.map((g, i) => padEndVisible(g[row] ?? "", widths[i]!)).join(spacer));
  }
  return {
    text: rows.join("\n"),
    width: widths.reduce((a, b) => a + b, 0) + gap * (blocks.length - 1),
  };
}

// Each cell's badge is "[ x ] " — a space on both sides of the icon so it
// sits clearly inside the brackets without touching them. That prefix is a
// fixed 6 columns, and the subtitle is indented to match, so the two rows
// stay aligned even if a terminal renders the icon slightly wider than
// measured.
const ICON_PREFIX_COLS = 6; // "[ x ] "

type Cell = {
  top: string;
  bottom: string;
  /** Logical visible width of the top line (prefix + title), ignoring icon quirks. */
  topWidth: number;
  bottomWidth: number;
  width: number;
};

function featureCell(f: Feature): Cell {
  const bracket = chalk.hex(f.color);
  const badge = `${bracket("[")} ${bracket.bold(f.icon)} ${bracket("]")} `;
  const top = `${badge}${chalk.bold(f.title)}`;
  const bottom = `${" ".repeat(ICON_PREFIX_COLS)}${chalk.dim(f.sub)}`;
  // Compute widths from the logical prefix (6 cols) + text, not the raw icon,
  // so a wide-rendering icon doesn't throw the column math off.
  const topWidth = ICON_PREFIX_COLS + visibleWidth(chalk.bold(f.title));
  const bottomWidth = visibleWidth(bottom);
  return { top, bottom, topWidth, bottomWidth, width: Math.max(topWidth, bottomWidth) };
}

/** Pad a cell's top/bottom lines to a target column width using logical widths. */
function padCellTop(cell: Cell, width: number): string {
  return cell.top + " ".repeat(Math.max(0, width - cell.topWidth));
}
function padCellBottom(cell: Cell, width: number): string {
  return cell.bottom + " ".repeat(Math.max(0, width - cell.bottomWidth));
}

/** Build the wordmark ("Code" cream + "Brew" accent) and, space permitting, the cup art beside it. */
function buildHero(innerBudget: number): { text: string; width: number } {
  const codeLines = figlet.textSync("Code", { font: "Standard" }).split("\n");
  const brewLines = figlet.textSync("Brew", { font: "Standard" }).split("\n");
  const titleLines = codeLines.map(
    (line, i) => chalk.hex(CREAM)(line) + chalk.hex(ACCENT).bold(brewLines[i] ?? ""),
  );
  const title = titleLines.join("\n");
  const titleWidth = visibleWidth(codeLines[0] ?? "") + visibleWidth(brewLines[0] ?? "");

  const cup = CUP_ART.map((l) => chalk.hex(ACCENT).bold(l));
  const cupWidth = Math.max(...cup.map((l) => visibleWidth(l)));
  const gap = 7;

  if (innerBudget >= titleWidth + gap + cupWidth) {
    return joinRows([title, cup.join("\n")], gap);
  }
  // Not enough room for the wider gap — fall back to a smaller gap before
  // dropping the cup entirely, so mid-width terminals still show it.
  const tightGap = 3;
  if (innerBudget >= titleWidth + tightGap + cupWidth) {
    return joinRows([title, cup.join("\n")], tightGap);
  }
  return { text: title, width: titleWidth };
}

/** Build the feature strip: one row if it fits, otherwise a 2x2 grid. */
function buildFeatures(availableWidth: number): { text: string; width: number } {
  const cells = FEATURES.map(featureCell);
  const sep = "   ";
  const oneRowWidth = cells.reduce((a, c) => a + c.width, 0) + sep.length * (cells.length - 1);

  if (oneRowWidth <= availableWidth) {
    const width = Math.max(availableWidth, oneRowWidth);
    const top = cells.map((c) => padCellTop(c, c.width)).join(sep);
    const bottom = cells.map((c) => padCellBottom(c, c.width)).join(sep);
    return { text: `${center(top, width)}\n${center(bottom, width)}`, width };
  }

  // Narrow terminal: fall back to a 2x2 grid.
  const colWidth = Math.max(...cells.map((c) => c.width));
  const width = colWidth * 2 + sep.length;
  const lines: string[] = [];
  for (let i = 0; i < cells.length; i += 2) {
    const pair = cells.slice(i, i + 2);
    lines.push(pair.map((c) => padCellTop(c, colWidth)).join(sep));
    lines.push(pair.map((c) => padCellBottom(c, colWidth)).join(sep));
  }
  return { text: lines.map((l) => center(l, width)).join("\n"), width };
}

/**
 * Prints the CodeBrew welcome banner: a two-tone wordmark with a coffee-cup
 * glyph, a tagline, a feature strip, and a closing motto — all inside a
 * rounded accent-colored box that adapts to the current terminal width.
 */
export function printBanner(): void {
  const cols = process.stdout.columns || 80;
  const boxWidth = Math.min(cols - 2, 108);
  const innerBudget = boxWidth - 4; // minus boxen's 1-col padding on each side

  const hero = buildHero(innerBudget);
  const features = buildFeatures(Math.max(hero.width, innerBudget));
  const contentWidth = Math.max(hero.width, features.width);

  const taglineText = `${chalk.hex(ACCENT).bold("Brew")} ${chalk.whiteBright("your code with AI.")}`;
  const dashLen = Math.max(3, Math.floor((contentWidth - visibleWidth(taglineText) - 2) / 2));
  const dash = chalk.dim("─".repeat(dashLen));
  const taglineRow = center(`${dash} ${taglineText} ${dash}`, contentWidth);

  const subtitle = center(
    chalk.dim("Your AI-powered coding companion in the terminal."),
    contentWidth,
  );

  const footer = center(
    chalk.dim("—  Good Code   •   Better Ideas   •   Together  —"),
    contentWidth,
  );

  const body = [
    hero.text,
    "",
    taglineRow,
    subtitle,
    "",
    features.text,
    "",
    footer,
  ].join("\n");

  console.log(
    boxen(body, {
      padding: 1,
      borderStyle: "round",
      borderColor: ACCENT,
    }),
  );
}
