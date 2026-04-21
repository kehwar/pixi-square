---
date: 2026-04-20
---

# Project Setup: PixiJS + Vue 3 Integration Retrospective

## Problem Statement

The project needed a working dev environment combining Vue 3 (for UI and routing) with PixiJS v8 (for the game canvas). Neither scaffold tool produces this combination out of the box — the Vue scaffold has no PixiJS, and the PixiJS scaffolds have no Vue. The setup required a four-phase process: Vue baseline → PixiJS scaffold inspection → config merge → canvas integration.

## Solution

Bootstrapped with `npm create vue@latest` (TypeScript, Router, Pinia, Vitest, ESLint; no Prettier), inspected three PixiJS templates (`bundler-vite`, `creation-web`, `framework-react`), merged `bundler-vite` config decisions into the Vue project, and wired up the canvas integration:

- **`src/game/app.ts`** — module-level singleton exporting `initApp(container: HTMLElement): Promise<void>` and `destroyApp(): void`. Imports nothing from Vue.
- **`src/views/AppLayout.vue`** — mounts the canvas on mount, calls `destroyApp` on unmount, and renders a `position: fixed; inset: 0; z-index: 10; pointer-events: none` overlay containing `<RouterView>`.
- **Router** — hash mode (`createWebHashHistory`), three routes under `AppLayout`: `#/` → `MainMenuView`, `#/game` → `GameView`, `#/settings` → `SettingsView`.

`destroyApp` calls:
```ts
app.destroy({ removeView: true, releaseGlobalResources: true }, { children: true })
```
to prevent stale textures on future re-init.

## Implementation Decisions

**Vue-free `src/game/` zone** — PixiJS objects must never be stored in Vue reactive containers (`ref`, `reactive`). Wrapping an `Application` in a `ref` causes proxy overhead and reactive cycles. The directory boundary enforces this structurally.

**`@antfu/eslint-config` replaces the generated ESLint stack** — consolidates Vue 3, TypeScript, and formatting rules into a single package; eliminates Prettier; provides `no-console`, import ordering, and more without manual plugin wiring. Packages removed: `@vue/eslint-config-typescript`, `eslint-plugin-vue`, `@vitest/eslint-plugin`, `eslint-plugin-oxlint`, `oxlint`. Lint script simplified to `"eslint . --fix --cache"`.

**`happy-dom` over `jsdom`** — lighter and faster for Vue component tests. `@types/jsdom` and `jsdom` removed. Vitest config gains `environment: 'happy-dom'` and `globals: true`.

**`noUncheckedSideEffectImports: true` added to `tsconfig.app.json`** — present in the PixiJS `bundler-vite` template but absent from the Vue scaffold. Catches unintentional side-effect imports.

**`routes` array exported separately from the router singleton** (`src/router/index.ts`) — allows tests to instantiate a fresh `createMemoryHistory()` router without importing the module-level singleton.

**`AppLayout.vue` uses `useTemplateRef<HTMLElement>('canvas-container')`** — Vue 3.5 API; preferred over `ref<HTMLElement | null>(null)` + manual casting.

**PixiJS entry uses an async IIFE, not top-level `await`**:
```ts
(async () => {
  await app.init(/* options */)
})()
```
Required workaround for a Vite ≤6.0.6 production-build failure with top-level `await`.

**`@antfu/eslint-config` Vitest integration key is `test: true`, not `vitest: true`**:
```ts
// Wrong — causes vue-tsc type error:
antfu({ vitest: true })

// Correct:
antfu({ test: true })
```

**`tsconfig.vitest.json` `"lib"` must include DOM types** — the scaffold generated `"lib": []`, which stripped all inherited lib targets and made `HTMLElement` unknown in test files. Fixed to `"lib": ["DOM", "DOM.Iterable"]`.

**`AppLayout` test routes to a `DummyView` stub, not `AppLayout` itself** — routing `/` → `AppLayout` as the route component caused `<RouterView>` to mount a second `AppLayout` recursively, doubling the `initApp` call count. Using a local `DummyView` component avoids this.

**PixiJS CLI package name is `create-pixi.js`, not `create-pixi`**:
```sh
npm create pixi.js@latest pixi-scaffold -- --template bundler-vite
```

**`test:unit` not `test`** — `npm create vue@latest` registers the Vitest script as `test:unit`. Plan/PRD referenced `npm run test` but meant `npm run test:unit` in practice.

## Alternatives Considered

| Alternative | Rejected because |
|---|---|
| `creation-web` as merge basis | Brings AssetPack, CreationEngine, navigation system — all out of scope |
| Top-level `await` in `src/game/app.ts` | Vite ≤6.0.6 production-build bug |
| Keeping `jsdom` | No advantage over `happy-dom`; more bloat |
| `vitest: true` in `antfu()` | TypeScript type error during `vue-tsc --build` |
| Routing `/` → `AppLayout` in tests | Recursive `<RouterView>` render doubles `initApp` calls |

## Further Notes

- Dev server, build, lint, and tests all pass after Phase 4.
- The canvas stays alive across route changes; only the Vue overlay content swaps.
- `src/game/` Vue-free boundary is enforced by convention — no automated linting guard currently exists for cross-boundary imports.
- `happy-dom` has no WebGL support; any test that touches `src/game/` must mock `initApp`/`destroyApp` at the module boundary.
- Three PixiJS scaffold templates are retained under `references/` for comparison.
