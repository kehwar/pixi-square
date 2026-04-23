# Phaser Migration

## Problem Statement

The project uses PixiJS v8 as its rendering engine. PixiJS is a low-level 2D renderer with no built-in concept of cameras, input handling, or scene management. As the game's feature roadmap grows — particularly features like per-player split-screen viewports, independent camera zoom, and tile-level input — the cost of hand-rolling these systems on top of PixiJS increases rapidly. Camera scaling, clipping, and viewport management that Phaser provides natively would require significant non-trivial custom infrastructure on PixiJS. The project needs a framework that provides these primitives first-class so development stays focused on game logic rather than renderer plumbing.

## Solution

Replace PixiJS with Phaser 4 as the rendering and game management framework. Phaser provides a built-in camera system (including multi-camera support for split-screen), a scene lifecycle, a keyboard/pointer input system, and a Graphics API suitable for the project's fully procedural rendering style. The simulation layer (World, Grid, Unit, PathFinder) remains pure TypeScript with zero framework imports, preserving testability. The renderer layer is rebuilt on top of Phaser scenes. A Vue↔Phaser EventBus bridges the two worlds without coupling them directly. The simulation unit model is also upgraded during this migration to the controller/wanderer design, removing the fragile pre-assigned `playerUnitId` and laying the data-model foundation for future multi-player cameras.

## User Stories

1. As a developer, I want the game to boot and reach the game view without PixiJS errors, so that the Phaser migration is functionally equivalent to the current build.
2. As a developer, I want the Phaser game instance to be created and destroyed cleanly by a Vue component, so that the game lifecycle is managed correctly across Vue mount/unmount cycles.
3. As a developer, I want a single EventBus instance to bridge Phaser scene events and Vue component callbacks, so that Phaser and Vue are decoupled and neither imports the other's types directly.
4. As a developer, I want the game canvas to remain a persistent, full-viewport element underneath the Vue UI overlay, so that scene transitions never flicker or blank the canvas.
5. As a developer, I want the Phaser game to run through Boot → Preloader → MainMenu → Game scenes in sequence, so that the standard Phaser lifecycle is followed and future scenes can be added with minimal friction.
6. As a developer, I want each Phaser scene to emit a `current-scene-ready` EventBus event when it is fully created, so that Vue components can react to which scene is currently active.
7. As a developer, I want the MainMenu Phaser scene to be navigable from the Vue MainMenuView, so that the two navigation systems are coordinated.
8. As a developer, I want the Game Phaser scene to start when the user navigates to the game route, so that the gameplay loop activates at the correct time.
9. As a developer, I want the GameOver Phaser scene to signal Vue via EventBus when the game ends, so that the Vue overlay can display a game-over state.
10. As a developer, I want the Preloader scene to complete immediately since there are no file assets to load, so that the game starts quickly.
11. As a player, I want the grid to render procedurally using Phaser Graphics, so that the visual output is equivalent to the PixiJS version.
12. As a player, I want all wandering units to render as royalblue squares on the grid using Phaser Graphics, so that the visual output is equivalent to the PixiJS version.
13. As a player, I want my claimed unit (Player 1) to render in a distinct gold color with a highlight ring, so that I can always identify my unit among wanderers.
14. As a player, I want the main camera to follow my claimed unit smoothly using exponential lerp, so that movement feels fluid.
15. As a player, I want the camera to freeze in place when I have no claimed unit, so that the view does not jump unexpectedly.
16. As a player, I want to zoom the camera with the mouse wheel, so that I can adjust my view of the grid.
17. As a player, I want to click a tile to pathfind my unit there, so that I can navigate to distant tiles without holding direction keys.
18. As a player, I want to press Space to claim the nearest unclaimed wanderer to the screen center, so that I can join the game immediately.
19. As a player, I want to press Space again to voluntarily release my claimed unit, so that I can hand it back to the simulation.
20. As a player, I want to move my claimed unit with WASD, so that keyboard navigation feels natural.
21. As a player, I want a single WASD tap to move my unit exactly one tile, so that I have precise grid-level control.
22. As a player, I want a held WASD key to repeat movement at 8 steps/second after a 200 ms delay, so that traversing the grid is fast.
23. As a player, I want my unit to stop and not move when I try to step into an obstacle tile, so that movement is predictable.
24. As a player, I want my unit to automatically release and resume wandering after 10 seconds of no input, so that inactive units rejoin the simulation.
25. As a developer, I want the simulation layer (World, Grid, Unit, PathFinder) to have zero Phaser imports, so that it remains testable in isolation with Vitest.
26. As a developer, I want all existing simulation unit tests to continue passing after the migration, so that there are no regressions in core game logic.
27. As a developer, I want the World simulation to expose claim, release, step, pathfind, and idle APIs, so that the game scene has a clean, high-level interface to the simulation.
28. As a developer, I want the Unit model to use a `controller` field instead of a `type` discriminant, so that the unit's role is encoded by current ownership rather than a fixed type.
29. As a developer, I want WorldFactory to create 200 units all with `controller: null`, so that all units start as autonomous wanderers with no pre-assigned player.
30. As a developer, I want the boundary rule in AGENTS.md to forbid Vue/vue-router/pinia imports in `src/game/` and forbid direct Phaser imports in Vue components, so that the architectural boundary is explicit and enforced.

## Implementation Decisions

### Package and Tooling
- Remove `pixi.js` and `@pixi/sound` from dependencies.
- Add `phaser` at the version used in the reference template (`4.0.0` or latest stable Phaser 4).
- All other dependencies (Vue, vue-router, Pinia, Vite, Vitest, TypeScript) are unchanged.

### Boundary Rule Update
- `src/game/` remains Vue-free (no imports from `vue`, `vue-router`, `pinia`).
- Vue components must not import Phaser types or objects directly. They interact with the game exclusively through `EventBus` and the game bootstrap function.
- AGENTS.md is updated to reflect this: "PixiJS" in the original rule is replaced with "Phaser" as the disallowed import direction from the Vue side.

### EventBus
- A `Phaser.Events.EventEmitter` singleton exported as `EventBus` from `src/game/EventBus.ts`.
- Used by Phaser scenes to emit lifecycle events; used by Vue components to listen and respond.
- No Vue imports inside this file; no Phaser scene imports in the Vue files that consume it.
- Standard events: `current-scene-ready` (payload: the active `Phaser.Scene` instance), `navigate` (payload: route path string), `game-over`.

### Game Bootstrap
- `src/game/main.ts` exports a `StartGame(parent: string): Phaser.Game` factory, matching the pattern of the reference template.
- The Phaser config declares scene order: Boot → Preloader → MainMenu → Game → GameOver.
- `app.ts` is deleted.

### PhaserGame.vue Component
- A new `src/components/PhaserGame.vue` component calls `StartGame('game-container')` on `onMounted` and `game.destroy(true)` on `onUnmounted`.
- It subscribes to the `current-scene-ready` EventBus event and exposes `{ scene, game }` to parent components via `defineExpose`.
- The DOM template is a single `<div id="game-container">` that Phaser mounts the canvas into.

### AppLayout.vue
- `AppLayout.vue` is modified to embed `<PhaserGame />` instead of calling `initApp`/`destroyApp` directly.
- The canvas-container div and the UI-overlay div structure is preserved; PhaserGame.vue renders into the canvas-container slot.
- The `import { initApp, destroyApp }` of `app.ts` is removed.

### Phaser Scenes
- **Boot**: calls `this.scene.start('Preloader')` in `create()`. Minimal setup only.
- **Preloader**: no file assets to load; calls `this.scene.start('MainMenu')` immediately in `create()`.
- **MainMenu**: emits `EventBus.emit('current-scene-ready', this)` in `create()`. Listens for an EventBus `start-game` event (fired by Vue's MainMenuView "Play" button) and calls `this.scene.start('Game')`.
- **Game**: owns the simulation loop. In `create()`: instantiates `World` from `WorldFactory`, draws the static grid using `this.add.graphics()`, sets up P1 keyboard bindings, sets up mouse wheel zoom and click-to-pathfind. In `update(delta)`: calls `world.tick(delta)`, redraws the unit layer. Emits `EventBus.emit('current-scene-ready', this)` in `create()`. Emits `EventBus.emit('navigate', '/game')` to trigger route change in Vue.
- **GameOver**: emits `EventBus.emit('current-scene-ready', this)` and `EventBus.emit('game-over')` in `create()`.

### Grid Rendering (inside Game scene)
- The grid is drawn once in `create()` using `this.add.graphics()` since the grid is static.
- Passable tiles are filled with the existing green color; obstacle tiles with brown; borders with a dark stroke.
- This replaces the `GridRenderer` class entirely. The `GridRenderer` file is deleted.

### Unit Rendering (inside Game scene)
- A dedicated `Graphics` object is created in `create()` for units and cleared + redrawn each `update()` tick.
- Wanderers render as royalblue squares. The P1 claimed unit renders gold with a gold highlight ring. P2's unit (data model exists, no P2 input yet) renders red with a red highlight ring.
- Color is determined by `unit.controller`; `null` → royalblue, `'p1'` → gold, `'p2'` → red.
- The `UnitRenderer` class is deleted; its logic is inlined into the Game scene's update.

### Camera (Phaser cameras.main)
- `cameras.main` is used for the single P1 viewport.
- Auto-follow: when P1 has a claimed unit, `cameras.main.startFollow(unitProxy, true, lerpX, lerpY)` or equivalent manual lerp in `update()` is used for smooth follow. When P1 has no unit, `stopFollow()` is called and the camera freezes.
- Mouse wheel zoom adjusts `cameras.main.zoom` clamped to `[MIN_ZOOM, MAX_ZOOM]`.
- Click-to-pathfind converts the pointer's world coordinates to tile coordinates and calls `world.pathfindUnit('p1', col, row)`.
- The `CameraController` class is deleted; its logic is inlined into the Game scene.

### P1 Keyboard Input (Phaser keyboard)
- Inside the Game scene's `create()`, create cursor keys and a Space key using `this.input.keyboard.createCursorKeys()` and `this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)`.
- WASD keys: add W, A, S, D with `this.input.keyboard.addKey(...)`.
- Space: on `keydown`, if P1 has no unit, call `world.claimUnit('p1', nearestUnclaimed)`. If P1 has a unit, call `world.releaseUnit('p1')`.
- Directional keys: tap (key held < 200 ms) issues one `world.stepUnit('p1', direction)`. Hold (≥ 200 ms) repeats at 8 Hz (125 ms interval) until key release. Any keydown resets idle via `world.registerInput('p1')`.
- The `KeyboardInputController` class (not yet built) is never created; its design is superseded by this in-scene approach.

### Simulation Model Changes
- `Unit` type: remove `type: UnitType` discriminant; add `controller: 'p1' | 'p2' | null`; add `idleMs: number`.
- `UnitType` type alias is deleted.
- `World` and `WorldState`: remove `playerUnitId`; add methods `claimUnit(controller, unitId)`, `releaseUnit(controller)`, `stepUnit(controller, direction)`, `pathfindUnit(controller, col, row)`, `registerInput(controller)`, `getClaimedUnits()`, `nearestUnclaimedUnit(pixelX, pixelY)`.
- `tick(deltaMs)` drives idle increment for claimed units and auto-releases any unit whose `idleMs >= 10_000`. When P1 is released while P2 holds a unit, `tick` (or `releaseUnit`) promotes P2's unit to the P1 slot.
- `WorldFactory`: creates 200 units, all with `controller: null`, `idleMs: 0`. The `playerUnitId` concept is removed.
- `moveUnit` (the existing pathfind-by-ID method): replaced by `pathfindUnit(controller, col, row)`.

## Testing Decisions

A good test verifies the externally observable behavior of a module through its public API only. It does not assert on internal state, private fields, or implementation details. Tests should remain valid even if the internal implementation is refactored.

### Simulation tests (updated existing files)
- `world.spec.ts`: update for the new API. Tests cover:
  - `WorldFactory.create()` produces 200 units all with `controller: null`.
  - `claimUnit` marks the unit, clears `idleMs`, clears the unit's path.
  - `releaseUnit` clears the controller; the unit resumes wandering on the next tick.
  - `stepUnit` moves the unit when the destination is passable; is a no-op into obstacles or out-of-bounds.
  - `registerInput` resets `idleMs` to 0 without moving.
  - `tick` auto-releases a unit when `idleMs >= 10_000`.
  - P2→P1 promotion: releasing P1 while P2 holds a unit transfers that unit to `'p1'` and preserves `idleMs`.
  - `getClaimedUnits()` reflects live claim/release state.
  - `nearestUnclaimedUnit` returns the closest unclaimed unit by Euclidean distance.
- `grid.spec.ts`: no changes required; Grid is untouched.
- `pathfinder.spec.ts`: no changes required; PathFinder is untouched.
- Prior art: existing `world.spec.ts`, `grid.spec.ts`, `pathfinder.spec.ts` in `src/game/simulation/__tests__/`.

### EventBus contract tests (new)
- Verify that `EventBus.on(event, cb)` receives the payload emitted by `EventBus.emit(event, payload)`.
- Verify that `EventBus.off(event, cb)` stops the listener.
- These tests have no Phaser scene dependency; they test the emitter instance in isolation.
- New file: `src/game/__tests__/EventBus.spec.ts`.

## Out of Scope

- **Split-screen viewports and ViewportManager**: multi-camera split-screen is the goal of a subsequent PRD. This migration ensures a single `cameras.main` works correctly; the multi-camera work is deferred.
- **Player 2 input**: P2 keyboard bindings and join/release flow are deferred. The data model supports P2 (`controller: 'p2'`), but no input routes to it.
- **Settings view implementation**: SettingsView.vue remains a stub.
- **GameOver scene logic**: the GameOver scene only emits an event; actual game-over conditions and UI are deferred.
- **Sound**: `@pixi/sound` is removed and no Phaser audio is added in this migration.
- **Asset pipeline**: the Preloader scene is present but handles no file assets. Sprite sheets, tilemaps, and audio loading are out of scope.
- **Phaser physics**: arcade or matter physics are not used; the simulation runs its own movement model.
- **Pinia store changes**: no store changes are required by this migration.
- **vue-router changes**: the existing hash-mode routes and views are unchanged by this migration.

## Further Notes

- The reference templates at `references/phaser-template-vue-ts` and `references/phaser-template-vite-ts` use Phaser 4.0.0 and should be consulted for idiomatic scene boilerplate and the EventBus pattern.
- The existing simulation tests serve as regression guards; all must pass after the migration, even though the World API changes shape significantly. Any test that breaks is a signal of a regression, not just a refactor.
- The `src/game/` Vue-free boundary is a hard architectural rule that survives the migration. The only change is that "PixiJS objects" in the rule becomes "Phaser objects" from the Vue-side perspective, while `src/game/` switches from importing PixiJS to importing Phaser.
- The procedural rendering approach (no image files, everything drawn with `Graphics`) is intentional and retained. This keeps the asset pipeline minimal and makes the renderer fully self-contained.
