# Project Guidelines

See [README.md](README.md) for the full tech stack, project structure, and dev commands.

## Agent orientation

### Before exploring, read these

- **`CONTEXT.md`** at the repo root — the shared domain glossary and language for this project
- **`docs/adr/`** — read ADRs that touch the area you're about to work in
- **`ISSUE_TRACKER.md`** — read the issue tracker guidelines before creating or working on issues

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront.

### File structure

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-first-decision.md
│   └── 0002-another-decision.md
└── src/
```

### Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

### Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_

## Architecture

**Boundary rule** — `src/game/` is a Vue-free zone. Files inside it must have zero imports from `vue`, `vue-router`, or `pinia`. Vue components and Pinia stores must have zero direct imports of Phaser objects; they interact with the game exclusively through `EventBus` and the `StartGame` factory.

**Canvas model** — The Phaser `Game` instance is created by `PhaserGame.vue` on mount and destroyed on unmount. It must never be stored inside `ref()`, `reactive()`, or any other Vue reactive container.

**Layer model** — `AppLayout.vue` renders a persistent full-viewport Phaser canvas (`PhaserGame.vue`) and a `position: fixed; z-index: 10` UI overlay (`<RouterView>`) on top. The canvas stays alive for the entire session; only the overlay content changes on navigation.

**Router** — Hash mode (`createWebHashHistory`). Routes: `#/` → `MainMenuView`, `#/game` → `GameView`, `#/settings` → `SettingsView`.

## Build and Test

```sh
npm install
npm run dev          # dev server
npm run build        # type-check + production build
npm run test:unit    # Vitest unit tests
npm run lint         # ESLint auto-fix
```

## Archived Docs

`docs/development-log/` contains dev log entries for completed phases. `docs/prd/` and `docs/plans/` hold active or future work. Treat completed log entries as historical records only — do not treat their contents as pending work or current guidance.
