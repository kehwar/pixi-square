# PRD: Project Setup

## Problem Statement

All technology decisions for the colony management game are locked and documented. The PixiJS sub-skills are installed. However, no project files exist: there is no `package.json`, no `src/`, no configuration files, and no dev server. Until the project is scaffolded, nothing can be built, tested, or run.

## Solution

Use `npm create vue@latest` to bootstrap the project, and `npm create pixi@latest` (in a temporary directory) to inspect the canonical PixiJS v8 Vite scaffold. Merge the relevant parts of the PixiJS output into the Vue project, install all dependencies, replace the generated ESLint config with `@antfu/eslint-config`, and wire up the minimal integration: a persistent PixiJS canvas with a Vue Router overlay on top.

The final `src/` directory structure is not pre-decided. It is determined during implementation by inspecting what both scaffold tools actually generate.

## User Stories

1. As a developer, I want to bootstrap the project with `npm create vue@latest`, so I get a Vite + Vue 3 + TypeScript + Vue Router + Pinia baseline with generated config files.
2. As a developer, I want TypeScript configured with strict mode, so type errors are caught at compile time from the very first file.
3. As a developer, I want Vitest wired into the Vite pipeline, so the test runner shares the same build config with no separate setup.
4. As a developer, I want ESLint configured from the start, so code quality is enforced on every commit.
5. As a developer, I want to inspect the canonical `npm create pixi@latest` Vite scaffold in a temporary directory, so I understand the PixiJS project structure before merging it into the Vue project.
6. As a developer, I want the final `src/` directory structure to be derived from what both scaffold tools generate, so the layout reflects the tools' conventions rather than an abstract pre-decision.
7. As a developer, I want the PixiJS entry-point merged into the Vue project, so there is a single `package.json`, `vite.config.ts`, and `tsconfig.json`.
8. As a developer, I want `pixi.js` and `@pixi/sound` as production dependencies, so the rendering engine and audio library are available from the first game file.
9. As a developer, I want `@vue/test-utils` as a dev dependency, so Vue components can be mounted and queried in tests.
10. As a developer, I want `@antfu/eslint-config` as the sole ESLint config, so Vue 3, TypeScript, and formatting rules are enforced without Prettier and without managing multiple plugins.
11. As a developer, I want a PixiJS `Application` singleton module that exports `initApp(container)` and `destroyApp()`, so the rest of the codebase has a single non-reactive entry point to the renderer.
12. As a developer, I want a root layout component that calls `initApp()` on mount and renders `<RouterView>` as an overlay above the canvas, so the PixiJS canvas is always alive regardless of the active route.
13. As a developer, I want Vue Router configured in hash mode with three placeholder routes (`/`, `/game`, `/settings`), so navigation is verifiable as soon as the integration is wired.
14. As a developer, I want `vite build` to produce a fully static `dist/` directory, so the output is deployable to GitHub Pages or Netlify without modification.
15. As a developer, I want `npm run dev`, `npm run build`, `npm run test`, and `npm run lint` all passing after the merge, so the project is fully operational.

## Implementation Decisions

### Scaffolding tools

- Vue project: `npm create vue@latest` with TypeScript, Vue Router, Pinia, Vitest, and ESLint; Prettier and Playwright not selected.
- PixiJS reference: `npm create pixi@latest` using the `bundler-vite` TypeScript template, run in a temporary directory for inspection only and discarded after the merge.
- The final `src/` structure is decided during the merge, informed by both scaffold outputs.

### ESLint

- `@antfu/eslint-config` replaces whatever the Vue scaffold generates. No Prettier.

### TypeScript

- `strict: true` must be present in the final `tsconfig.json`. Any PixiJS tsconfig options merged in must not remove or weaken it.

### Vitest

- Environment: `happy-dom`. Globals: `true`.

### PixiJS Application module

- Exports `initApp(container: HTMLElement)` and `destroyApp()`.
- `Application.init()` options: `resizeTo: container`, `autoDensity: true`, `antialias: false`, `preference: 'webgl'`.
- This module imports nothing from Vue. It is a plain TypeScript module.

### Root layout component

- Calls `initApp` on mount with a full-viewport container element; calls `destroyApp` on unmount.
- Renders a `<RouterView>` in an absolutely-positioned overlay (`z-index: 10`, `pointer-events: none`) above the canvas.
- Is the parent component for all three routes in the router config so the canvas is never destroyed on navigation.

### Vue Router

- Hash mode (`createWebHashHistory`).
- Three child routes under the layout component: `/` → MainMenuView, `/game` → GameView, `/settings` → SettingsView. All three are placeholder views for this PRD.

### Layer boundary

- The game module (PixiJS) imports nothing from `vue`, `vue-router`, or `pinia`.
- Vue components and Pinia stores import no PixiJS objects and store none in `ref()` or `reactive()`.

## Testing Decisions

A good test for this scaffolding phase verifies observable behaviour at module or component boundaries — not implementation details. Tests should not assert on internal variable names, specific CSS class names, or PixiJS internals.

The following is testable in this phase:

- **`AppLayout` mounts and initialises PixiJS**: mock `initApp` and `destroyApp`, mount `AppLayout` with `@vue/test-utils`, assert `initApp` was called with an `HTMLElement` on mount and `destroyApp` was called on unmount.
- **Router navigation**: mount the full app with `createMemoryHistory`, push to `/`, `/game`, and `/settings`, assert the correct view component is rendered via `RouterView`.

Game-loop logic, PixiJS rendering, and Pinia stores are not testable in this phase because those modules are empty placeholders. Tests for them belong to the PRDs that implement them.

## Out of Scope

- Game mechanics, colony simulation, entity AI, pathfinding — future PRDs.
- Pinia store definitions — separate PRD.
- PixiJS scene graph construction — separate PRD.
- Input abstraction layer and gamepad polling — separate PRD.
- Audio loading and playback — separate PRD.
- HUD component implementation — separate PRDs.
- CI/CD, deployment pipeline, asset compression tooling.
- Online/networked multiplayer — explicitly out of scope for the entire project.
- Mobile packaging (Capacitor, Cordova, etc.), accessibility, i18n.

## Further Notes

- PixiJS objects must never be wrapped in Vue's `ref()` or `reactive()`. This constraint is enforced architecturally by the directory split: `src/game/` is a Vue-free zone. Future implementation PRDs must respect this.
- `@antfu/eslint-config` enables `no-console` by default. During scaffolding, suppress it for `src/game/app.ts` with an inline disable comment if `console.warn` is used for renderer fallback logging.
- The `happy-dom` test environment has no WebGL support. All tests that touch `src/game/` must mock `initApp` and `destroyApp` at the module boundary; they must not instantiate a real `Application`.
- Technology stack decisions (framework choices, audio library rationale, input model, multiplayer model, deployment target) are recorded in the previous decisions document and are not repeated here.
