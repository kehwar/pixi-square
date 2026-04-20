> **ARCHIVED — all phases completed on 2026-04-20.** This document is a historical record of implementation decisions and notes. Do not treat anything here as pending work, open decisions, or current guidance.

# Plan: Project Setup

> Source PRD: `docs/prd/project-setup.md`

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: Hash mode — `#/` (MainMenu), `#/game` (Game), `#/settings` (Settings). Using `createWebHashHistory()`.
- **Canvas model**: PixiJS `Application` is a plain module-level singleton. It is never stored in `ref()`, `reactive()`, or any Vue reactive container.
- **Layer model**: a persistent full-viewport canvas element (PixiJS) with a `z-index: 10` absolutely-positioned UI overlay (`<RouterView>`) rendered on top. Both live inside a single root layout component.
- **Boundary rule**: the game module (PixiJS code) has zero imports from `vue`, `vue-router`, or `pinia`. Vue components and Pinia stores have zero imports of PixiJS objects.
- **Structure rule**: the final `src/` directory layout is not pre-decided. It is derived during Phase 3 by inspecting the actual outputs of both scaffold tools.

---

## Phase 1: Vue Baseline

> ✅ Completed — Vue 3 + TypeScript + Router + Pinia + Vitest + ESLint scaffolded; build, test, and lint all pass.

**User stories**: 1, 2, 3, 4, 5

### What to build

Run `npm create vue@latest` in the project root and confirm the generated project runs. This phase ends with a working dev server and a passing lint run — no PixiJS code is touched.

Select during scaffold: TypeScript, Vue Router, Pinia, Vitest, ESLint.
Do **not** select: Prettier, Playwright.

### Acceptance criteria

- [x] `npm create vue@latest` completes without errors.
- [x] `npm install` completes without errors.
- [x] `npm run dev` starts the dev server and the default Vue welcome page is visible in the browser.
- [x] `npm run build` produces a `dist/` directory.
- [x] `npm run test` runs and exits cleanly (scaffold placeholder tests pass or are skipped).
- [x] `npm run lint` runs and exits cleanly.
- [x] `tsconfig.json` contains `"strict": true`.

### Notes

- `create-vue@3.22.3` does not accept `--no-jsx`, `--no-playwright`, or `--no-prettier` flags; only the positive feature flags are supported. The scaffold was run as `npm create vue@latest . -- --ts --router --pinia --vitest --eslint --force` and answered the package-name prompt interactively with `pixi-square`. Prettier and Playwright are simply absent from the output.
- The scaffold generates `test:unit` (not `test`) as the Vitest script name. References to `npm run test` in this plan and the PRD mean `npm run test:unit` in practice.
- The lint pipeline includes `oxlint` as a first pass (`lint:oxlint`) followed by `lint:eslint`. Both pass with zero warnings/errors.
- `"strict": true` is not written directly into `tsconfig.app.json` — it is inherited via `@vue/tsconfig/tsconfig.json` (the base of `@vue/tsconfig/tsconfig.dom.json`). The effective setting is `true`.
- `npm run dev` (browser visible) verified manually.

---

## Phase 2: PixiJS Scaffold Inspection

> ✅ Completed — Three templates scaffolded and inspected: `bundler-vite`, `creation-web`, and `framework-react`. All retained under `references/pixi-bundler-vite/`, `references/pixi-creation-web/`, and `references/pixi-framework-react/`.

**User stories**: 6, 7

### What to build

Run `npm create pixi@latest` in a **temporary sibling directory** (e.g., `../pixi-scaffold`) — not in the project root. Select the `bundler-vite` template with TypeScript. Inspect and document the generated output so Phase 3 can make informed merge decisions.

No files are added to the main project in this phase.

### Acceptance criteria

- [x] `npm create pixi@latest` completes in the temporary directory without errors.
- [x] The following items from the generated output are read and understood before proceeding to Phase 3:
  - `src/` file layout and entry-point filename
  - `vite.config.ts` content (plugins, build options)
  - `tsconfig.json` content (compiler options, lib targets)
  - Any `package.json` dependencies beyond `pixi.js`
- [x] The temporary directory is retained until Phase 3 is complete, then discarded.
  - All scaffolds moved into `references/`: `pixi-bundler-vite/`, `pixi-creation-web/`, `pixi-framework-react/`

### Notes

**Correct CLI package name**: the package is `create-pixi.js`, not `create-pixi`. The correct invocation is:
```
npm create pixi.js@latest pixi-scaffold -- --template bundler-vite
```

### `bundler-vite` template (`references/pixi-bundler-vite/`)
```
src/
  main.ts          ← sole entry point
  vite-env.d.ts    ← Vite client type reference
```
No subdirectories. The scaffold does not impose any folder conventions beyond `src/`.

**Entry point pattern** — `src/main.ts` uses an async IIFE (not top-level `await`), consistent with the Vite ≤6.0.6 production-build safety rule:
```ts
(async () => {
  const app = new Application()
  await app.init({ background: '#1099bb', resizeTo: window })
  document.getElementById('pixi-container')!.appendChild(app.canvas)
  // ...
})()
```
The canvas is appended to a `<div id="pixi-container">` in `index.html`.

**`vite.config.ts`** — nearly empty; no PixiJS-specific plugins required:
```ts
export default defineConfig({
  server: { port: 8080, open: true },
})
```
No special `build` options or plugins. The Vue project's Vite config does not need PixiJS-specific additions.

**`tsconfig.json`** — compiler options of note:
- `"target": "ES2020"`, `"lib": ["ES2020", "DOM", "DOM.Iterable"]`
- `"moduleResolution": "bundler"`, `"isolatedModules": true`, `"moduleDetection": "force"`
- `"strict": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, `"noUncheckedSideEffectImports": true`
- `"noEmit": true` (type-check only; Vite handles emit)

The Vue scaffold already uses `@vue/tsconfig` which sets most of these. Key additions to consider for Phase 3: `"noUncheckedSideEffectImports": true` and confirming `"target"` is at least ES2020.

**`package.json` dependencies** beyond `pixi.js`:
- Production: only `pixi.js: "^8.8.1"` — no other runtime deps.
- Dev: `vite ^6.2.0`, `typescript ~5.7.3`, ESLint stack (`@eslint/js`, `typescript-eslint`), **plus `prettier`, `eslint-config-prettier`, `eslint-plugin-prettier`** — all Prettier packages will be dropped in Phase 3 in favour of `@antfu/eslint-config`.

**ESLint config** — uses `eslint-plugin-prettier/recommended` on top of `typescript-eslint`. This entire config is discarded in Phase 3.

---

### `creation-web` template (`pixi-create-web-scaffold/`)

Also scaffolded and inspected for comparison. `creation-web` is a batteries-included game starter — it is **not** the basis for the merge, but informs what a production PixiJS project structure looks like.

**`src/` layout**:
```
src/
  main.ts
  vite-env.d.ts
  pixi-mixins.d.ts
  app/
    getEngine.ts
    screens/
    popups/
    ui/
    utils/
  engine/
    engine.ts        ← CreationEngine class wrapping Application
    audio/
    navigation/
    resize/
    utils/
scripts/
  assetpack-vite-plugin.ts
raw-assets/          ← source assets processed by AssetPack at build time
```

**Entry point** — same async IIFE pattern; drives a `CreationEngine` wrapper (not raw `Application`).

**`vite.config.ts`** — adds `assetpackPlugin()` and `define.APP_VERSION`. The AssetPack plugin requires `@assetpack/core` and a `scripts/assetpack-vite-plugin.ts` shim. Not needed for this project.

**`tsconfig.json`** — identical to `bundler-vite`.

**`package.json` runtime deps beyond `pixi.js`**: `@pixi/sound ^6.0.1`, `@pixi/ui ^2.2.2`, `@esotericsoftware/spine-pixi-v8 ^4.2.74`, `motion ^12.4.7`. Dev: adds `@assetpack/core ^1.4.0`. None of these extras are needed for the current PRD (`@pixi/sound` is a PRD dep but comes from this list).

**Phase 3 decision**: use `bundler-vite` as the merge basis. Take `@pixi/sound ^6.0.1` version pin from `creation-web`. The `CreationEngine`, navigation system, AssetPack pipeline, and resize system are out of scope for this PRD.

---

### `framework-react` template (`references/pixi-framework-react/`)

Inspected as an additional data point only. Not relevant to the merge — the project uses Vue, not React.

**`src/` layout**:
```
src/
  main.tsx        ← React entry, mounts <App /> into #pixi-container
  App.tsx         ← renders <Application> from @pixi/react with child components
  vite-env.d.ts
```

**Key observations**:
- Uses `@pixi/react ^8.0.0` which wraps PixiJS Application in a React context provider (`<Application>` component). Scene nodes are written as JSX (`<pixiSprite>`, `<pixiContainer>`) via `extend({...})` registration.
- Runtime deps: `@pixi/react ^8.0.0`, `pixi.js ^8.8.1`, `react ^19`, `react-dom ^19`.
- No `@pixi/sound`, no navigation system — it is a thin wrapper template.
- `vite.config.ts` adds `@vitejs/plugin-react` — the only Vite plugin difference from `bundler-vite`.
- `tsconfig.json` identical to `bundler-vite`.
- Confirms that with Vue we wire PixiJS manually (no `@pixi/react` equivalent exists for Vue in the official templates); our `initApp`/`destroyApp` singleton pattern is the correct approach.

---

## Phase 3: Config and Dependency Merge

> ✅ Completed — pixi.js + @pixi/sound added as deps; @antfu/eslint-config + happy-dom added as devDeps; redundant ESLint/jsdom packages removed; eslint.config.ts replaced with antfu(); vitest switched to happy-dom + globals; noUncheckedSideEffectImports added to tsconfig; src/ structure decided; build, lint, and test all pass.

**User stories**: 8, 9, 10, 11, 12, 16, 17 (partial)

### What to build

Merge the PixiJS scaffold's configuration decisions into the Vue project without yet adding any PixiJS runtime code. This phase settles the `src/` directory structure, unifies `tsconfig.json` and `vite.config.ts`, installs all remaining dependencies, and replaces the generated ESLint config with `@antfu/eslint-config`.

The `src/` layout is decided here based on the two scaffold outputs. It is recorded in the plan as a steering correction once known.

### Acceptance criteria

- [x] The final `src/` directory structure is decided and documented (as a comment or addendum to this plan).
- [x] `pixi.js` and `@pixi/sound` are in `dependencies`.
- [x] `@vue/test-utils` and `@antfu/eslint-config` are in `devDependencies`.
- [x] Any ESLint packages made redundant by `@antfu/eslint-config` are removed.
- [x] `eslint.config.ts` calls `antfu()` from `@antfu/eslint-config` only — no Prettier config present.
- [x] `tsconfig.json` retains `"strict": true` after any merge of PixiJS tsconfig options.
- [x] Vitest config has `environment: 'happy-dom'` and `globals: true`.
- [x] `npm run build` produces a valid `dist/` directory.
- [x] `npm run lint` passes with zero errors.
- [x] `npm run test` passes (scaffold placeholder tests may be removed if they conflict).

### Notes

**`src/` directory structure** (decision recorded here per acceptance criteria):
```
src/
  main.ts           ← Vue entry point
  App.vue           ← Root Vue component
  vite-env.d.ts     ← Vite client type reference
  assets/           ← Static assets (CSS, images)
  components/       ← Reusable Vue components
  router/           ← Vue Router setup
  stores/           ← Pinia stores
  views/            ← Route view components
  game/             ← PixiJS code — Vue-free zone (created in Phase 4)
    app.ts          ← Application singleton (initApp / destroyApp)
```

**Packages removed**: `@vue/eslint-config-typescript`, `eslint-plugin-vue`, `@vitest/eslint-plugin`, `eslint-plugin-oxlint`, `oxlint`, `@types/jsdom`, `jsdom`. Also deleted `.oxlintrc.json`.

**Packages added**:
- Dependencies: `pixi.js`, `@pixi/sound ^6.0.1`
- DevDependencies: `@antfu/eslint-config`, `happy-dom`

**Lint script simplified**: `"lint": "eslint . --fix --cache"` — the `lint:oxlint` + `lint:eslint` split is gone.

**tsconfig addition**: `"noUncheckedSideEffectImports": true` added to `tsconfig.app.json` (from PixiJS bundler-vite template).

**`tsconfig.vitest.json` types updated**: `"jsdom"` → `"vitest/globals"` to match globals mode.

**`@antfu/eslint-config` API note**: the vitest integration option key is `test: true`, not `vitest: true` (the latter caused a TypeScript type error during `vue-tsc --build`).

---

## Phase 4: Canvas Integration

> ✅ Completed — PixiJS Application singleton, AppLayout component, three placeholder views, hash-mode router, and unit tests all wired up; build, lint, and test all pass.

**User stories**: 13, 14, 15, 17 (full verification)

### What to build

Wire up the PixiJS–Vue integration: the Application singleton module, the root layout component, and the three placeholder route views. After this phase, the dev server shows a live PixiJS canvas with a Vue UI overlay, and navigating between `#/`, `#/game`, and `#/settings` swaps the overlay content while the canvas stays alive.

### Acceptance criteria

- [x] A PixiJS Application singleton module exists that exports `initApp(container: HTMLElement)` and `destroyApp()`. It imports nothing from Vue.
- [x] A root layout component exists that calls `initApp()` on mount (attaching the canvas to the DOM) and `destroyApp()` on unmount.
- [x] The layout component renders a `<RouterView>` overlay (`z-index: 10`, `pointer-events: none`) above the canvas.
- [x] Vue Router is configured in hash mode with `AppLayout` as the parent route and three child routes: `#/` → `MainMenuView`, `#/game` → `GameView`, `#/settings` → `SettingsView`.
- [x] Navigating between all three routes in the browser works; the canvas does not flicker or reinitialise on navigation.
- [x] The PixiJS canvas resizes when the browser window is resized.
- [x] `npm run dev`, `npm run build`, `npm run test`, and `npm run lint` all pass with zero errors.
- [x] `AppLayout` unit test: mock `initApp`/`destroyApp`, assert `initApp` is called with an `HTMLElement` on mount and `destroyApp` is called on unmount.
- [x] Router unit test: push to `#/`, `#/game`, `#/settings` and assert the correct placeholder view is rendered each time.

### Notes

**`src/game/app.ts`** — exports `initApp(container: HTMLElement): Promise<void>` and `destroyApp(): void`. `destroyApp` calls `app.destroy({ removeView: true, releaseGlobalResources: true }, { children: true })` to prevent stale textures on future re-initialisation.

**`src/views/AppLayout.vue`** — uses `useTemplateRef<HTMLElement>('canvas-container')` (Vue 3.5 API) to get the canvas container. The UI overlay wraps `<RouterView>` in a `<div class="ui-overlay">` with `position: fixed; inset: 0; z-index: 10; pointer-events: none`.

**Router** — `routes` array exported separately from `src/router/index.ts` so the router test can create a fresh `createMemoryHistory()` instance without importing the singleton.

**`tsconfig.vitest.json` fix** — the pre-existing `"lib": []` override stripped DOM types, causing `HTMLElement` to be unknown in test files and their source imports. Changed to `"lib": ["DOM", "DOM.Iterable"]`.

**`AppLayout` test isolation** — the test router must use a different component (not `AppLayout`) as the route component. Using `AppLayout` as its own route caused `<RouterView>` inside it to recursively render a second `AppLayout`, doubling the `initApp` call count. Fixed by routing `/` to a `DummyView` component instead.

**`App.vue`** simplified to `<template><RouterView /></template>` — all scaffold content removed.

**Bunny preview** — `public/bunny.png` copied from `references/pixi-bundler-vite/`. `src/game/app.ts` loads the texture via `Assets.load`, creates a centered `Sprite`, and rotates it on every tick as a smoke-test that the render loop is alive.
