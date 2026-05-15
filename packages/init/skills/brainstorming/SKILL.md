---
name: supermech-brainstorming
description: "You MUST use this before any creative work — creating features, building components, adding functionality, or modifying behavior. Same Socratic questioning process, but structured output is written to .supermech/<plan>/state-brainstorming.json for the Supermech MindMap to render in real time."
---

# Visual Brainstorming

Turn ideas into structured, visualized designs through Socratic collaborative dialogue. Every artifact is written as tree nodes so the frontend renders an interactive mind map in real time.

<HARD-GATE>
Do NOT invoke any implementation skill, write any code, scaffold any project, or take any implementation action until you have presented a design and the user has approved it. This applies to EVERY project regardless of perceived simplicity.
</HARD-GATE>

## Plan Directory

Every brainstorming session creates a plan directory named after the user's request topic. Use a short, descriptive name in the user's language. The directory lives under `.supermech/`.

Examples:
- "分析用户系统架构" → `.supermech/用户系统/state-brainstorming.json`
- "Design payment flow" → `.supermech/payment-flow/state-brainstorming.json`
- "重构权限模块" → `.supermech/权限模块/state-brainstorming.json`

If the user refers to an existing topic, reuse the same plan directory. Otherwise create a new one. Ensure the plan directory exists before writing:

```bash
mkdir -p .supermech/<plan>/
```

## How Visual Brainstorming Works

| Aspect | Standard Brainstorming | Visual Brainstorming |
|--------|----------------------|---------------------|
| Output medium | Terminal chat | `.supermech/<plan>/state-brainstorming.json` tree JSON |
| User input | Terminal reply | `state.feedback[]` entries in the JSON |
| State visibility | Implicit in conversation | MindMap renders tree in real time |
| Node lifecycle | Implicit | Explicit `status` field per node |

## Anti-Pattern: "This Is Too Simple To Need A Design"

Every project goes through this process. A todo list, a single-function utility, a config change — all of them. "Simple" projects are where unexamined assumptions cause the most wasted work. The design can be short (a few sentences for truly simple projects), but you MUST present it and get approval.

## Checklist

You MUST complete these items in order:

1. **Determine plan name** — from the user's request topic, create the plan directory under `.supermech/`
2. **Explore project context** — check files, docs, recent commits to understand the current state
3. **Write root node** — set `meta.activeSkill: "brainstorming"`, create root node with `status: "active"`, representing the core topic
4. **Scale assessment** — if the request covers multiple independent subsystems, flag this. Suggest decomposition into sub-topics (each gets its own plan directory). For appropriately-scoped work, proceed.
5. **Ask clarifying questions** — ONE question at a time, branching child nodes from the active node. Prefer multiple choice when possible. Understand purpose, constraints, success criteria.
6. **Propose 2-3 approaches** — each as a child branch, with trade-offs and your recommendation. Lead with your recommended option and explain why.
7. **Present design** — in sections scaled to their complexity, get approval after each section, update node statuses as decisions are made
8. **Write design doc** — save to `.supermech/<plan>/<YYYY-MM-DD>-design.md` (write your design reasoning in natural language so it's preserved)
9. **Spec self-review** — check for placeholders, contradictions, ambiguity, scope gaps (see below)
10. **Clear canvas** — set all accepted nodes to `status: "done"`, set `meta.activeSkill: null`

## The Process

### Understanding the idea

- Check out the current project state first (files, docs, recent commits)
- Before asking detailed questions, assess scope: if the request describes multiple independent subsystems, flag this immediately. Help the user decompose: what are the independent pieces, how do they relate, what order should they be built?
- For appropriately-scoped projects, ask questions ONE at a time to refine the idea
- Prefer multiple choice questions when possible, but open-ended is fine too
- Only one question per message — break multi-topic exploration into separate questions
- Focus on understanding: purpose, constraints, success criteria

### Exploring approaches

- Propose 2-3 different approaches with trade-offs
- Present options conversationally with your recommendation and reasoning
- Lead with your recommended option and explain why

### Presenting the design

- Once you believe you understand what you're building, present the design
- Scale each section to its complexity: a few sentences if straightforward, deeper if nuanced
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing
- Be ready to go back and clarify if something doesn't make sense

### Design for isolation and clarity

- Break the system into smaller units that each have one clear purpose
- Can someone understand what a unit does without reading its internals?
- Can you change internals without breaking consumers? If not, boundaries need work.

### Working in existing codebases

- Explore the current structure before proposing changes. Follow existing patterns.
- Where existing code has problems that affect the work (overgrown files, unclear boundaries), include targeted improvements as part of the design
- Don't propose unrelated refactoring. Stay focused on what serves the current goal.

## After the Design

### Documentation

- Write the validated design to `.supermech/<plan>/<YYYY-MM-DD>-design.md`
- Write the complete reasoning, decisions, and trade-offs in natural language
- This gives future sessions context they can read even if the mind map is not rendered

### Spec Self-Review

After writing, look at your output with fresh eyes:

1. **Placeholder scan:** Any "TBD", "TODO", incomplete sections, or vague requirements? Fix them.
2. **Internal consistency:** Do any sections contradict each other? Does the architecture match the feature descriptions?
3. **Scope check:** Is this focused enough for a single implementation plan, or does it need decomposition?
4. **Ambiguity check:** Could any requirement be interpreted two different ways? If so, pick one and make it explicit.

Fix any issues inline. No need to re-review — just fix and move on.

### Transition

After the spec is approved, invoke the **writing-plans** skill to create an implementation plan.

## Feedback Loop

User interaction in the visual workbench works through the `feedback[]` array:

1. **Read feedback** — check `state.feedback[]` for new entries at the start of each iteration
2. **Process by nodeId** — each feedback entry references a specific node
3. **Respond** — update node content, status, or create new child nodes based on feedback
4. **Mark processed** — the UI marks feedback as handled when the related node is updated

## State Schema

Write to `.supermech/<plan>/state-brainstorming.json`:

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
  "ui": {
    "theme": "system",
    "leftSidebarOpen": true,
    "rightSidebarOpen": true,
    "selectedNodeId": null
  }
}
```

## Key Rules

- MindMap uses `parentId`/`children` for tree hierarchy — NOT `edges[]`
- `meta.activeSkill: "brainstorming"` enables the mind map view
- `meta.activeSkill: null` returns to idle canvas
- Each node = one question, topic, or approach — don't pack multiple ideas into one node
- ONE question at a time. Break multi-topic exploration into separate branching questions.
- Update node `status` as decisions are made: `active` → `accepted` (approved) or `rejected`
- User feedback arrives in `feedback[]` with `nodeId` referencing the target node
- `sessionId` must match the skill name: `"brainstorming"`
