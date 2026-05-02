# Project Guidelines

See [README.md](README.md) for the full tech stack, project structure, and dev commands.

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

## Agent skills

### Issue tracker

Issues are tracked as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical label strings (no overrides). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
