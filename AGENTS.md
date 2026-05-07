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

> **Migration in progress**: The project is migrating from a single-game monolith to a **multi-game collection framework**. See the epic `pixi-square-ejb` for full details. During transition, both old and new patterns may coexist.

### Multi-Game Model (Target Architecture)

**Boundary rule** — `src/shared/` and `src/games/{gameId}/` are Vue-free zones (except `components/` and `views/` subdirs). Files inside `systems/`, `utils/`, and `scenes/` must have zero imports from `vue`, `vue-router`, or `pinia`. Vue components and Pinia stores must have zero direct imports of Phaser objects; they interact exclusively through game-scoped `EventBus` and the `StartGame` factory.

**Canvas model** — Each game gets its own Phaser `Game` instance, created by `{Game}GameView.vue` on mount and destroyed on unmount. It must never be stored inside `ref()`, `reactive()`, or any other Vue reactive container.

**Layer model** — `AppLayout.vue` renders a dynamic overlay (`<RouterView>`) on top of the currently-active game canvas. Routes determine which game (and canvas) is active. Only the overlay content and active game change on navigation.

**Router** — Hash mode (`createWebHashHistory`). Static routes: `#/` → `MenuView`, `#/settings` → `SettingsView`. Dynamic routes registered at startup: `#/{gameId}` → `{Game}GameView` (e.g., `#/grid-world` → `GridWorldGameView`).

**Game Registry** — Loaded once at app startup. Each game exports a manifest (`{ id, title, thumbnail, sceneNames, startScene }`). Router dynamically registers routes based on available manifests.

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
