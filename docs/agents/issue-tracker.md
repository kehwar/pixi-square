# Issue tracker: Local Markdown

Issues and PRDs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The PRD is `.scratch/<feature-slug>/PRD.md`
- Implementation issues are `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## When working on an issue

1. **Mark criteria complete** — As each acceptance criterion is satisfied, check it off in the issue file (change `- [ ]` to `- [x]`).
2. **Update status** — Change the `Status:` line to reflect the current state (e.g. `ready-for-agent` → `closed` when all criteria are met).
3. **Add a comment** — Append a comment under the `## Comments` heading with:
   - A brief summary of what was done
   - Any decisions or trade-offs made
   - References to relevant files or commits
   - The date (ISO 8601)

Example comment block:

```
## Comments

### 2026-05-02 — Agent
Implemented X by updating `src/game/foo.ts`. Chose Y over Z because …
```
