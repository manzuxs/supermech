---
name: visual-executing-plans
description: "Execute implementation plans with real-time Kanban progress tracking. Only this skill updates task status/progress — the writing-plans skill only defines the plan."
---

# Visual Executing Plans

Execute implementation plans step by step. The Kanban board shows real-time progress as you update `state.canvas.nodes`. You only **update** existing nodes — you do not define new tasks (that is writing-plans' job).

## Workflow

### Step 1: Load Plan

Read tasks from `state.canvas.nodes`. If the plan was written by visual-writing-plans, the nodes should already exist with `status: "pending"` and `progress: 0`.

If loading from a file (e.g., `docs/superpowers/plans/YYYY-MM-DD-<name>.md`), parse it and write the tasks into `state.canvas.nodes` first.

Set the initial state:
```json
{
  "meta": { "activeSkill": "executing-plans", "agentStatus": "idle" },
  "canvas": { "skillType": "executing-plans" }
}
```

### Step 2: Execute Each Task

For each task, update state.json at these milestones:

**Starting a task:**
```json
{ "id": "task-2", "status": "active", "progress": 0 }
```
The Kanban card moves to "In Progress" with breathing animation.

**Progress update (during multi-step tasks):**
```json
{ "id": "task-2", "status": "active", "progress": 0.5 }
```

**Task complete:**
```json
{ "id": "task-2", "status": "done", "progress": 1.0 }
```

**Blocked / needs review:**
```json
// Set status to pending and add feedback explaining why
{ "id": "task-2", "status": "pending", "progress": 0 }
// Also add a feedback entry:
{ "nodeId": "task-2", "text": "Blocked: missing dependency X", "quickAction": null }
```

### Step 3: Verification

After each task:
- Run any tests specified in the task
- If verification fails, set task back to `pending` and add feedback
- If pass, keep as `done` and move to next

### Step 4: Complete

Set agent status to idle and clear the active skill:
```json
{ "meta": { "agentStatus": "idle", "activeSkill": null } }
```

## Key Rules

- Do NOT add new tasks — the plan is already defined
- Do NOT modify task labels or metadata — only status and progress
- Only one task should be `active` at a time
- Use `meta.agentStatus` to signal state: `"writing"` when executing, `"idle"` when waiting, `"error"` when blocked
- Add feedback entries when blocked or when user input is needed

## Checklist

1. **Load plan** — read from `state.canvas.nodes` or parse from file
2. **Set activeSkill** — `meta.activeSkill: "executing-plans"`
3. **Execute each task** — update status + progress in state.json at each milestone
4. **Verify** — run tests/checks after each task
5. **On complete** — `meta.agentStatus: "idle"`, `meta.activeSkill: null`
