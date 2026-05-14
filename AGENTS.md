# Supermech — Visual Workbench

Monorepo: terminal/Markdown-driven agent workflow upgraded to a data-driven visual platform. Agent outputs structured JSON → React frontend renders real-time visualizations → user feedback writes back to JSON.

## Architecture

```
Agent (Brain)          React Frontend (Canvas)
    │                        │
    │   writes state.json    │
    ├───────────────────────►│  Vite plugin → HMR → re-render
    │                        │
    │  ◄─────────────────────┤  User action → middleware → write state.json
    │   reads feedback       │
```

Three layers:
- **Logic** — skills in `.supermech/skills/` that write structured JSON to `state-<skill>.json`
- **Data protocol** — `@supermech/schema` TypeScript types + zod runtime validation
- **Presentation** — `apps/web/` React app rendering MindMap, PlanEditor, or KanbanBoard

## Directory Structure

```
.supermech/
├── config.json
├── skills/
│   ├── visual-brainstorming/
│   ├── visual-writing-plans/
│   └── visual-executing-plans/
├── state-brainstorming.json
└── state-writing-plans.json

apps/web/                       # React frontend (Vite + React 18 + Tailwind v4)
packages/
├── schemas/                    # @supermech/schema
├── watcher/                    # @supermech/runtime
└── init/                       # @supermech/init

state.json                      # Legacy state file
```

## Published Packages

| Package | Purpose |
|---------|---------|
| `@supermech/schema` | TS types + `validateState()` |
| `@supermech/runtime` | `readState()` / `writeState()` / `watchState()` + Vite plugin |
| `@supermech/init` | `initProject()` one-command setup |

## Agent Workflow

### Writing State
Write structured JSON to `.supermech/state-<skill>.json`. The file path tells the UI which skill view to render.

```json
// .supermech/state-brainstorming.json
{
  "meta": { "projectName": "My Project", "sessionId": "brainstorming", "activeSkill": "brainstorming", "agentStatus": "writing" },
  "canvas": { "skillType": "brainstorming", "nodes": [...], "edges": [] },
  "feedback": [],
  "ui": { "theme": "system", "leftSidebarOpen": true, "rightSidebarOpen": true, "selectedNodeId": null }
}
```

### Reading Feedback
The `feedback[]` array contains user annotations. Check it on each iteration:

```json
{
  "feedback": [{ "nodeId": "q-approach", "text": "Consider serverless option", "rating": null, "createdAt": "..." }]
}
```

### Detecting Active State
- `meta.activeSkill === null` → canvas is idle, no view rendered
- `meta.activeSkill === 'brainstorming'` → MindMap view
- `meta.activeSkill === 'writing-plans'` → PlanEditor view
- `meta.activeSkill === 'executing-plans'` → KanbanBoard view

### Skill Discovery
List `.supermech/skills/` to discover available skills. Each subdirectory contains a `SKILL.md` defining the skill's behavior.

### Plan Scoping (Optional)
Set `currentPlan` in config or runtime calls to scope state to a subdirectory:
- `.supermech/<plan>/state-<skill>.json`

Useful for parallel work contexts (e.g., "feature-a" and "feature-b").

### Using Runtime API (TypeScript agents)

```typescript
import { readState, writeState } from '@supermech/runtime';

// Read
const state = readState('brainstorming');

// Write
writeState('brainstorming', updatedState);

// Validate
import { validateState } from '@supermech/schema';
const { valid, errors } = validateState(state);
```

## Conventions

- State files: `.supermech/state-<skill>.json`
- Root `state.json` exists for backward compatibility
- `meta.activeSkill` controls which view renders (`null` = idle)
- `canvas.skillType` matches the skill name
- Skills are independent — not a pipeline. Any skill can be used without others.
- Adding a skill = add a directory in `.supermech/skills/` + write `state-<new-skill>.json`
- Plans are optional groupings, not required

## Commands

```bash
pnpm dev:web       # Start dev server
pnpm typecheck     # tsc --noEmit
pnpm check         # biome check
pnpm check:fix     # biome check --write .
```

## Design Notes

- Status (`pending`/`active`/`done`) is Agent-managed only — UI does not change it
- User provides quality rating (1-5 stars) and text feedback
- Low ratings (1-2 stars) trigger "Re-plan & Re-execute" button in UI
- Slash commands in the input box: `/execute` switches to executing-plans
