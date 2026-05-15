---
name: supermech-writing-plans
description: Write implementation plans as structured task trees. Output to .supermech/state-writing-plans.json for the Supermech PlanEditor to render.
---

# Visual Writing Plans

Write structured JSON to `.supermech/state-writing-plans.json` to render an interactive plan editor.

## State File

`.supermech/state-writing-plans.json`

## How It Works

1. Define a `PlanHeader` with goal, architecture, tech stack, and phases
2. Write task nodes with goals, files, implementation steps, and tests
3. Use `edges[]` for dependency tracking between tasks
4. User reviews and gives feedback via the UI
5. When done, switch to `executing-plans` to execute

## Workflow

1. **Write PlanHeader** — root goal, architecture, tech stack, optional phases
2. **Create task nodes** — each task has:
   - `metadata.goal`: what the task achieves
   - `metadata.files`: files to create/modify
   - `metadata.implementationSteps`: step-by-step code instructions
   - `metadata.verificationSteps`: test steps
   - `metadata.phase`: which phase the task belongs to
   - `metadata.riskLevel`: `"low" | "medium" | "high"`
3. **Define dependencies** — use `edges[]` for task ordering
4. **Get user approval** — user reviews via PlanEditor, feedback in `feedback[]`
5. **Hand off to execution** — switch to executing-plans skill

## State Schema

```json
{
  "meta": {
    "projectName": "string",
    "sessionId": "writing-plans",
    "activeSkill": "writing-plans",
    "agentStatus": "writing"
  },
  "canvas": {
    "skillType": "writing-plans",
    "nodes": [
      {
        "id": "string",
        "label": "task title",
        "status": "pending | active | done",
        "progress": 0.0,
        "parentId": null,
        "children": [],
        "metadata": {
          "goal": "what this task achieves",
          "files": [{"path": "src/...", "type": "create | modify | test | delete"}],
          "implementationSteps": [{"description": "...", "code": "..."}],
          "verificationSteps": [{"description": "..."}],
          "phase": "phase name",
          "riskLevel": "low | medium | high",
          "estimatedMinutes": 30
        }
      }
    ],
    "edges": [{"from": "task-a", "to": "task-b"}],
    "metadata": {
      "planHeader": {
        "goal": "project goal",
        "architecture": "architecture description",
        "techStack": ["React", "Node.js"],
        "phases": [{"name": "Setup", "description": "..."}]
      }
    }
  },
  "feedback": [],
  "ui": { "theme": "system", "leftSidebarOpen": true, "rightSidebarOpen": true, "selectedNodeId": null }
}
```

## Key Rules

- `status`/`progress` are Agent-only — don't expose in UI
- `edges[]` define task dependencies for ordering
- Each task in the plan is a `CanvasNode`
- PlanHeader goes in `canvas.metadata.planHeader`
- Keep `label` short (3-8 words), put details in `metadata`
