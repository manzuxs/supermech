---
name: supermech-brainstorming
description: Visual brainstorming with real-time mind map. Write structured tree nodes to .supermech/<plan>/state-brainstorming.json for the Supermech workbench to render.
---

# Visual Brainstorming

Write structured JSON to `.supermech/<plan>/state-brainstorming.json` to render a real-time mind map.

## Plan Directory

**Every brainstorming session creates a plan directory** named after the user's request topic. Use a short, descriptive name in the user's language.

Examples:
- "分析用户系统架构" → `.supermech/用户系统/state-brainstorming.json`
- "Design payment flow" → `.supermech/payment-flow/state-brainstorming.json`
- "Review deployment pipeline" → `.supermech/deploy-pipeline/state-brainstorming.json`

If the user refers to an existing topic, reuse the same plan directory. Otherwise create a new one.

## State File

`.supermech/<plan>/state-brainstorming.json`

Ensure the plan directory exists before writing:
```
mkdir -p .supermech/<plan>/
```

## How It Works

1. Write a root node representing the core topic
2. Add child nodes for questions, approaches, and trade-offs
3. User selects/annotates nodes in the UI, feedback appears in `feedback[]`
4. Update node `status` based on user decisions

## Workflow

1. **Determine plan name** — from the user's request topic
2. **Check feedback** — read `feedback[]` for any user responses
3. **Explore context** — review project files, docs, recent commits
4. **Write root node** — core topic with `status: "active"`, `parentId: null`
5. **Ask questions** — one at a time as child nodes. Use `metadata.description` for details
6. **Propose approaches** — 2-3 options as branch nodes with trade-offs
7. **Get approval per section** — update node statuses as decisions are made
8. **Clear canvas** — set all accepted nodes to `status: "done"`, set `meta.activeSkill: null`

## State Schema

```json
{
  "meta": {
    "projectName": "<plan-name>",
    "sessionId": "brainstorming",
    "activeSkill": "brainstorming",
    "agentStatus": "idle | thinking | writing | error"
  },
  "canvas": {
    "skillType": "brainstorming",
    "nodes": [
      {
        "id": "unique-string",
        "label": "short title (3-8 words)",
        "status": "pending | active | accepted | rejected | done",
        "progress": 0.0,
        "parentId": "parent-id | null",
        "children": ["child-id-1", "child-id-2"],
        "metadata": {
          "description": "long-form explanation",
          "tags": ["architecture", "design"]
        }
      }
    ],
    "edges": []
  },
  "feedback": [],
  "ui": { "theme": "system", "leftSidebarOpen": true, "rightSidebarOpen": true, "selectedNodeId": null }
}
```

## Key Rules

- **Plan directory**: create `.supermech/<plan>/` before writing the state file
- MindMap uses `parentId`/`children` for tree hierarchy
- `meta.activeSkill: "brainstorming"` enables the mind map view
- `meta.activeSkill: null` returns to idle canvas
- Each node gets one question or topic — don't pack multiple ideas
- User feedback arrives in `feedback[]` with `nodeId` referencing the target node
- `meta.projectName` should match the plan directory name
