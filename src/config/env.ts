import "dotenv/config";
import { execa } from "execa";
import { fmt, glyph } from "../ui/format.js";

export function requireApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "Missing ANTHROPIC_API_KEY. Copy .env.example to .env and add your key."
    );
  }
  return key;
}

function checkRow(ok: boolean, label: string, detail: string): string {
  const mark = ok ? fmt.success(glyph.check) : fmt.error(glyph.cross);
  return `  ${mark}  ${fmt.label(label.padEnd(20))} ${fmt.muted(detail)}`;
}

export async function checkEnvironment(): Promise<void> {
  const { stdout } = await execa("node", ["-v"]);
  const version = stdout.trim();
  const major = parseInt(version.replace(/^v/, "").split(".")[0] ?? "0", 10);

  if (major < 18) {
    throw new Error(`Node.js 18+ required (found ${version})`);
  }

  requireApiKey();

  console.log(checkRow(true, "Node.js", `${version}  (>= 18 required)`));
  console.log(checkRow(true, "ANTHROPIC_API_KEY", "detected in environment"));
}