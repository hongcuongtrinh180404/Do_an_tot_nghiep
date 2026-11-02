---
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
---

# /grill-me - Interactive Plan Stress-Testing

$ARGUMENTS

---

## Purpose

This command activates the GRILL-ME mode. It initiates a relentless, Socratic interview process to stress-test plans, architectures, or designs. It aims to walk down every branch of the decision tree, resolve decisions one-by-one, recommend options, and prevent any design holes before writing code.

---

## Behavior

When `/grill-me` is triggered:

1. **Identify the Target Plan/Design**:
   - Determine what design or plan (e.g., in a `{task-slug}.md` file or current context) is being grilled.
   - If no specific plan exists, start by asking about the overall objective.

2. **Conduct the Relentless Interview**:
   - Ask clarifying, edge-case, and architectural questions **one at a time**.
   - For every question, present your recommended option with justification.
   - If a question can be resolved by inspecting the codebase, explore the codebase first instead of asking.

3. **Explore Decision Branches**:
   - Walk down dependencies between decisions (e.g., "If we choose database approach A, how do we handle concurrency B?").

4. **Iterate**:
   - Keep interviewing and refining the plan until all branches are resolved and a shared understanding is reached.

---

## Output Format

For each question in the grill session:

```markdown
### 🔍 Grill Session: Question [N]

[Your deep, challenging question about the design/plan, highlighting potential edge cases or architectural risks]

💡 **Recommended Approach:**
[Your recommendation + reasoning]

_How would you like to proceed or handle this?_
```

---

## Examples

```
/grill-me
/grill-me integration module architecture
/grill-me database schema for inventory tracking
```
