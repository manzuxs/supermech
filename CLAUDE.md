# Supermech — Visual Workbench

Monorepo: terminal/Markdown-driven agent workflow upgraded to a data-driven visual platform. Agent outputs structured JSON → React frontend renders real-time visualizations → user feedback writes back to JSON.

## Architecture

```
Agent (Brain)          React Frontend (Canvas)
    │                        │
    │   写入 state.json       │
    ├───────────────────────►│  Vite plugin → HMR → re-render
    │                        │
    │  ◄─────────────────────┤  User action → middleware → write state.json
    │   下一轮读取反馈        │
```

Three layers:
- **Logic** — skills in `.supermech/skills/` that write structured JSON to `state-<skill>.json`
- **Data protocol** — `@supermech/schema` TypeScript types + zod runtime validation for `WorkbenchState`
- **Presentation** — `apps/web/` React app rendering MindMap, PlanEditor, or KanbanBoard

## Directory Structure

```
.supermech/                     # Product config and skill definitions
├── config.json                 # Workspace configuration (checked in)
├── skills/                     # Discoverable skill directories
│   ├── visual-brainstorming/   # Agent skill: tree nodes to state.json
│   ├── visual-writing-plans/   # Agent skill: plan tasks as Kanban nodes
│   └── visual-executing-plans/ # Agent skill: task status/progress
├── state-brainstorming.json    # Session state files (gitignored)
└── state-writing-plans.json    # One file per active skill

apps/web/                       # React frontend (Vite + React 18 + Tailwind v4)
├── src/
│   ├── main.tsx                # Entry: ThemeProvider + WorkbenchProvider
│   ├── App.tsx                 # 5-zone grid layout
│   ├── styles.css              # Tailwind v4 + CSS variables (light/dark)
│   ├── components/layout/      # Header, LeftSidebar, CenterCanvas, RightSidebar, Footer, ThemeToggle
│   ├── components/visuals/     # MindMap, PlanEditor, KanbanBoard, FlowchartCanvas, DetailPanel
│   ├── components/shared/      # CommandInput (feedback + slash commands)
│   ├── context/WorkbenchContext.tsx  # React Context: state + API calls + session management
│   ├── lib/commands.ts         # Slash command registry (/execute, etc.)
│   ├── lib/i18n.ts             # i18next init
│   ├── locales/                # en.json, zh.json
│   └── env.d.ts                # virtual:supermech/state declaration
├── index.html
├── vite.config.ts              # React + Tailwind + @supermech/runtime/vite
└── tsconfig.json

packages/
├── schemas/                    # @supermech/schema — TS types + zod validation
│   └── src/
│       ├── index.ts            # Re-exports all types + validators
│       ├── workbench.ts        # WorkbenchState, CanvasNode, CanvasEdge, FeedbackEntry
│       ├── brainstorm.ts       # BrainstormNodeMetadata
│       ├── planner.ts          # PlanTaskMetadata, PlanHeader, etc.
│       └── validation.ts       # Zod schemas + validateState()
├── watcher/                    # @supermech/runtime — file I/O + Vite plugin
│   └── src/
│       ├── index.ts            # Public API: readState, writeState, watchState
│       ├── storage.ts          # File I/O with plan-aware path resolution
│       ├── vite-plugin.ts      # Vite plugin: virtual module + middleware
│       └── session-manager.ts  # Legacy session CRUD
└── init/                       # @supermech/init — project initializer
    └── src/
        └── index.ts            # initProject() CLI entry

state.json                      # Legacy state file (migrate to .supermech/state-<skill>.json)
```

## Published Packages

| Package | Path | Purpose |
|---------|------|---------|
| `@supermech/schema` | `packages/schemas/` | Types + zod runtime validation |
| `@supermech/runtime` | `packages/watcher/` | File I/O, Vite plugin, session management |
| `@supermech/init` | `packages/init/` | One-command project initializer |

## How Other Projects Use Supermech

Supermech is designed as a **low-invasion sidecar**: any project (Node, Python, Go, even non-code repos) can add a `.supermech/` directory and begin using Supermech skills.

### Quick Start (TypeScript / Node project)

```bash
# Install packages
npm install @supermech/schema @supermech/runtime

# Initialize .supermech/ directory
npx @supermech/init --with-skills brainstorming,writing-plans,executing-plans
```

This creates:

```
.supermech/
├── config.json        # Workspace config (optional: set statePath, currentPlan)
├── skills/            # Agent discovers skills here
└── state-brainstorming.json
```

### Agent Workflow

1. **Agent writes state**: The agent writes structured JSON to `.supermech/state-<skill>.json`
2. **Agent reads feedback**: The agent reads `.supermech/state-<skill>.json` for user feedback entries
3. **User views/acts**: The Supermech workbench UI watches state files and renders visualizations in real-time

### Runtime API (for agents and scripts)

```typescript
import { readState, writeState, watchState, listSkillNames } from '@supermech/runtime';

// Read current state
const state = readState('brainstorming');
console.log(state?.meta, state?.canvas.nodes);

// Write updated state
writeState('brainstorming', updatedState);

// Watch for changes
watchState('writing-plans', () => console.log('State changed!'));

// List available skills
const skills = listSkillNames();
```

### State Validation

```typescript
import { validateState } from '@supermech/schema';

const { valid, errors } = validateState(myState);
if (!valid) console.error('Invalid state:', errors);
```

### Plan-Scoped States (Multiple Work Contexts)

For projects with parallel work contexts (e.g., "Feature A" and "Feature B"), set `currentPlan`:

```typescript
writeState('brainstorming', data, { currentPlan: 'feature-a' });
const state = readState('brainstorming', { currentPlan: 'feature-b' });
```

This resolves to `.supermech/feature-a/state-brainstorming.json`.

### Vite Plugin (for the built-in workbench UI)

```typescript
// vite.config.ts
import { supermechWatcherPlugin } from '@supermech/runtime/vite';

export default defineConfig({
  plugins: [
    supermechWatcherPlugin({
      statePath: '.supermech/state',
      basePlanDir: '.supermech',
    }),
  ],
});
```

### Non-Node Projects

For Python, Go, or any other project:

1. Create `.supermech/config.json` with the standard config
2. Write `state-<skill>.json` files with the correct `WorkbenchState` schema
3. Use the Supermech workbench or a compatible UI to view state
4. Agent discovers skills via `.supermech/skills/` directory listing

## Data Flow

1. **Agent → JSON**: Agent writes to `.supermech/state-<skill>.json`
2. **JSON → UI**: Vite plugin watches file → invalidates virtual module → sends HMR custom event → Context re-fetches via GET
3. **UI → JSON**: User clicks/feedback → Context calls middleware API → middleware writes file, returns updated state
4. **JSON → Agent**: Agent reads state file on next iteration

## API Endpoints (Vite middleware at `/__state`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/__state` | GET | Read current state |
| `/__state/select` | POST | Set selectedNodeId |
| `/__state/ui` | PATCH | Update UI prefs |
| `/__state/feedback` | POST | Add feedback entry |
| `/__state/node` | PATCH | Update node (status, progress, label) |
| `/__state/node/gate-state` | PATCH | Update quality gate status (nodeId, type, status, result?) |
| `/__state/node/execution-phase` | PATCH | Update execution phase (nodeId, phase) |
| `/__state/replan` | POST | Reset node to pending for re-execution |
| `/__state/sessions` | GET | List sessions + current ID |
| `/__state/sessions` | POST | Create session `{sessionId}` |
| `/__state/sessions/switch` | POST | Switch session `{sessionId}` |
| `/__state/sessions/rename` | PATCH | Rename session `{sessionId, newLabel}` |
| `/__state/sessions/delete` | POST | Delete session `{sessionId}` |

## State Schema (`WorkbenchState`)

```typescript
interface WorkbenchState {
  meta:     { projectName, sessionId, activeSkill, agentStatus }
  canvas:   { skillType, nodes: CanvasNode[], edges: CanvasEdge[] }
  feedback: FeedbackEntry[]
  ui:       { theme, leftSidebarOpen, rightSidebarOpen, selectedNodeId }
}
```

`CanvasNode.status`: `pending | active | accepted | rejected | done`

## Available Skills

| Skill | Renders As | Purpose |
|-------|-----------|---------|
| `visual-brainstorming` | MindMap (SVG tree) | Explore ideas, propose approaches, design |
| `visual-writing-plans` | PlanEditor (tree + detail panel) | Write implementation plans as structured tasks; `status`/`progress` are Agent-only, not shown in UI |
| `visual-executing-plans` | KanbanBoard (3-column + detail panel) | Execute plans; Agent sets status/progress, user rates quality via stars |

## Commands

```bash
pnpm dev:web       # Start Vite dev server at localhost:5173
pnpm typecheck     # tsc --noEmit for all packages
pnpm check         # biome check .
pnpm check:fix     # biome check --write .
pnpm build         # turbo run build
```

## Conventions

- State files live in `.supermech/state-<skill>.json` (or root `state.json` for legacy sessions)
- Agent sets `meta.activeSkill` to enable canvas rendering (`null` = idle)
- Agent sets `canvas.skillType` to choose MindMap vs PlanEditor vs KanbanBoard
- Skills are discoverable: `.supermech/skills/<name>/SKILL.md` — add a skill by adding a directory
- Plans are optional groupings: set `currentPlan` to scope states under `.supermech/<plan>/`
- MindMap uses `parentId`/`children` for tree hierarchy
- KanbanBoard and PlanEditor use `edges[]` for dependency tracking
- Use `metadata.description` for long-form content, `label` for short titles (3-8 words)
- Renaming a session only changes the UI label, not the Agent's internal sessionId

## Design Decisions

### Status ownership: Agent-only
Status (`pending`/`active`/`done`) and `progress` (0.0–1.0) are **exclusively managed by the Agent** during execution. The UI does not allow user to change them.

### Human role: rating, not managing
After a task is done, the user rates quality (1–5 stars) and optionally adds text feedback via the detail panel. Low ratings (1-2 stars) show a **"Re-plan & Re-execute"** button.

### Quality Gate System
Each task can have configurable quality gates that run during execution. Gates are **preset by risk level** (`low`/`medium`/`high`) and can be **overridden in the UI** at any time.

### Slash command system (`lib/commands.ts`)
The bottom input box doubles as a CLI: normal text → submitted as feedback; input starting with `/` → dispatched to the command registry.

### Skill Independence
Skills are **not a pipeline** — brainstorming / writing-plans / executing-plans are independent. A project can use only writing-plans without brainstorming. New skills can be added at any time by creating a new directory in `.supermech/skills/` and writing `state-<new-skill>.json`.

### Plan vs Execute separation
- **PlanEditor** (writing-plans): pure planning view — task tree, goal, files, code steps, tests.
- **KanbanBoard** (executing-plans): execution view — 3 columns, agent-driven status, user rating.
