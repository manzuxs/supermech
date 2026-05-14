---
name: visual-executing-plans
description: "Execute implementation plans with real-time DAG progress tracking. Supports configurable quality gates per task — spec review and code quality review."
---

# Visual Executing Plans

Execute implementation plans step by step. The DAG flowchart shows real-time progress. Each task can have **configurable quality gates** that run after implementation.

## Process Overview

```dot
digraph execute_task {
    rankdir=TB;

    "Start task" [shape=box];
    "Implement" [shape=box];
    "Spec review enabled?" [shape=diamond];
    "Run spec review" [shape=box];
    "Spec passed?" [shape=diamond];
    "Fix spec gaps" [shape=box];
    "Code quality enabled?" [shape=diamond];
    "Run code quality review" [shape=box];
    "Quality passed?" [shape=diamond];
    "Fix quality issues" [shape=box];
    "Mark done" [shape=box];
    "Await user rating" [shape=box];

    "Start task" -> "Implement";
    "Implement" -> "Spec review enabled?";
    "Spec review enabled?" -> "Run spec review" [label="yes"];
    "Spec review enabled?" -> "Code quality enabled?" [label="no - skip"];
    "Run spec review" -> "Spec passed?";
    "Spec passed?" -> "Fix spec gaps" [label="no"];
    "Fix spec gaps" -> "Run spec review" [label="re-review"];
    "Spec passed?" -> "Code quality enabled?" [label="yes"];
    "Code quality enabled?" -> "Run code quality review" [label="yes"];
    "Code quality enabled?" -> "Mark done" [label="no - skip"];
    "Run code quality review" -> "Quality passed?";
    "Quality passed?" -> "Fix quality issues" [label="no"];
    "Fix quality issues" -> "Run code quality review" [label="re-review"];
    "Quality passed?" -> "Mark done" [label="yes"];
    "Mark done" -> "Await user rating";
}
```

## Workflow

### Step 1: Load Plan

Read tasks from `state.canvas.nodes`. If the plan was written by visual-writing-plans, the nodes should already exist with `status: "pending"`, `progress: 0`, and optionally `metadata.qualityGates` configured.

Set the initial state:
```json
{
  "meta": { "activeSkill": "executing-plans", "agentStatus": "idle" },
  "canvas": { "skillType": "executing-plans" }
}
```

### Step 2: Execute Each Task with Quality Gates

For each task, read `node.metadata.qualityGates` to determine which gates are enabled:

| riskLevel | spec-review | code-quality |
|-----------|-------------|--------------|
| `low`     | disabled    | disabled     |
| `medium`  | enabled     | disabled     |
| `high`    | enabled     | enabled      |

Users can override these in the UI. If no `qualityGates` is set, only the `executionPhase` metadata is used for display.

Update state.json at each milestone:

**Starting a task:**
```json
{ "id": "task-2", "status": "active", "progress": 0 }
```
Also set `executionPhase` in metadata: `"implementing"`.

**Progress update (during multi-step tasks):**
```json
{ "id": "task-2", "status": "active", "progress": 0.5 }
```

**Gate review:**
When a gate starts, set the gate state to `running`:
```json
// Via API: PATCH /__state/node/gate-state
{ "nodeId": "task-2", "type": "spec-review", "status": "running" }
```
Also set `executionPhase` to `"reviewing"`:
```json
// Via API: PATCH /__state/node/execution-phase
{ "nodeId": "task-2", "phase": "reviewing" }
```

When a gate passes:
```json
{ "nodeId": "task-2", "type": "spec-review", "status": "passed", "result": "All requirements met." }
```

When a gate fails:
```json
{ "nodeId": "task-2", "type": "spec-review", "status": "failed", "result": "Missing: email validation. Extra: added admin flag." }
```
Fix the issues, then re-run the gate. Loop until passed.

**Task complete — all gates passed:**
```json
{ "id": "task-2", "status": "done", "progress": 1.0 }
```
Set `executionPhase` to `"idle"`.

**Blocked / needs review:**
```json
{ "id": "task-2", "status": "pending", "progress": 0 }
{ "nodeId": "task-2", "text": "Blocked: missing dependency X", "quickAction": null }
```

### Step 3: Verification

After implementation (before gates), run tests specified in the task. If verification fails, set task back to `pending` and add feedback.

### Step 3.5: Await User Rating

After a task is marked `done`, the UI shows star-rating controls (1–5 stars). Ratings are stored in `feedback[].rating`. You do NOT need to prompt for ratings — the UI handles it.

If the user rates 1-2 stars, a **"Re-plan & Re-execute"** button appears. When clicked, the node is reset to `pending` and a feedback entry with `quickAction: "replan"` is added.

### Handling Re-plan Requests

When reading feedback, check for entries with `quickAction: "replan"`:
1. Identify the node referenced by `feedback[].nodeId`
2. Review the user's feedback text and rating context
3. Re-plan the task — break into smaller steps if needed
4. Update `node.metadata.implementationSteps` with the new plan
5. Set `status: "active"`, `progress: 0`, `executionPhase: "implementing"`
6. Execute the re-planned task following the standard gate flow

### Step 4: Complete

Set agent status to idle. Keep `activeSkill` set so the user can review results in the UI:
```json
{ "meta": { "agentStatus": "idle" } }
```
(The user will switch skills explicitly when they're done reviewing.)

## Key Rules

- `activeSkill` stays set after execution completes — users review history in the UI. Only clear when the user explicitly switches skills.
- Status, progress, gateStates, and executionPhase are **Agent-only**. The UI does not allow the user to change them. The user only rates quality.
- `qualityGates` config is set by writing-plans or user via UI
- Do NOT add new tasks — the plan is already defined
- Only one task should be `active` at a time
- Use `meta.agentStatus` to signal state: `"writing"` when executing, `"idle"` when waiting, `"error"` when blocked
- Add feedback entries when blocked or when user input is needed
- Gate re-review loops: when a gate fails, fix and re-run. Do NOT skip to next gate without re-running.

## Checklist

1. **Load plan** — read from `state.canvas.nodes`, check `qualityGates` config
2. **Set activeSkill** — `meta.activeSkill: "executing-plans"`
3. **Execute each task** — update status + progress at each milestone
4. **Run enabled gates** — spec review first, then code quality (if enabled)
5. **Handle re-plan** — check for `quickAction: "replan"` in feedback
6. **On complete** — `meta.agentStatus: "idle"`, keep `activeSkill` for history review
