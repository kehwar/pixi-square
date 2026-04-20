# Project Guidelines

See [README.md](README.md) for the full tech stack, project structure, and dev commands.

## Architecture

**Boundary rule** — `src/game/` is a Vue-free zone. Files inside it must have zero imports from `vue`, `vue-router`, or `pinia`. Vue components and Pinia stores must have zero imports of PixiJS objects.

**Canvas model** — The PixiJS `Application` is a plain module-level singleton (`src/game/app.ts`). It must never be stored inside `ref()`, `reactive()`, or any other Vue reactive container.

**Layer model** — `AppLayout.vue` renders a persistent full-viewport PixiJS canvas and a `position: fixed; z-index: 10` UI overlay (`<RouterView>`) on top. The canvas stays alive for the entire session; only the overlay content changes on navigation.

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

`docs/archive/` contains completed PRDs and implementation plans from prior phases. They are historical records only — do not treat their contents as pending work or current guidance.
