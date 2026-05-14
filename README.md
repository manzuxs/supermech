<h1 align="center">Supermech</h1>

<p align="center">
  <em>Visual workbench for AI agent workflows.</em>
  <br>
  Structured JSON bridges agent logic to real-time visualizations — brainstorm, plan, execute, and review in a visual canvas.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#packages">Packages</a> •
  <a href="#development">Development</a>
</p>

---

## What is Supermech?

Supermech transforms agent-driven workflows from terminal/Markdown interactions into a **data-driven visual platform**. Agents write structured JSON → the frontend renders real-time visualizations → user feedback writes back to JSON for the next agent iteration.

It's designed as a **low-invasion sidecar**: any project (Node, Python, Go, or otherwise) can add a `.supermech/` directory and immediately begin using Supermech skills.

### Current Skills

| Skill | View | Purpose |
|-------|------|---------|
| **visual-brainstorming** | MindMap (SVG tree) | Explore ideas, propose approaches, make design decisions |
| **visual-writing-plans** | PlanEditor (tree + detail) | Write implementation plans as structured tasks |
| **visual-executing-plans** | KanbanBoard (3-column) | Execute plans with quality gates and user rating |

Skills are **independent** — not a pipeline. Use only what you need.

---

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm (for development)

### Try the workbench

```bash
git clone https://github.com/<your-org>/supermech.git
cd supermech
pnpm install
pnpm dev:web
```

Open [localhost:5173](http://localhost:5173) to see the workbench.

### Add Supermech to your project

```bash
npm install @supermech/schema @supermech/runtime
npx @supermech/init --with-skills brainstorming,writing-plans,executing-plans
```

This creates `.supermech/` in your project — the standard directory for skill definitions and session state.

### Agent Usage

```typescript
import { readState, writeState } from '@supermech/runtime';
import { validateState } from '@supermech/schema';

// Write state for the brainstorming skill
writeState('brainstorming', {
  meta: {
    projectName: 'My Project',
    sessionId: 'brainstorming',
    activeSkill: 'brainstorming',
    agentStatus: 'writing',
  },
  canvas: {
    skillType: 'brainstorming',
    nodes: [
      { id: 'root', label: 'Main Topic', status: 'active', progress: 0.5, parentId: null, children: [], metadata: {} },
    ],
    edges: [],
  },
  feedback: [],
  ui: { theme: 'system', leftSidebarOpen: true, rightSidebarOpen: true, selectedNodeId: null },
});

// Validate before writing
const { valid, errors } = validateState(myState);
if (!valid) console.error('Invalid state:', errors);

// Read user feedback
const state = readState('brainstorming');
console.log(state?.feedback);
```

### Plan Scoping (Multiple Work Contexts)

For parallel work contexts (e.g., "Feature A" and "Feature B"):

```typescript
writeState('brainstorming', data, { currentPlan: 'feature-a' });
const state = readState('brainstorming', { currentPlan: 'feature-b' });
```

This resolves to `.supermech/feature-a/state-brainstorming.json`.

---

## How It Works

```
Agent (Brain)          React Frontend (Canvas)
    │                        │
    │   writes state.json    │
    ├───────────────────────►│  Vite plugin → HMR → re-render
    │                        │
    │  ◄─────────────────────┤  User action → middleware → write state.json
    │   reads feedback       │
```

**Data flow:**

1. **Agent → JSON**: Agent executes a skill and writes structured JSON to `.supermech/state-<skill>.json`
2. **JSON → UI**: The Vite plugin watches the file → invalidates the virtual module → sends HMR event → React Context re-fetches via GET
3. **UI → JSON**: User interacts (clicks, rates, annotates) → Context calls middleware API → middleware writes the update to file
4. **JSON → Agent**: Agent reads the state file on the next iteration, including any new `feedback[]` entries

### Directory Layout

```
.supermech/                     # Standard product directory (config + skills + state)
├── config.json                 # Workspace configuration (optional)
├── skills/                     # Agent discovers skills by listing this directory
│   ├── visual-brainstorming/   #   SKILL.md defines behavior
│   ├── visual-writing-plans/
│   └── visual-executing-plans/
├── state-brainstorming.json    # Session state files (gitignored)
└── state-writing-plans.json

packages/
├── schemas/                    # @supermech/schema — types + runtime validation
├── watcher/                    # @supermech/runtime — file I/O + Vite plugin
└── init/                       # @supermech/init — project initializer

apps/web/                       # React frontend (Vite + React 18 + Tailwind v4)
```

---

## Packages

Supermech is published as three npm packages, each independently usable:

| Package | Description |
|---------|-------------|
| [`@supermech/schema`](./packages/schemas/) | TypeScript types + zod schemas for `WorkbenchState`. Validates state files at runtime. Zero dependencies. |
| [`@supermech/runtime`](./packages/watcher/) | `readState()` / `writeState()` / `watchState()` for agent scripts. Includes a Vite plugin for the workbench UI. |
| [`@supermech/init`](./packages/init/) | `initProject()` to bootstrap `.supermech/` directory in any project. |

---

## Development

```bash
git clone <repo>
cd supermech
pnpm install
pnpm dev:web    # Start workbench at localhost:5173
pnpm typecheck  # TypeScript check across all packages
pnpm check      # Biome lint + format
pnpm check:fix  # Auto-fix issues
```

### Project Structure

```
apps/web/          — React workbench (Vite + React 18 + Tailwind v4 + i18n)
packages/schemas/  — @supermech/schema: types + zod validation
packages/watcher/  — @supermech/runtime: file I/O + Vite plugin
packages/init/     — @supermech/init: project initializer
skills/            — Legacy skill definitions (migrating to .supermech/skills/)
docs/              — Product docs and plan/session state samples
```

---

## Architecture

- **No build step for packages** — TypeScript sources consumed directly (workspace resolution)
- **State file as protocol** — JSON file is the single source of truth; no database, no service
- **HMR-driven UI** — Vite plugin watches file changes and pushes to React via custom HMR events
- **Plan-scoped states** — Optional plan subdirectories for parallel work contexts
- **Extensible skills** — Add a skill by creating `.supermech/skills/<name>/SKILL.md`; no framework changes needed

---

## Design Principles

1. **Low invasion** — A `.supermech/` directory and a few JSON files is all a project needs. No framework lock-in.
2. **Skill independence** — Skills are not a pipeline. Use only what you need.
3. **Agent-owned state** — The agent controls status transitions; the UI provides visualization and feedback.
4. **Runtime validation** — Every state mutation is validated against the schema before write.

---

## License

[MIT](./LICENSE)
