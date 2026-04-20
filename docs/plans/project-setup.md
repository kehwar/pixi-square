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

**User stories**: 1, 2, 3, 4, 5

### What to build

Run `npm create vue@latest` in the project root and confirm the generated project runs. This phase ends with a working dev server and a passing lint run — no PixiJS code is touched.

Select during scaffold: TypeScript, Vue Router, Pinia, Vitest, ESLint.  
Do **not** select: Prettier, Playwright.

### Acceptance criteria

- [ ] `npm create vue@latest` completes without errors.
- [ ] `npm install` completes without errors.
- [ ] `npm run dev` starts the dev server and the default Vue welcome page is visible in the browser.
- [ ] `npm run build` produces a `dist/` directory.
- [ ] `npm run test` runs and exits cleanly (scaffold placeholder tests pass or are skipped).
- [ ] `npm run lint` runs and exits cleanly.
- [ ] `tsconfig.json` contains `"strict": true`.

---

## Phase 2: PixiJS Scaffold Inspection

**User stories**: 6, 7

### What to build

Run `npm create pixi@latest` in a **temporary sibling directory** (e.g., `../pixi-scaffold`) — not in the project root. Select the `bundler-vite` template with TypeScript. Inspect and document the generated output so Phase 3 can make informed merge decisions.

No files are added to the main project in this phase.

### Acceptance criteria

- [ ] `npm create pixi@latest` completes in the temporary directory without errors.
- [ ] The following items from the generated output are read and understood before proceeding to Phase 3:
  - `src/` file layout and entry-point filename
  - `vite.config.ts` content (plugins, build options)
  - `tsconfig.json` content (compiler options, lib targets)
  - Any `package.json` dependencies beyond `pixi.js`
- [ ] The temporary directory is retained until Phase 3 is complete, then discarded.

---

## Phase 3: Config and Dependency Merge

**User stories**: 8, 9, 10, 11, 12, 16, 17 (partial)

### What to build

Merge the PixiJS scaffold's configuration decisions into the Vue project without yet adding any PixiJS runtime code. This phase settles the `src/` directory structure, unifies `tsconfig.json` and `vite.config.ts`, installs all remaining dependencies, and replaces the generated ESLint config with `@antfu/eslint-config`.

The `src/` layout is decided here based on the two scaffold outputs. It is recorded in the plan as a steering correction once known.

### Acceptance criteria

- [ ] The final `src/` directory structure is decided and documented (as a comment or addendum to this plan).
- [ ] `pixi.js` and `@pixi/sound` are in `dependencies`.
- [ ] `@vue/test-utils` and `@antfu/eslint-config` are in `devDependencies`.
- [ ] Any ESLint packages made redundant by `@antfu/eslint-config` are removed.
- [ ] `eslint.config.js` calls `antfu()` from `@antfu/eslint-config` only — no Prettier config present.
- [ ] `tsconfig.json` retains `"strict": true` after any merge of PixiJS tsconfig options.
- [ ] Vitest config has `environment: 'happy-dom'` and `globals: true`.
- [ ] `npm run build` produces a valid `dist/` directory.
- [ ] `npm run lint` passes with zero errors.
- [ ] `npm run test` passes (scaffold placeholder tests may be removed if they conflict).

---

## Phase 4: Canvas Integration

**User stories**: 13, 14, 15, 17 (full verification)

### What to build

Wire up the PixiJS–Vue integration: the Application singleton module, the root layout component, and the three placeholder route views. After this phase, the dev server shows a live PixiJS canvas with a Vue UI overlay, and navigating between `#/`, `#/game`, and `#/settings` swaps the overlay content while the canvas stays alive.

### Acceptance criteria

- [ ] A PixiJS Application singleton module exists that exports `initApp(container: HTMLElement)` and `destroyApp()`. It imports nothing from Vue.
- [ ] A root layout component exists that calls `initApp()` on mount (attaching the canvas to the DOM) and `destroyApp()` on unmount.
- [ ] The layout component renders a `<RouterView>` overlay (`z-index: 10`, `pointer-events: none`) above the canvas.
- [ ] Vue Router is configured in hash mode with `AppLayout` as the parent route and three child routes: `#/` → `MainMenuView`, `#/game` → `GameView`, `#/settings` → `SettingsView`.
- [ ] Navigating between all three routes in the browser works; the canvas does not flicker or reinitialise on navigation.
- [ ] The PixiJS canvas resizes when the browser window is resized.
- [ ] `npm run dev`, `npm run build`, `npm run test`, and `npm run lint` all pass with zero errors.
- [ ] `AppLayout` unit test: mock `initApp`/`destroyApp`, assert `initApp` is called with an `HTMLElement` on mount and `destroyApp` is called on unmount.
- [ ] Router unit test: push to `#/`, `#/game`, `#/settings` and assert the correct placeholder view is rendered each time.
