import {
  createPrompt,
  useState,
  useRef,
  useKeypress,
  isEnterKey,
  isBackspaceKey,
} from "@inquirer/core";
import type { InquirerReadline } from "@inquirer/type";
import { cursorHide } from "@inquirer/ansi";
import chalk from "chalk";
import { fmt, glyph } from "./format.js";

const ACCENT = "#d97757";

// Plain-text widths of the input-line prefixes, used for layout math (the
// colored versions carry ANSI codes we must not count).
const FIRST_PREFIX = ` ${glyph.prompt} `; // e.g. " ❯ "
const CONT_INDENT = " ".repeat(FIRST_PREFIX.length); // continuation alignment

/** Inner width of the box (space between the left and right borders). */
function boxInnerWidth(): number {
  return Math.min((process.stdout.columns || 80) - 1, 100) - 2;
}

type WrapRow = { seg: string; start: number };

/**
 * Wrap `text` into rows no wider than `width`, preserving every character so
 * the concatenation of all `seg`s equals `text` exactly. `start` is each row's
 * offset into `text`, which lets us map a caret index to a (row, col). Long
 * unbroken tokens are hard-split so a giant word still stays inside the box.
 */
function wrapWithOffsets(text: string, width: number): WrapRow[] {
  if (width <= 0) return [{ seg: text, start: 0 }];

  const rows: WrapRow[] = [];
  let current = "";
  let start = 0;
  let consumed = 0;

  const push = () => {
    rows.push({ seg: current, start });
    consumed += current.length;
    start = consumed;
    current = "";
  };

  const tokens = text.match(/\s+|\S+/g) ?? [];

  for (const token of tokens) {
    if (token.length > width) {
      if (current) push();
      let rest = token;
      while (rest.length > width) {
        current = rest.slice(0, width);
        push();
        rest = rest.slice(width);
      }
      current = rest;
      continue;
    }

    if (current.length + token.length > width) {
      push();
      current = token;
    } else {
      current += token;
    }
  }

  push();
  return rows;
}

/** Locate the caret's (row, col) within the wrapped rows. */
function locateCaret(rows: WrapRow[], caret: number): { row: number; col: number } {
  for (let i = 0; i < rows.length; i++) {
    const { seg, start } = rows[i]!;
    // Prefer the next row when the caret sits exactly on a wrap boundary, so it
    // shows at the start of the following line rather than dangling off the end.
    if (caret < start + seg.length) {
      return { row: i, col: caret - start };
    }
  }
  const last = rows.length - 1;
  return { row: last, col: rows[last]!.seg.length };
}

type BoxedInputConfig = {
  mode: string;
};

/**
 * A custom prompt that renders a full bordered box around the live input
 * (Claude Code style) with responsive wrapping: text that reaches the box
 * width continues on the next framed line.
 *
 * We manage the text buffer and caret ourselves (readline's own cursor model
 * can't track a box-wrapped, indented layout), hide the real terminal cursor,
 * and draw a synthetic caret block. readline's line is kept empty so inquirer's
 * screen manager measures our content consistently. Purely presentational.
 */
const boxedPrompt = createPrompt<string, BoxedInputConfig>((config, done) => {
  const [value, setValue] = useState("");
  const [caret, setCaret] = useState(0);
  const submitting = useRef(false);

  useKeypress((key, rl: InquirerReadline) => {
    // Read whatever readline buffered this keystroke (the actual typed
    // characters, with correct case/symbols), then clear it so readline never
    // accumulates a line of its own.
    const typed = rl.line;
    rl.line = "";
    (rl as unknown as { cursor: number }).cursor = 0;

    if (isEnterKey(key)) {
      submitting.current = true;
      done(value);
      return;
    }

    if (isBackspaceKey(key)) {
      if (caret > 0) {
        setValue(value.slice(0, caret - 1) + value.slice(caret));
        setCaret(caret - 1);
      }
      return;
    }

    const name = key.name;

    if (name === "delete") {
      if (caret < value.length) {
        setValue(value.slice(0, caret) + value.slice(caret + 1));
      }
      return;
    }
    if (name === "left") {
      if (caret > 0) setCaret(caret - 1);
      return;
    }
    if (name === "right") {
      if (caret < value.length) setCaret(caret + 1);
      return;
    }
    if (name === "home" || (key.ctrl && name === "a")) {
      setCaret(0);
      return;
    }
    if (name === "end" || (key.ctrl && name === "e")) {
      setCaret(value.length);
      return;
    }
    if (key.ctrl && name === "u") {
      // Delete to start of line.
      setValue(value.slice(caret));
      setCaret(0);
      return;
    }
    if (name === "tab" || name === "escape" || name === "up" || name === "down") {
      // Ignore keys that don't map to single-line text editing.
      return;
    }

    // Anything else that produced printable text gets inserted at the caret.
    const printable = typed.replace(/[\x00-\x1f\x7f]/g, "");
    if (printable) {
      setValue(value.slice(0, caret) + printable + value.slice(caret));
      setCaret(caret + printable.length);
    }
  });

  const inner = boxInnerWidth();
  const border = chalk.hex(ACCENT);
  const promptGlyph = chalk.hex(ACCENT).bold(glyph.prompt);

  const textWidth = Math.max(1, inner - FIRST_PREFIX.length - 1);
  const rows = wrapWithOffsets(value, textWidth);

  const top = border("╭" + "─".repeat(inner) + "╮");
  const bottom = border("╰" + "─".repeat(inner) + "╯");

  // On the final (submit) frame, close the box cleanly with no caret.
  const showCaret = !submitting.current;
  const caretPos = showCaret ? locateCaret(rows, caret) : { row: -1, col: -1 };

  const framed = rows.map((rowInfo, i) => {
    const { seg } = rowInfo;
    const isFirst = i === 0;
    const isLast = i === rows.length - 1;
    const indentPlain = isFirst ? FIRST_PREFIX : CONT_INDENT;
    const indentDisplay = isFirst ? ` ${promptGlyph} ` : CONT_INDENT;

    // Build the visible text for this row, injecting the synthetic caret.
    let text: string;
    let plainLen: number;
    if (showCaret && i === caretPos.row) {
      const col = caretPos.col;
      const ch = col < seg.length ? seg[col]! : " ";
      const before = seg.slice(0, col);
      const after = col < seg.length ? seg.slice(col + 1) : "";
      text = before + chalk.inverse(ch) + after;
      plainLen = seg.length + (col >= seg.length ? 1 : 0);
    } else {
      text = seg;
      plainLen = seg.length;
    }

    const left = `${border("│")}${indentDisplay}${text}`;

    if (isLast && !submitting.current) {
      // Active last line stays open on the right so growth feels natural.
      return left;
    }

    const used = indentPlain.length + plainLen;
    const pad = Math.max(0, inner - used);
    return `${left}${" ".repeat(pad)}${border("│")}`;
  });

  const hint = fmt.muted(
    `  ${glyph.bullet} ${config.mode} mode    ${glyph.bullet} /help for commands    ${glyph.bullet} /exit to quit`,
  );

  // Prepend cursorHide so the real caret stays invisible while we draw our own.
  const content = `${cursorHide}\n${top}\n${framed.join("\n")}`;
  const bottomContent = `${bottom}\n${hint}`;

  return [content, bottomContent];
});

/** Draws the boxed input and resolves with the user's text. */
export async function boxedInput(mode: string): Promise<string> {
  return boxedPrompt({ mode });
}
