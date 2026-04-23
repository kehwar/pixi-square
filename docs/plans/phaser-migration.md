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

- [ ] `references/pixi-vue-demo/` contains the archived PixiJS source (`app.ts`, renderer/, simulation/, views/, router/ etc.) as a snapshot.
- [ ] `pixi.js` and `@pixi/sound` are removed from `package.json`; `phaser` is added and installed.
- [ ] `npm run dev` starts without errors. The app loads at `#/` and `#/game` without a blank screen or console error.
- [ ] The Phaser canvas is mounted inside the canvas-container div and is visible full-viewport.
- [ ] The Vue UI overlay (`<RouterView />`) renders above the canvas at `z-index: 10`.
- [ ] `onUnmounted` in `PhaserGame.vue` calls `game.destroy(true)` cleanly.
- [ ] `AGENTS.md` boundary rule references Phaser, not PixiJS.
- [ ] `npm run type-check` and `npm run lint` pass with zero errors.

---

## Phase 2: Scene Lifecycle & EventBus

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

- [ ] `EventBus` is a `Phaser.Events.EventEmitter` singleton with no Vue imports.
- [ ] Booting the app executes Boot → Preloader → MainMenu in sequence; each emits `current-scene-ready`.
- [ ] Clicking "Play" in the Vue MainMenuView triggers the Game scene to start (observable via console or `current-scene-ready` payload).
- [ ] `GameOver` scene emits `game-over` on EventBus when it runs `create()`.
- [ ] `PhaserGame.vue` correctly exposes the active scene reference via `defineExpose`.
- [ ] EventBus contract tests pass: `on` receives emitted payloads; `off` stops the listener.
- [ ] `npm run test:unit`, `npm run type-check`, and `npm run lint` all pass.

---

## Phase 3: Simulation Remodel + Wanderer Rendering

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

- [ ] `WorldFactory.create()` returns 200 units all with `controller: null` and no `type` field.
- [ ] `claimUnit('p1', id)` marks the unit, resets `idleMs` to 0, clears its path.
- [ ] `releaseUnit('p1')` clears the controller; the unit resumes wandering on the next tick.
- [ ] `stepUnit('p1', direction)` moves the unit one tile when passable; no-op into obstacles or out-of-bounds.
- [ ] `registerInput('p1')` resets `idleMs` to 0 without moving.
- [ ] `tick` auto-releases a unit when `idleMs >= 10 000`.
- [ ] P2→P1 promotion is correct: releasing P1 while P2 holds a unit transfers that unit to `'p1'`, leaves `'p2'` unclaimed, and preserves `idleMs`.
- [ ] `getClaimedUnits()` reflects live claim/release state for both controllers.
- [ ] `nearestUnclaimedUnit(pixelX, pixelY)` returns the closest unclaimed unit by Euclidean distance.
- [ ] The grid renders procedurally in the Game scene with correct tile colors and border lines.
- [ ] All 200 wanderers are visible as royalblue squares moving around the grid.
- [ ] All simulation unit tests pass. `npm run type-check` and `npm run lint` pass.

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
