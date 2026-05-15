---
name: supermech-brainstorming
description: Visual brainstorming with real-time mind map. Write structured tree nodes to .supermech/state-brainstorming.json for the Supermech workbench to render.
---

# Visual Brainstorming

Write structured JSON to `.supermech/state-brainstorming.json` to render a real-time mind map.

## State File

`.supermech/state-brainstorming.json`

## How It Works

1. Write a root node representing the core topic
2. Add child nodes for questions, approaches, and trade-offs
3. User selects/annotates nodes in the UI, feedback appears in `feedback[]`
4. Update node `status` based on user decisions

## Workflow

1. **Check feedback** — read `feedback[]` for any user responses
2. **Explore context** — review project files, docs, recent commits
3. **Write root node** — core topic with `status: "active"`, `parentId: null`
4. **Ask questions** — one at a time as child nodes. Use `metadata.description` for details
5. **Propose approaches** — 2-3 options as branch nodes with trade-offs
6. **Get approval per section** — update node statuses as decisions are made
7. **Write design doc** — save to `.supermech/specs/YYYY-MM-DD-<topic>.md`
8. **Clear canvas** — set all accepted nodes to `status: "done"`, set `meta.activeSkill: null`

## State Schema

```json
{
  "meta": {
    "projectName": "string",
    "sessionId": "brainstorming",
    "activeSkill": "brainstorming",
    "agentStatus": "idle | thinking | writing | error"
  },
  "canvas": {
    "skillType": "brainstorming",
    "nodes": [
      {
        "id": "string",
        "label": "short title (3-8 words)",
        "status": "pending | active | accepted | rejected | done",
        "progress": 0.0,
        "parentId": "string | null",
        "children": ["id1", "id2"],
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

- MindMap uses `parentId`/`children` for tree hierarchy
- `meta.activeSkill: "brainstorming"` enables the mind map view
- `meta.activeSkill: null` returns to idle canvas
- Each node gets one question or topic — don't pack multiple ideas
- User feedback arrives in `feedback[]` with `nodeId` referencing the target node
