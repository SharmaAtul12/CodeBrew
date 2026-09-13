import ora, { type Ora } from "ora";

let active: Ora | null = null;

export function startSpinner(text: string): void {
  stopSpinner();
  active = ora({
    text,
    color: "yellow",
    spinner: {
      interval: 80,
      frames: ["✶", "✸", "✹", "✺", "✹", "✷"],
    },
  }).start();
}

export function updateSpinner(text: string): void {
  if (active) active.text = text;
}

export function stopSpinner(): void {
  active?.stop();
  active = null;
}
