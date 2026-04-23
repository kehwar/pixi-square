# Plan: Phaser Migration

> Source PRD: [docs/prd/phaser-migration.md](../prd/phaser-migration.md)

## Architectural decisions

- **Routes**: unchanged — `#/` → MainMenuView, `#/game` → GameView, `#/settings` → SettingsView (hash mode).
- **Vue↔Phaser boundary**: EventBus only. No direct Phaser imports in Vue components; no Vue/vue-router/pinia imports in `src/game/`.
- **Scene order**: Boot → Preloader → MainMenu → Game → GameOver.
- **Key models**: `Unit { id, controller: 'p1' | 'p2' | null, idleMs, col, row, pixelX, pixelY, speed, path }`. `World` exposes `claimUnit`, `releaseUnit`, `stepUnit`, `pathfindUnit`, `registerInput`, `getClaimedUnits`, `nearestUnclaimedUnit`, `tick`.
- **Rendering**: fully procedural — Phaser `Graphics` only, no image file assets.
- **Game bootstrap**: `StartGame(parent: string): Phaser.Game` factory in `src/game/main.ts` (mirrors the reference template pattern).

---

## Phase 1: Phaser Bootstrap

> ✅ Completed — PixiJS archived to references/pixi-vue-demo; phaser 4 installed; PhaserGame.vue + StartGame factory wired into AppLayout; Boot/Preloader/MainMenu/Game/GameOver scene stubs created; AGENTS.md updated; all 40 tests pass, type-check and lint clean.

**User stories**: 1, 2, 4, 30

### What to build

Archive the entire current PixiJS game implementation by copying it to `references/pixi-vue-demo` so it is preserved as a working reference. Then perform the mechanical package swap and wiring:

- Remove `pixi.js` and `@pixi/sound`; add `phaser` (Phaser 4).
- Create the `StartGame` factory and a `PhaserGame.vue` component that calls it on mount and destroys the game on unmount.
- Update `AppLayout.vue` to embed `PhaserGame.vue` instead of calling `initApp`/`destroyApp`.
- Add Boot and Preloader stubs (Boot immediately starts Preloader; Preloader immediately starts MainMenu since there are no file assets).
- Update `AGENTS.md` to replace the PixiJS boundary rule with Phaser.

The app must boot at all existing routes without errors. The Phaser canvas is visible beneath the Vue UI overlay. No gameplay logic is present yet.

### Acceptance criteria

- [x] `references/pixi-vue-demo/` contains the archived PixiJS source (`app.ts`, renderer/, simulation/, views/, router/ etc.) as a snapshot.
- [x] `pixi.js` and `@pixi/sound` are removed from `package.json`; `phaser` is added and installed.
- [x] `npm run dev` starts without errors. The app loads at `#/` and `#/game` without a blank screen or console error.
- [x] The Phaser canvas is mounted inside the canvas-container div and is visible full-viewport.
- [x] The Vue UI overlay (`<RouterView />`) renders above the canvas at `z-index: 10`.
- [x] `onUnmounted` in `PhaserGame.vue` calls `game.destroy(true)` cleanly.
- [x] `AGENTS.md` boundary rule references Phaser, not PixiJS.
- [x] `npm run type-check` and `npm run lint` pass with zero errors.

### Notes

- **pixi-vue-demo archive**: `references/pixi-vue-demo/` contains the complete working snapshot (src/, public/, package.json, all config files). `node_modules` was intentionally excluded — run `npm install` inside that folder to restore.
- **Phaser canvas scaling**: `Scale.RESIZE` + `autoCenter: Scale.CENTER_BOTH` used in the Phaser config so the canvas fills the parent div. The parent div (`#game-container`) is rendered by `PhaserGame.vue` inside the `canvas-container` class element in `AppLayout.vue`.
- **PhaserGame.vue Phaser isolation**: `PhaserGame.vue` does not import from `'phaser'` directly. It uses `ReturnType<typeof StartGame>` for the game instance type, keeping the Vue component free of direct Phaser imports per the boundary rule.
- **Vitest: references excluded**: Added `'references/**'` to `vitest.config.ts` excludes so archived demo tests don't run alongside the live test suite.
- **Vitest: Phaser canvas crash**: Phaser runs canvas detection at module-load time, which crashes in happy-dom. Fixed by adding `vi.mock('@/game/main', ...)` to `src/router/__tests__/index.spec.ts` (the only test that transitively imports phaser via router → AppLayout → PhaserGame.vue). The AppLayout spec was already safe because it mocks `PhaserGame.vue` directly.
- **AppLayout spec rewritten**: Dropped the `initApp`/`destroyApp` lifecycle assertions; the new spec verifies the layout structure (game container + ui-overlay with RouterView).
- **Router spec cleaned**: Removed unused `initApp` mock and import.

---

## Phase 2: Scene Lifecycle & EventBus

> ✅ Completed — EventBus singleton created; all 5 scenes emit current-scene-ready; MainMenu listens for start-game; Game scene emits navigate; PhaserGame.vue exposes scene ref; MainMenuView gets Play button; AppLayout wires navigate → vue-router; 6 EventBus contract tests added; 46/46 tests pass, type-check and lint clean.

**User stories**: 3, 5, 6, 7, 8, 9, 10

### What to build

Wire the full 5-scene Phaser pipeline and connect it to the Vue layer via EventBus.

- Create `src/game/EventBus.ts` as a `Phaser.Events.EventEmitter` singleton.
- Implement all five scenes (Boot, Preloader, MainMenu, Game stub, GameOver stub). Each scene emits `current-scene-ready` on `EventBus` when its `create()` runs.
- `PhaserGame.vue` subscribes to `current-scene-ready` and exposes `{ scene, game }` to parent components.
- The MainMenu scene listens for a `start-game` EventBus event and transitions to the Game scene.
- The Vue `MainMenuView` "Play" button emits `start-game` on EventBus instead of (or in addition to) navigating via vue-router.
- Game scene emits a `navigate` event with payload `'/game'`; `AppLayout.vue` or the router responds.
- EventBus contract tests verify emit/on/off behaviour in isolation (no Phaser scene dependency).

### Acceptance criteria

- [x] `EventBus` is a `Phaser.Events.EventEmitter` singleton with no Vue imports.
- [x] Booting the app executes Boot → Preloader → MainMenu in sequence; each emits `current-scene-ready`.
- [x] Clicking "Play" in the Vue MainMenuView triggers the Game scene to start (observable via console or `current-scene-ready` payload).
- [x] `GameOver` scene emits `game-over` on EventBus when it runs `create()`.
- [x] `PhaserGame.vue` correctly exposes the active scene reference via `defineExpose`.
- [x] EventBus contract tests pass: `on` receives emitted payloads; `off` stops the listener.
- [x] `npm run test:unit`, `npm run type-check`, and `npm run lint` all pass.

### Notes

- **Phaser EventEmitter in tests**: importing `phaser` crashes happy-dom at module load (canvas detection). `EventBus.spec.ts` mocks `phaser` with a local in-process `EventEmitter` that satisfies the same interface. This tests the EventBus contract (on/off/once/emit/removeAllListeners) without requiring a browser environment.
- **AppLayout.spec and router/index.spec**: both now transitively import `@/game/EventBus` (via AppLayout.vue). Each spec adds `vi.mock('@/game/EventBus', ...)` with a stub of the used methods to prevent Phaser module load.
- **AppLayout.vue navigate wiring**: `onMounted` registers `EventBus.on('navigate', onNavigate)` and `onUnmounted` calls `EventBus.off` to clean up. `onNavigate` calls `router.push(path)`.
- **PhaserGame.vue expose**: exposes `{ scene: Ref<Phaser.Scene | null>, game: Ref<GameInstance | null> }` via `defineExpose`. The `game` ref is initialized as `ref(null)` and set in `onMounted`; exposing via `ref()` ensures reactivity for parent consumers.
- **MainMenuView Play button**: has `style="pointer-events: auto"` since the ui-overlay uses `pointer-events: none` — the button must re-enable pointer events for itself.

---

## Phase 3: Simulation Remodel + Wanderer Rendering

> ✅ Completed — Unit type field removed; controller/idleMs added; World rewritten with claimUnit/releaseUnit/stepUnit/pathfindUnit/registerInput/getClaimedUnits/nearestUnclaimedUnit; WorldFactory creates 200 unclaimed units; world.spec.ts fully rewritten (41 tests); Game scene draws static grid once in create() and redraws all 200 wanderers each update(); camera centered on grid; 70/70 tests pass, type-check and lint clean.

**User stories**: 11, 12, 25, 26, 27, 28, 29

### What to build

Migrate the simulation data model and rebuild the renderer layer on top of Phaser.

**Simulation changes** (pure TS, no Phaser imports):
- Remove `UnitType` and the `type` field from `Unit`. Add `controller: 'p1' | 'p2' | null` and `idleMs: number`.
- `World` loses `playerUnitId` and `moveUnit`. Gains `claimUnit`, `releaseUnit`, `stepUnit`, `pathfindUnit`, `registerInput`, `getClaimedUnits`, `nearestUnclaimedUnit`.
- `tick(deltaMs)` increments `idleMs` for claimed units and auto-releases any unit with `idleMs >= 10 000`. Wandering AI path selection applies only to unclaimed units.
- P2→P1 promotion: releasing P1 while P2 holds a unit reassigns that unit to the `'p1'` slot, preserving `idleMs`.
- `WorldFactory` creates 200 units all with `controller: null`, `idleMs: 0`.
- All simulation tests (`world.spec.ts`, `grid.spec.ts`, `pathfinder.spec.ts`) are updated and passing.

**Rendering** (Game Phaser scene):
- Grid is drawn once in `create()` using `this.add.graphics()`. Passable tiles green, obstacle tiles brown, border lines dark.
- A unit `Graphics` object is cleared and redrawn each `update()` tick. All 200 wanderers render as royalblue squares.
- `cameras.main` is set to a static center-of-grid position (no follow yet).

### Acceptance criteria

- [x] `WorldFactory.create()` returns 200 units all with `controller: null` and no `type` field.
- [x] `claimUnit('p1', id)` marks the unit, resets `idleMs` to 0, clears its path.
- [x] `releaseUnit('p1')` clears the controller; the unit resumes wandering on the next tick.
- [x] `stepUnit('p1', direction)` moves the unit one tile when passable; no-op into obstacles or out-of-bounds.
- [x] `registerInput('p1')` resets `idleMs` to 0 without moving.
- [x] `tick` auto-releases a unit when `idleMs >= 10 000`.
- [x] P2→P1 promotion is correct: releasing P1 while P2 holds a unit transfers that unit to `'p1'`, leaves `'p2'` unclaimed, and preserves `idleMs`.
- [x] `getClaimedUnits()` reflects live claim/release state for both controllers.
- [x] `nearestUnclaimedUnit(pixelX, pixelY)` returns the closest unclaimed unit by Euclidean distance.
- [x] The grid renders procedurally in the Game scene with correct tile colors and border lines.
- [x] All 200 wanderers are visible as royalblue squares moving around the grid.
- [x] All simulation unit tests pass. `npm run test:unit`, `npm run type-check`, and `npm run lint` pass.

### Notes

- **`WorldFactory.AI_COUNT` renamed**: renamed to `UNIT_COUNT = 200` since all units are now controller-neutral wanderers with no player/AI distinction.
- **`moveUnit` removed**: replaced entirely by `pathfindUnit(controller, col, row)`. The controller-based API is cleaner and safer than passing raw unit IDs into the renderer.
- **Grid draw performance**: drawing 40,000 tiles with minimal `fillStyle` switches — fill all passable tiles in one pass (one `fillStyle` call), then all obstacle tiles in a second pass. This avoids 40,000 state switches in the Graphics command buffer.
- **Wandering tick tests**: two tick tests (`dequeues waypoint` and `unit stops at final destination`) needed `controller: 'p1'` to prevent the unit from immediately receiving a new wander path after reaching its destination. Unclaimed units always re-wander when their path empties.
- **`World` constructor**: removed `playerUnitId` parameter. Constructor now takes `(grid: Grid, units: Unit[])` only.
- **`Controller` and `Direction` types**: exported from `world.ts` so Phase 4 (Game scene input) can import them without depending on unit.ts internals.
- **Camera**: `cameras.main.centerOn(gridWidth / 2, gridHeight / 2)` positions the viewport over the center of the 6400×6400 world. No follow implemented yet (Phase 4).

---

## Phase 4: P1 Input & Camera Follow

**User stories**: 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24

### What to build

Wire Phaser's built-in keyboard and pointer input to the simulation, add camera follow, and add P1 visual distinction.

**Input** (inside the Game scene, using Phaser keyboard API):
- Space: if P1 has no unit, claim the nearest unclaimed unit to the viewport center; if P1 has a unit, release it.
- WASD: tap (held < 200 ms) issues one `stepUnit` call; hold (≥ 200 ms) repeats at 8 Hz until released.
- Any keydown within the P1 key set calls `registerInput('p1')` to reset the idle timer.
- Mouse wheel: adjusts `cameras.main.zoom`, clamped to `[MIN_ZOOM, MAX_ZOOM]`.
- Mouse click: converts pointer world coordinates to tile coordinates and calls `pathfindUnit('p1', col, row)`.

**Camera**:
- When P1 has a claimed unit, `cameras.main` smoothly follows the unit using exponential lerp.
- When P1 has no claimed unit, the camera freezes in its current position.

**Visual distinction**:
- P1's claimed unit renders gold with a gold highlight ring.
- Wanderers remain royalblue; P2-claimed units (data model only, no P2 input) render red with a red ring.

### Acceptance criteria

- [ ] Pressing Space claims the nearest unclaimed unit; pressing Space again releases it.
- [ ] WASD tap moves the unit exactly one tile.
- [ ] WASD hold repeats movement at 8 Hz after a 200 ms delay.
- [ ] Attempting to move into an obstacle tile does nothing.
- [ ] After 10 seconds of no input the unit auto-releases and resumes wandering.
- [ ] `cameras.main` smoothly follows P1's unit when claimed; freezes when unclaimed.
- [ ] Mouse wheel zooms the camera within `[MIN_ZOOM, MAX_ZOOM]`.
- [ ] Clicking a passable tile pathfinds P1's unit there.
- [ ] P1's unit renders gold with a gold highlight ring; wanderers remain royalblue.
- [ ] `npm run test:unit`, `npm run type-check`, and `npm run lint` all pass.
