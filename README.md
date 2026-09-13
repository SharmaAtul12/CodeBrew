# CodeBrew

> **Brew your code with AI.** A terminal AI coding agent that can read, explore, edit, and run your code — with permission modes that keep you in control.

CodeBrew wraps the [Anthropic Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) in a friendly, colorful CLI. Ask questions about a codebase, plan a change, or let it do the work — you decide how much freedom it gets.

---

## Install

```bash
npm install -g @buildwithatul/codebrew
```

Requires **Node.js 18+** and an **Anthropic API key** ([get one here](https://console.anthropic.com/)).

> The npm **package** is `@buildwithatul/codebrew`; the **command** you type is `codebrew`.

---

## Quick Start

Set your API key. The simplest way is an environment variable (works from any directory):

```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

Alternatively, create a `.env` file **in the directory you run `codebrew` from** — CodeBrew reads `.env` from your current working directory, not from where the package is installed:

```env
ANTHROPIC_API_KEY=your_api_key_here
```

Then launch the guided start — banner, environment check, and a mode picker:

```bash
codebrew wakeup
```

Or jump straight into a chat:

```bash
codebrew chat --mode agent
```

---

## Commands

| Command | Description |
|---------|-------------|
| `codebrew wakeup` | Guided start: banner, preflight check, mode picker, then chat. |
| `codebrew chat [--mode <agent\|ask\|plan>] [--verbose]` | Interactive streaming chat session with conversation memory. |
| `codebrew talk "<prompt>"` | One-off single-shot prompt. |
| `codebrew doctor` | Verify Node.js 18+ and that your API key is set. |
| `codebrew hello` | Show the welcome banner. |

### Slash commands (inside a chat session)

| Command | What it does |
|---------|-------------|
| `/mode agent\|ask\|plan` | Switch permission mode live, no restart. |
| `/help` | Show the slash-command list. |
| `/context` | Show context-window usage for the session. |
| `/exit` | End the session cleanly. |

---

## The Three Modes

CodeBrew puts you in control of how much the AI can do:

| Mode | Can edit / run? | Best for |
|------|-----------------|----------|
| **`ask`** | No — read-only | Quick answers and exploring a codebase. |
| **`plan`** | No — proposes only | Reviewing an approach before anything changes. |
| **`agent`** | Yes | Getting real work done: reads, edits files, runs commands. |

Switch anytime mid-session with `/mode`. Every session is capped by default at 25 turns and $1.00 USD in spend.

---

## Example

```bash
# Explore a project read-only
codebrew chat --mode ask

# Then, in the session:
> summarize what this project does
> /mode agent
> add input validation to the login form
```

Because the chat session remembers context, each turn builds on the last.

---

## How It Works

CodeBrew streams the agent loop live — you see every tool it invokes (`Read`, `Edit`, `Write`, `Bash`, `Glob`, `Grep`, `WebSearch`, `WebFetch`), the results, and a per-turn cost summary. Conversation memory comes from the SDK's streaming-input session, so the agent remembers the whole chat until you exit.

For a full architecture deep-dive — the dual-loop chat engine, the turn gate, mode-to-permission mapping, and file-by-file breakdown with diagrams — see **[DESIGN.md](./DESIGN.md)**.

---

## Configuration

| Setting | Where | Default |
|---------|-------|---------|
| `ANTHROPIC_API_KEY` | environment / `.env` | required |
| Max turns per session | `agent` internals | 25 |
| Budget cap per session | `agent` internals | $1.00 USD |

---

## Roadmap

- Interactive per-tool approval prompts
- Persistent history across restarts (resume a past session)
- Additional model providers

---

## License

ISC

---

Built by [buildwithatul](https://buildwithatul.com).
