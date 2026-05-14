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
- **Logic** — skills in `skills/` that write structured JSON to `state.json`
- **Data protocol** — `packages/schemas/` TypeScript types for `WorkbenchState`
- **Presentation** — `apps/web/` React app rendering MindMap or KanbanBoard

## Directory Structure

```
apps/web/                       # React frontend (Vite + React 18 + Tailwind v4)
├── src/
│   ├── main.tsx                # Entry: ThemeProvider + WorkbenchProvider
│   ├── App.tsx                 # 5-zone grid layout
│   ├── styles.css              # Tailwind v4 + CSS variables (light/dark)
│   ├── components/layout/      # Header, LeftSidebar, CenterCanvas, RightSidebar, Footer, ThemeToggle
│   ├── components/visuals/     # MindMap (brainstorming), PlanEditor (writing-plans), KanbanBoard (executing-plans)
│   ├── components/shared/      # CommandInput (feedback + slash commands)
│   ├── context/WorkbenchContext.tsx  # React Context: state + API calls + session management
│   ├── lib/commands.ts         # Slash command registry (/execute, etc.)
│   ├── lib/i18n.ts             # i18next init
│   ├── locales/                # en.json, zh.json
│   └── env.d.ts                # virtual:supermech/state declaration
├── index.html
├── vite.config.ts              # React + Tailwind + supermechWatcherPlugin
└── tsconfig.json

packages/
├── schemas/src/                # Shared TypeScript types
│   ├── workbench.ts            # WorkbenchState, CanvasNode, CanvasEdge, FeedbackEntry
│   ├── brainstorm.ts           # BrainstormNodeMetadata
│   └── planner.ts              # PlanStepMetadata
├── watcher/src/
│   ├── vite-plugin.ts          # Vite plugin: virtual module + middleware + session management
│   └── session-manager.ts      # Session file CRUD utilities

skills/
├── visual-brainstorming/       # Agent skill: outputs tree nodes to state.json
├── visual-writing-plans/       # Agent skill: outputs plan tasks as Kanban nodes
└── visual-executing-plans/     # Agent skill: updates task status/progress in real-time
    ├── SKILL.md                # Execution flow with quality gates
    ├── spec-reviewer-prompt.md # Spec compliance review prompt template
    └── code-quality-reviewer-prompt.md # Code quality review prompt template

state.json                      # Single source of truth (or state-<sessionId>.json for sessions)
```

## Data Flow

1. **Agent → JSON**: Agent modifies `state.json` (or `state-<sessionId>.json`)
2. **JSON → UI**: Vite plugin watches file → invalidates virtual module → sends HMR custom event → Context re-fetches via GET
3. **UI → JSON**: User clicks/feedback → Context calls middleware API → middleware writes file, returns updated state
4. **JSON → Agent**: Agent reads state.json next iteration (via file or GET endpoint)

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

- `state.json` at workspace root is the default session. Sessions create `state-<sessionId>.json`
- Agent sets `meta.activeSkill` to enable canvas rendering (`null` = idle)
- Agent sets `canvas.skillType` to choose MindMap vs PlanEditor vs KanbanBoard
- MindMap uses `parentId`/`children` for tree hierarchy
- KanbanBoard and PlanEditor use `edges[]` for dependency tracking
- Use `metadata.description` for long-form content, `label` for short titles (3-8 words)
- Renaming a session only changes the UI label, not the Agent's internal sessionId

## Design Decisions

### Status ownership: Agent-only
Status (`pending`/`active`/`done`) and `progress` (0.0–1.0) are **exclusively managed by the Agent** during execution. The UI (both PlanEditor and KanbanBoard) does not allow user to change them. This keeps "planner" and "executor" roles cleanly separated.

### Human role: rating, not managing
After a task is done, the user rates quality (1–5 stars) and optionally adds text feedback via the FlowchartCanvas detail panel. Ratings are stored in `feedback[].rating`. Low ratings (1-2 stars) show a **"Re-plan & Re-execute"** button that resets the node to `pending` and adds a feedback entry with `quickAction: "replan"` for the agent to pick up.

### Quality Gate System
Each task can have configurable quality gates that run during execution:

| Gate | Type | Purpose |
|------|------|---------|
| Spec Compliance | `spec-review` | Verify implementation matches requirements |
| Code Quality | `code-quality` | Verify code is clean, tested, maintainable |

Gates are **preset by risk level** (`low`/`medium`/`high`) and can be **overridden in the UI** (DetailPanel) at any time:

- `low`: all gates disabled
- `medium`: spec-review enabled+required
- `high`: both gates enabled+required

During execution, the agent sets `executionPhase` (`implementing`/`reviewing`/`idle`) and `gateStates` per gate (`pending`/`running`/`passed`/`failed`/`skipped`). The FlowchartCanvas shows gate status as colored dots on each card.

### Slash command system (`lib/commands.ts`)
The bottom input box doubles as a CLI: normal text → submitted as feedback; input starting with `/` → dispatched to the command registry. `CommandInput` is the shared component handling this. Pre-registered commands:
- `/execute` (aliases: `start`, `run`) — switches to `executing-plans` skill

New skills can call `registerCommand()` to add their own commands.

### Plan vs Execute separation
- **PlanEditor** (writing-plans): pure planning view — task tree, goal, files, code steps, tests. No status dots, no progress bars, no state controls.
- **KanbanBoard** (executing-plans): execution view — 3 columns (To Do / In Progress / Done), agent-driven status, user rating. Selected card opens a detail panel with read-only info + star rating + feedback form.
