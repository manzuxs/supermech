# Supermech — Visual Workbench

Monorepo: terminal/Markdown-driven agent workflow upgraded to a data-driven visual platform. Agent outputs structured JSON → React frontend renders real-time visualizations → user feedback writes back to JSON.

## Architecture

```
Agent (Brain)          React Frontend (Canvas)
    │                        │
    │   写入状态文件          │
    ├───────────────────────►│  Vite plugin / CLI server → SSE → re-render
    │                        │
    │  ◄─────────────────────┤  User action → middleware → write 状态文件
    │   下一轮读取反馈        │
```

Three layers:
- **Logic** — skills in `.supermech/skills/` that write structured JSON to `.supermech/<plan>/state-<skill>.json`
- **Data protocol** — `@supermech/schema` TypeScript types + zod runtime validation for `WorkbenchState`
- **Presentation** — `apps/web/` React app rendering MindMap, PlanEditor, or KanbanBoard

## Directory Structure

```
.supermech/                     # Product config and skill definitions
├── config.json                 # Workspace configuration (checked in)
├── skills/                     # Discoverable skill directories
│   ├── brainstorming/          # Agent skill: Socratic questioning → tree nodes
│   ├── writing-plans/          # Agent skill: plan tasks as structured JSON
│   └── executing-plans/        # Agent skill: task execution + quality gates
├── <plan-a>/                   # Agent-created plan directories
│   ├── state-brainstorming.json
│   ├── state-writing-plans.json
│   └── state-executing-plans.json
└── <plan-b>/
    └── state-brainstorming.json

apps/web/                       # React frontend (Vite + React 18 + Tailwind v4)
├── src/
│   ├── main.tsx                # Entry: ThemeProvider + WorkbenchProvider
│   ├── App.tsx                 # 5-zone grid layout
│   ├── styles.css              # Tailwind v4 + CSS variables (light/dark)
│   ├── components/layout/      # Header, LeftSidebar, CenterCanvas, RightSidebar, Footer, ThemeToggle
│   ├── components/visuals/     # MindMap, PlanEditor, KanbanBoard, FlowchartCanvas, DetailPanel
│   ├── components/shared/      # CommandInput (feedback + slash commands)
│   ├── context/WorkbenchContext.tsx  # React Context: HTTP+SSE for state updates
│   ├── lib/commands.ts         # Slash command registry (/execute, etc.)
│   ├── lib/i18n.ts             # i18next init
│   └── locales/                # en.json, zh.json
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
├── watcher/                    # @supermech/runtime — file I/O + Vite plugin + middleware
│   └── src/
│       ├── index.ts            # Public API: readState, writeState, watchState
│       ├── storage.ts          # File I/O with plan-aware path resolution
│       ├── middleware.ts       # Shared /__state HTTP middleware
│       ├── vite-plugin.ts      # Vite plugin: virtual module + middleware + SSE
│       └── session-manager.ts  # Legacy session CRUD
├── init/                       # @supermech/init — project initializer
│   ├── bin/cli.mjs             # CLI entry: npx @supermech/init
│   ├── skills/                 # SKILL.md templates (bundled)
│   └── src/index.ts            # initProject() API
└── cli/                        # @supermech/cli — standalone workbench server
    ├── bin/supermech.mjs       # CLI entry: npx @supermech/cli
    └── src/server.ts           # Express server + SSE + auto plan detection

state.json                      # Legacy state file (deprecated)
```

## Published Packages

| Package | Purpose | npm |
|---------|---------|-----|
| `@supermech/schema` | TS types + `validateState()` | `npm i @supermech/schema` |
| `@supermech/runtime` | `readState()` / `writeState()` / `watchState()` + Vite plugin | `npm i @supermech/runtime` |
| `@supermech/init` | `npx @supermech/init` — bootstrap `.supermech/` + install skills | `npx @supermech/init` |
| `@supermech/cli` | `npx @supermech/cli` — start standalone workbench server | `npx @supermech/cli` |

## How Other Projects Use Supermech

Supermech is designed as a **low-invasion sidecar**: any project can add a `.supermech/` directory and begin using Supermech skills.

### Quick Start

```bash
# Initialize (creates .supermech/ + installs skills to .claude/skills/)
npx @supermech/init

# Agent uses skill → creates state in .supermech/<plan>/state-<skill>.json
# Start workbench to see visualizations
npx @supermech/cli
```

### Agent Workflow

1. **Agent creates plan directory** — `.supermech/<plan>/state-<skill>.json`
2. **Agent writes state** — structured JSON per the SKILL.md schema
3. **Agent reads feedback** — checks `feedback[]` for user annotations
4. **User views/acts** — CLI servers renders visualizations in real-time

### Plan = Agent-Auto-Created Directory

Plans are NOT user-managed. When the user starts a session, the agent creates a plan directory based on the request topic:

```
npx @supermech/init          → .supermech/ (config + skills only)

User: "分析用户认证系统"     → Agent creates:
                                 .supermech/用户认证/state-brainstorming.json

User: "分析订单系统"          → Agent creates:
                                 .supermech/订单系统/state-brainstorming.json

npx @supermech/cli            → Auto-detects [用户认证] [订单系统]
                                 Defaults to most recently modified plan
```

### Runtime API (for agents and scripts)

```typescript
import { readState, writeState, watchState, listSkillNames } from '@supermech/runtime';

const state = readState('brainstorming');
writeState('brainstorming', updatedState);
watchState('writing-plans', () => console.log('State changed!'));
const skills = listSkillNames();
```

### State Validation

```typescript
import { validateState } from '@supermech/schema';
const { valid, errors } = validateState(myState);
```

## Data Flow

1. **Agent → JSON**: Agent writes to `.supermech/<plan>/state-<skill>.json`
2. **JSON → UI**: CLI server watches file → pushes SSE event → UI re-fetches via GET
3. **UI → JSON**: User clicks/feedback → Context calls middleware API → middleware writes file
4. **JSON → Agent**: Agent reads state file on next iteration

## API Endpoints (at `/__state`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/__state` | GET | Read current state |
| `/__state/events` | GET | SSE stream for real-time state updates |
| `/__state/select` | POST | Set selectedNodeId |
| `/__state/ui` | PATCH | Update UI prefs |
| `/__state/feedback` | POST | Add feedback entry |
| `/__state/node` | PATCH | Update node (status, progress, label) |
| `/__state/node/gate-state` | PATCH | Update quality gate status |
| `/__state/node/execution-phase` | PATCH | Update execution phase |
| `/__state/replan` | POST | Reset node to pending |
| `/__state/plans` | GET | List plans + current |
| `/__state/plans/switch` | POST | Switch active plan |
| `/__state/plans/create` | POST | Create new plan |
| `/__state/skills` | GET | List skills in current plan |
| `/__state/skills/switch` | POST | Switch active skill |

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
| `supermech-brainstorming` | MindMap (SVG tree) | Socratic design exploration → structured decisions |
| `supermech-writing-plans` | PlanEditor (tree + detail) | Implementation plans with TDD steps, files, quality gates |
| `supermech-executing-plans` | KanbanBoard (3-column) | One-task-at-a-time execution with quality gates + user rating |

Skills are **independent** — not a pipeline. Use only what you need. Adding a skill = adding a directory in `.supermech/skills/`.

## Commands

```bash
pnpm dev:web       # Start Vite dev server at localhost:5173
pnpm typecheck     # tsc --noEmit for all packages
pnpm check         # biome check .
pnpm check:fix     # biome check --write .
pnpm build         # turbo run build
```

## Conventions

- State files: `.supermech/<plan>/state-<skill>.json`
- Plans: agent-created directories, auto-detected by CLI, switchable in UI
- `meta.activeSkill` controls which view renders (`null` = idle)
- `canvas.skillType` matches the skill name
- Skills are discoverable: `.supermech/skills/<name>/SKILL.md`
- MindMap uses `parentId`/`children` for tree hierarchy
- PlanEditor and KanbanBoard use `edges[]` for dependency tracking
- Use `metadata.description` for long-form content, `label` for short titles (3-8 words)

## Design Decisions

### Plan Auto-Detection
Plans are NOT user-managed. Agent creates plan directories under `.supermech/`. CLI server auto-detects all plan directories on startup. Most recently modified plan becomes default.

### Status ownership: Agent-only
Status (`pending`/`active`/`done`) and `progress` (0.0–1.0) are **exclusively managed by the Agent**. UI displays them, user cannot change them.

### Human role: rating, not managing
After a task is done, the user rates quality (1–5 stars). Low ratings (1-2 stars) show a **"Re-plan & Re-execute"** button.

### Quality Gate System
Gates are preset by `riskLevel` (`low`/`medium`/`high`) and can be overridden in UI:
- `low`: all gates disabled
- `medium`: spec-review enabled+required
- `high`: both gates enabled+required

### Skill Independence
Skills are **not a pipeline**. Brainstorming / writing-plans / executing-plans are independent. New skills can be added by creating a directory in `.supermech/skills/`.

### Plan vs Execute separation
- **PlanEditor** (writing-plans): pure planning — task tree, goal, files, code steps, tests
- **KanbanBoard** (executing-plans): execution — 3 columns, agent-driven status, user rating

### Worktree Base Point
`EnterWorktree` may create the worktree from `origin/main` (the tracking branch), not local `main` HEAD. When local `main` has unpushed commits, this causes the worktree to miss those commits, leading to merge conflicts later.

**Prevention:** After entering a worktree, immediately run:
```bash
git fetch origin main && git rebase main
```
Or verify with `git merge-base HEAD main` — if it doesn't match `main` HEAD, rebase before starting any work.

This is a one-time check at worktree setup, not a recurring workflow step.
