# Local Multiplayer Claim

## Problem Statement

The game has no player-controlled units. All 200 units wander autonomously with no way for anyone to claim one, control it, or see the world from its perspective. Two people sharing a keyboard have no way to each take control of a unit and play independently.

## Solution

Two players can each claim an unclaimed wandering unit at any time using a dedicated join key (Space for Player 1, Numpad 0 for Player 2). Once claimed, a unit is driven by that player's directional keys and tracked by a dedicated Phaser camera. When only one player is active, a single full-screen camera follows their unit. The moment Player 2 claims a unit, the screen splits into two equal side-by-side Phaser cameras. If a claimed unit receives no input for 10 seconds it is automatically released and rejoins the wandering simulation. When Player 2's unit is released, the split collapses back to a single full-screen camera. If Player 1 releases while Player 2 is still active, Player 2 is promoted to the Player 1 slot by mutating the existing entity's input layout and camera slot in place.

The feature is built entirely within the existing `ComponentSystem` ECS architecture. Claiming a unit atomically removes `WanderingSystem` and `WandererRendererSystem` from the entity and adds `PlayerInputSystem`, `PlayerCameraSystem`, and `PlayerRendererSystem`. Two new world-level systems — `InputSystem` and `CameraSystem` — own shared resources (key layouts and Phaser cameras respectively) that per-entity systems borrow.

## User Stories

1. As a player, I want all units to start as autonomous wanderers, so that the world feels alive before anyone takes control.
2. As Player 1, I want to press Space to claim the nearest unclaimed unit to the center of the screen, so that I can join immediately.
3. As Player 2, I want to press Numpad 0 to claim the nearest unclaimed unit to the center of the screen, so that I can drop in at any time without interrupting Player 1.
4. As Player 1, I want to move my claimed unit with WASD, so that navigation feels natural on a standard keyboard.
5. As Player 2, I want to move my claimed unit with the Arrow keys, so that both players can use the same keyboard without conflict.
6. As a player, I want pressing a direction key while my unit is idle to move it one tile immediately, so that response feels instant.
7. As a player, I want a directional keypress during a tile step to be queued, so that my input is never silently dropped.
8. As a player, I want holding a direction key to chain tile steps continuously, so that I can traverse the grid quickly without repeated taps.
9. As a player, I want diagonal movement when I hold two cardinal direction keys simultaneously, so that I can move more efficiently.
10. As a player, I want diagonal movement to respect corner-cutting rules (both cardinal neighbors must be passable), so that movement feels consistent with pathfinding.
11. As a player, I want my unit to stop if a step destination is blocked or out of bounds, so that movement is honest about the grid topology.
12. As a player, I want to click on a tile in my half of the screen to pathfind my unit there, so that I can navigate to distant locations without holding keys.
13. As Player 1, I want to press Space again to voluntarily release my claimed unit, so that I can hand it back to the simulation.
14. As Player 2, I want to press Numpad 0 again to voluntarily release my claimed unit, so that I can deliberately exit.
15. As a player, I want my claimed unit to automatically release after 10 seconds of no input, so that the world stays dynamic.
16. As a player, I want my claimed unit to finish its current tile step before being released, so that the transition to wandering looks smooth.
17. As a player, I want my claimed unit to be visually distinct — showing a unique per-player color and a highlight ring — so that I can always spot it.
18. As Player 1, I want my unit displayed in gold, so that I can tell it apart from Player 2 and wanderers.
19. As Player 2, I want my unit displayed in red, so that I can tell it apart from Player 1 and wanderers.
20. As Player 1, I want the game to use a single full-screen camera when I am the only active player, so that I get the maximum view.
21. As Player 2, I want the screen to split into two equal side-by-side cameras the moment I claim a unit, so that I have my own dedicated view.
22. As a player, I want my camera to smoothly follow my unit, so that movement feels fluid.
23. As a player, I want my camera to auto-zoom to keep my unit's surroundings visible, so that I never lose track of where I am.
24. As a player, I want to scroll the mouse wheel over my half of the screen to zoom my camera independently, so that I can adjust my view without affecting the other player.
25. As a player, I want my camera to re-center on my unit after a manual zoom, so that my unit stays in focus.
26. As a player, I want my camera to hold its last position when I have no claimed unit, so that the view does not jump between claims.
27. As a player, I want the screen to return to a single full-screen camera when Player 2's unit is released, so that Player 1 regains the full screen.
28. As Player 2, I want to automatically become Player 1 if Player 1 releases while I am still active, so that I retain a full-screen view and my unit is uninterrupted.
29. As a developer, I want input and camera logic in separate `ComponentSystem` subclasses, so that each can be tested and extended independently.
30. As a developer, I want world-level systems to expose a simple acquire/release API, so that per-entity systems can borrow shared resources without owning lifecycle.
31. As a developer, I want the simulation to remain testable without a real keyboard or display, so that unit tests can cover movement and claim logic with stubs.

## Implementation Decisions

### ECS Component Swap on Claim/Release

Claiming a unit performs an atomic component swap on the unit entity:
- Remove: `WanderingSystem`, `WandererRendererSystem`
- Add: `PlayerInputSystem`, `PlayerCameraSystem`, `PlayerRendererSystem`

Releasing reverses the swap. The `MovementSystem`, `PositionSystem`, and `PathfindingSystem` components remain on the entity throughout — they are shared by both wandering and player-controlled movement.

### `InputSystem` (world-level)

`InputSystem` is installed once on the world. It owns two `KeyLayout` objects — P1 (WASD + Space) and P2 (Arrow keys + Numpad 0) — and is the sole holder of join-key `keydown` listeners on `window`. On a join keypress, if no unit is claimed for that slot, `InputSystem` finds the nearest unclaimed unit to the screen center and triggers the component swap. If a unit is already claimed, it triggers release.

`InputSystem` exposes:
- `acquireLayout(player)` — called by `PlayerInputSystem.create` to get the key bindings for that slot
- `releaseLayout(player)` — called by `PlayerInputSystem.destroy`
- `promoteP2ToP1(eid)` — mutates the entity in place: swaps the layout from P2 to P1, updates camera slot, updates `PlayerRendererSystem` tint; called when P1 releases while P2 is active

### `CameraSystem` (world-level)

`CameraSystem` is installed once. It owns a pool of Phaser `Camera` objects and manages their viewport geometry. It uses `observe(onAdd(PlayerCameraSystem))` to assign the next free slot (`full | left | right`) and `observe(onRemove(PlayerCameraSystem))` to release the slot and rebalance remaining cameras.

`CameraSystem` exposes:
- `acquireCamera(eid)` — creates or retrieves a Phaser camera, assigns it a slot, sets its viewport rect, returns the camera reference; called by `PlayerCameraSystem.create`
- `releaseCamera(eid)` — destroys or pools the camera, then iterates all remaining registered cameras and updates their viewport rects; called by `PlayerCameraSystem.destroy`

Slot assignment: one active player → `full` (full canvas width). Two active players → P1 gets `left` (left half), P2 gets `right` (right half). Rebalancing is instant with no animation.

### `PlayerInputSystem` (per-entity)

Added to the unit entity on claim. Stores:
- `layout` — borrowed `KeyLayout` from `InputSystem` (P1 or P2 bindings)
- `pendingDirection` — buffered direction from a keypress that arrived mid-step (`null` when empty)
- `idleMs` — accumulated milliseconds since the last input

`create` calls `inputSystem.acquireLayout(player)`.

On directional keydown: if `MovementSystem` path is empty, call `requestPath` immediately for the target tile; otherwise store direction as `pendingDirection`. Any keydown (directional or join key) resets `idleMs` to 0.

On `movement:path-empty` for this `eid`: check `pendingDirection` first, then fall back to currently held keys via `scene.input.keyboard.isDown`, then go idle. No OS-style key-repeat timer is needed — held keys are detected at each `path-empty` event naturally.

Diagonal movement: if two cardinal direction keys are held, the target tile is `(col + dx, row + dy)`. The step is only taken if neither cardinal neighbor is blocked (no corner-cutting), consistent with the A* rules.

`update(world, eid, delta)` increments `idleMs`. When `idleMs >= 10_000`, triggers release.

`destroy` calls `inputSystem.releaseLayout(player)` and removes the `movement:path-empty` listener.

### `PlayerCameraSystem` (per-entity)

Added to the unit entity on claim. Stores the borrowed Phaser `Camera` reference and current zoom.

`create` calls `cameraSystem.acquireCamera(eid)`.

`update(world, eid, delta)` reads `PositionSystem` for the same `eid` and sets the camera scroll to follow the unit with exponential lerp. Auto-zoom keeps a fixed visible radius around the unit (e.g. ±15 tiles), smoothed with exponential lerp, clamped to `[MIN_ZOOM, MAX_ZOOM]`.

Owns a Phaser pointer click listener scoped to its camera's viewport rect. On click, transforms screen-space to world-space tile coordinates using the camera transform and emits `'input:pathfind'` with `{ eid, col, row }`. `PlayerInputSystem` listens to this event and calls `requestPath`.

Owns a Phaser wheel listener scoped to its viewport rect. Adjusts camera zoom within `[MIN_ZOOM, MAX_ZOOM]`, then re-centers the camera on the unit's current position.

When the entity has no movement path and no pending direction (idle), the camera holds its last position.

`destroy` calls `cameraSystem.releaseCamera(eid)` and removes all pointer/wheel listeners.

### `PlayerRendererSystem` (per-entity)

Replaces `WandererRendererSystem` on claim. Renders the unit in the player's color (gold for P1, red for P2) with an additional highlight ring drawn around the sprite. `promoteP2ToP1` updates the sprite tint and ring color directly.

`WandererRendererSystem` is renamed from the current `UnitRendererSystem` to clarify that it only applies to unclaimed units.

### `WanderingSystem` (unchanged)

`WanderingSystem` continues to drive all unclaimed units. It is removed from an entity when claimed and re-added on release. No changes to its internals are required.

### Movement dispatch

`PlayerInputSystem` calls `requestPath(gridData, movStorage, posStorage, eid, targetCol, targetRow)` directly — the same utility used by `WanderingSystem`. When a directional step is requested mid-path, the current path is left intact (it finishes its one remaining step), and the new step is queued via `pendingDirection`.

### `nearestUnclaimedUnit(pixelX, pixelY)`

A utility function (not a system) that returns the `eid` of the closest unclaimed unit to a given world-space pixel coordinate. Used by `InputSystem` on join keypress to find the target unit. "Unclaimed" means the entity does not have `PlayerInputSystem` attached.

## Testing Decisions

Good tests verify observable behavior through a module's public API. They must not depend on private fields, internal data structures, or rendering details.

### `InputSystem`
- Test that pressing the P1 join key when no unit is claimed triggers claim on the nearest unclaimed entity.
- Test that pressing the P1 join key when a unit is already claimed triggers release.
- Test that `acquireLayout` returns P1 bindings for `'p1'` and P2 bindings for `'p2'`.
- Test `promoteP2ToP1`: after calling it, the entity responds to P1 keys, not P2 keys.

### `PlayerInputSystem`
- Test that a directional keypress while idle calls `requestPath` immediately.
- Test that a directional keypress mid-step stores `pendingDirection`.
- Test that `movement:path-empty` consumes `pendingDirection` if set.
- Test that `movement:path-empty` falls back to held keys (mocked `isDown`).
- Test that `idleMs` increments each `update` tick and triggers release at 10 000 ms.
- Test that any keydown resets `idleMs` to 0.
- Test diagonal step is rejected when a cardinal neighbor is blocked (corner-cutting rule).
- Prior art: `src/game/systems/__tests__/WanderingSystem.spec.ts` (movement event patterns).

### `CameraSystem`
- Test that `acquireCamera` with one entity assigns slot `full`.
- Test that `acquireCamera` with two entities assigns slots `left` and `right`.
- Test that `releaseCamera` for one of two entities rebalances the remaining camera to `full`.
- Test that `acquireCamera` / `releaseCamera` do not throw when called in rapid succession.

### `PlayerCameraSystem`
- Test that `update` moves the camera scroll toward the unit's pixel position each tick.
- Test that auto-zoom is clamped to `[MIN_ZOOM, MAX_ZOOM]`.
- Test that a wheel event adjusts zoom within bounds and re-centers on the unit.
- Test that a click event emits `'input:pathfind'` with correct tile coordinates derived from the camera transform.
- Prior art: `src/game/systems/__tests__/MovementSystem.spec.ts` (delta-based update patterns).

### `nearestUnclaimedUnit`
- Test returns the closest entity by Euclidean pixel distance.
- Test excludes entities that have `PlayerInputSystem` attached.
- Prior art: `src/game/systems/__tests__/GridSystem.spec.ts` (pure utility function patterns).

## Out of Scope

- Gamepad input.
- Network multiplayer.
- More than two simultaneous players.
- Mouse-click-to-claim (clicking directly on a wandering unit to claim it; only the join key triggers claiming).
- Pinch-to-zoom or touch gestures.
- Persistent player identity or scores across sessions.
- HUD, minimap, or idle-timer countdown indicator.
- Remapping keybindings.
- Animated split-screen transition (the split is instant).
- Mobile / touch input.

## Further Notes

- `promoteP2ToP1` must update three things atomically: the `KeyLayout` reference in `PlayerInputSystem` component data, the camera slot via `CameraSystem`, and the tint/ring in `PlayerRendererSystem` component data. The `InputSystem` method does all three in sequence before any tick runs.
- The `movement:path-empty` event is already emitted by `MovementSystem` and consumed by `WanderingSystem`. `PlayerInputSystem` attaches its own listener to the same event, filtered by `eid`, so no changes to `MovementSystem` are needed.
- Rendering the world with two Phaser cameras doubles draw calls in split-screen mode. At 200 units on a 200×200 grid this remains within the WebGL budget, but `CameraSystem` should only activate the second camera when a second player is active.
- `WandererRendererSystem` should be renamed from the current `UnitRendererSystem` as part of this work so the naming accurately reflects its role.

## User Stories

1. As a player, I want all units to start as autonomous wanderers, so that the world feels alive before anyone takes control.
2. As Player 1, I want to press Space to claim the nearest unclaimed wandering unit to the center of the screen, so that I can join the game immediately.
3. As Player 2, I want to press Numpad 0 to claim the nearest unclaimed wandering unit to the center of the screen, so that I can drop in at any time without interrupting Player 1.
4. As Player 1, I want to move my claimed unit with WASD, so that navigation feels natural on a standard keyboard.
5. As Player 2, I want to move my claimed unit with the Arrow keys, so that both players can use the same keyboard without fighting over keys.
6. As a player, I want my claimed unit to move one tile in the pressed direction when I tap a key, so that I have precise tile-level control.
7. As a player, I want my claimed unit to continue moving in the held direction after a short initial delay, so that traversing the grid is fast without requiring many individual keypresses.
8. As a player, I want my claimed unit to stop if I try to move it into an obstacle tile, so that movement is predictable and honest about the grid topology.
9. As a player, I want my claimed unit to be visually distinct from wanderers — showing a unique per-player color and a highlight ring — so that I can always spot my unit on a busy grid.
10. As Player 1, I want my unit displayed in a distinct color (e.g. gold), so that I can tell it apart from Player 2's unit and all wanderers at a glance.
11. As Player 2, I want my unit displayed in a distinct color (e.g. red), so that I can tell it apart from Player 1's unit and all wanderers at a glance.
12. As Player 1, I want the game to display in a single full-screen viewport when I am the only active player, so that I get the maximum view of the world.
13. As Player 2, I want the screen to split into two equal side-by-side viewports the moment I claim a unit, so that I have my own dedicated view without displacing Player 1.
14. As a player, I want my viewport to automatically zoom to keep my unit clearly visible, so that I never lose track of where I am.
15. As a player, I want my viewport camera to smoothly follow my unit, so that movement feels fluid.
16. As a player, I want to scroll the mouse wheel while hovering over my half of the screen to zoom my own viewport in or out, so that I can adjust my view independently of the other player.
17. As a player, I want to click on a tile within my half of the screen to pathfind my claimed unit there, so that I can navigate to distant locations without holding a direction key.
18. As a player, I want my viewport to hold its last position when I have no claimed unit, so that the view does not jump when I am between claims.
19. As a player, I want the screen to return to a single full-screen viewport when Player 2 releases their unit (by idling or pressing Numpad 0 again), so that Player 1 regains the full screen.
20. As a player, I want my unit to automatically return to wandering if I do not give it any input for 10 seconds, so that the world stays dynamic and units do not permanently block tiles.
21. As a player, I want a claimed unit that goes idle to finish its current tile step before resuming wandering, so that the transition looks smooth.
22. As a player, I want to voluntarily release my claimed unit by pressing my join key again (Space for Player 1, Numpad 0 for Player 2), so that I can deliberately hand a unit back to the simulation.
23. As Player 2, I want to automatically become Player 1 if Player 1 leaves while I am still active, so that I retain a full-screen view and remain the primary player.
24. As a developer, I want the input system cleanly separated from the simulation, so that each can be tested and extended independently.
25. As a developer, I want the simulation to have a pure API for claiming, releasing, and stepping units, so that it is testable without a real browser or keyboard.
26. As a developer, I want the viewport and camera logic to be exercised by unit tests, so that regressions in auto-zoom or split-screen transitions are caught automatically.

## Implementation Decisions

### Unit Model
- The `Unit` type gains two new fields: `controller` (`'p1' | 'p2' | null`) and `idleMs` (elapsed milliseconds since the last input on this unit).
- `controller === null` means the unit is an unclaimed wanderer.
- The existing `UnitType` discriminant (`'player' | 'ai'`) is removed; all units are treated as potential wanderers and their current role is fully encoded by `controller`.

### World / Simulation
- `WorldFactory` creates 200 wandering units with no pre-assigned player; the `playerUnitId` concept is removed from `World` and `WorldState`.
- `World` exposes:
  - `claimUnit(unitId, controller)` — marks the unit as claimed, clears its idle timer, stops its wandering path.
  - `releaseUnit(controller)` — clears the claim; the unit finishes its current tile step before the wandering AI loop resumes.
  - `stepUnit(controller, direction)` — moves the claimed unit one tile in the given direction if the destination is passable; no-op otherwise. Resets the idle timer.
  - `pathfindUnit(controller, targetCol, targetRow)` — A* pathfinds the claimed unit to the given tile (same semantics as the existing `moveUnit`). Resets the idle timer.
  - `registerInput(controller)` — resets the idle timer without moving (used for any keydown that is not a movement key).
- `tick(deltaMs)` advances all units along their paths, increments `idleMs` for each claimed unit, and calls `releaseUnit` on any unit whose `idleMs >= IDLE_TIMEOUT_MS` (10 000 ms). Wandering path-selection logic applies only to unclaimed units.
- `getClaimedUnits()` returns a map of `controller → unitId` for all currently claimed units.
- `nearestUnclaimedUnit(pixelX, pixelY)` returns the unit id of the closest unclaimed unit to a given world-space pixel coordinate, to support join-key logic.
- When `releaseUnit('p1')` is called while `'p2'` has a claimed unit, the world reassigns `'p2'`'s unit to the `'p1'` slot (the unit's `controller` is updated from `'p2'` to `'p1'`) before clearing `'p2'`. The idle timer of the promoted unit is preserved.

### Keyboard Input Module
- A new, standalone `KeyboardInputController` class lives in the game layer (no Vue imports).
- It is constructed with a `player` identifier (`'p1'` or `'p2'`), a `KeyBinding` set (join key, up, down, left, right), and a callback interface (claim, release, step, registerInput).
- Both player instances share the same `keydown` / `keyup` listeners on `window`; each instance only reacts to its own bound keys.
- Join key (Space for P1, Numpad 0 for P2): if the player has no claimed unit, find the nearest unclaimed wanderer to the screen center and call `claim`; if they already have one, call `release`.
- Directional keys: hybrid movement — a tap (key held < 200 ms) issues one `step` call; a hold (≥ 200 ms) repeats `step` at 8 steps/second until the key is released. Any directional keydown calls `registerInput`.
- Any keydown within the player's bound key set calls `registerInput` to reset the idle timer.
- The callback interface makes the controller fully testable with stubs.

### Viewport / Split-Screen Architecture
- The PixiJS `Application` remains a single instance with a single canvas.
- A new `ViewportManager` is introduced to manage one or two active viewports.
- Each `Viewport` wraps a `Container` that holds the camera-transformed view of the world (position + scale). The world scene (grid + units) is rendered into each viewport's container independently, so each camera is fully independent.
- **Single-player mode**: one viewport occupies the full canvas.
- **Two-player mode**: two viewports each occupy exactly half the canvas width, side by side, separated by a thin divider line. Each viewport clips its container to its half using a mask or scissor rect.
- The `ViewportManager` switches modes when `getClaimedUnits()` transitions between one and two active players. The transition is instant (no animation required).
- When P1 is released while P2 is active, the world performs the P2→P1 promotion before the viewport observes the change, so the `ViewportManager` sees a single claimed unit (`'p1'`) and collapses to single-player mode without any intermediate blank frame.
- Each `Viewport` owns a `CameraController` instance that follows its player's unit independently.
- The `AppLayout.vue` canvas element does not change; the split is achieved entirely within the PixiJS stage.

### Camera Controller (per-viewport)
- Each viewport has its own `CameraController` instance, replacing the single shared controller.
- `followPlayer(deltaMs)` and `centerOnPlayer()` operate on the single unit claimed by this viewport's player.
- Auto-zoom: the zoom level is set so the claimed unit's surroundings fill the viewport with a fixed visible radius (e.g. ±15 tiles around the unit). Zoom is smoothed with exponential lerp, clamped to [MIN_ZOOM, MAX_ZOOM].
- When the player has no claimed unit, `followPlayer` is a no-op (camera freezes).
- Manual mouse-wheel zoom targets the viewport under the cursor. In single-player mode the single viewport receives all wheel events. In split-screen mode, if the cursor is in the left half the P1 viewport is zoomed; if in the right half the P2 viewport is zoomed. After a manual zoom the camera re-centers on that viewport's claimed unit (or stays put if no unit is claimed). Zoom range remains [MIN_ZOOM, MAX_ZOOM].
- Mouse click also targets the viewport under the cursor using the same left/right half routing. When a click lands in a viewport whose player has a claimed unit, the screen-space coordinate is transformed to world-space tile coordinates using that viewport's camera transform, and `pathfindUnit` is called for that player's controller. Clicks in a viewport with no claimed unit are ignored.
- The existing position-clamping logic is retained per viewport, adjusted for the viewport's half-width in two-player mode.

### Unit Renderer
- Wandering units render as royal blue (unchanged).
- Player 1's claimed unit renders in gold with a gold highlight ring.
- Player 2's claimed unit renders in red with a red highlight ring.
- The `sync()` method reads `controller` from each `Unit` to determine color and ring; it creates or updates the Graphics object as needed.
- The renderer is shared across both viewports (the same unit data is visible in each view).

### Game Scene
- `GameScene.start()` instantiates two `KeyboardInputController` instances (one per player), wires their callbacks to world methods, and constructs the `ViewportManager` in single-player mode.
- `GameScene` observes world state each tick and notifies the `ViewportManager` to switch between single and split modes when the number of claimed players changes.
- `GameScene` attaches a single `click` listener to the canvas; on each click it asks the `ViewportManager` which viewport the cursor falls in, converts the click coordinate using that viewport's camera transform, and calls `pathfindUnit` on the world for the corresponding controller.
- `GameScene.stop()` detaches all input listeners and destroys viewports.
- The world no longer exposes `playerUnitId`; the scene no longer accesses it directly.

## Testing Decisions

Good tests verify observable behavior through a module's public API. They must not depend on private fields, rendering details, or internal data structures.

### World (simulation)
- Test `claimUnit`: unit becomes claimed, idle timer resets, wandering path is cleared.
- Test `releaseUnit`: unit becomes unclaimed, wandering AI loop resumes on the next tick.
- Test `stepUnit` into a passable tile: unit moves to the adjacent tile.
- Test `stepUnit` into an obstacle or out-of-bounds: unit stays put.
- Test `registerInput`: idle timer resets to zero.
- Test idle expiry in `tick`: unit is automatically released after 10 000 ms of accumulated idle time.
- Test that two players can each hold a claimed unit simultaneously without interfering with each other's idle timers.
- Test `getClaimedUnits` reflects claim and release changes for both players.
- Test P2→P1 promotion: releasing P1 while P2 is active reassigns P2's unit to `'p1'`, leaves `'p2'` unclaimed, and preserves the unit's idle timer.
- Test `nearestUnclaimedUnit` returns the closest unit by Euclidean pixel distance.
- Prior art: `src/game/simulation/__tests__/world.spec.ts`.

### Camera Controller
- Test `followPlayer` with a claimed unit: stage converges toward the unit's position.
- Test `followPlayer` with no claimed unit: stage position is unchanged.
- Test auto-zoom: zoom level is within [MIN_ZOOM, MAX_ZOOM].
- Test viewport clamping in half-width mode: camera does not expose outside the grid.
- Prior art: `src/game/renderer/__tests__/camera-controller.spec.ts`.

### Viewport Manager
- Test single-player mode: one viewport occupies full canvas width.
- Test split mode: each viewport occupies half the canvas width.
- Test transition from single to split and back does not throw.

### Input Modules
- `KeyboardInputController` is a thin event-to-callback bridge; its observable behavior (claim, step, release fired at the correct times) can be tested by instantiating it with stub callbacks and dispatching synthetic `KeyboardEvent` objects.

## Out of Scope

- Gamepad input (deferred to a future iteration).
- Network multiplayer.
- More than two simultaneous players.
- Mouse-click-to-claim (clicking on a unit to claim it; only the join key triggers claiming).
- Pinch-to-zoom or other touch-based zoom gestures.
- Persistent player identity or scores across sessions.
- HUD or minimap.
- Remapping keybindings.
- Visual idle-timer countdown indicator.
- Mobile / touch input.
- Animated split-screen transition (the split is instant).

## Further Notes

- The hybrid key-repeat for movement should replicate OS keyboard-repeat behaviour: one immediate step on keydown, a 200 ms initial delay, then steps at 8 Hz. This avoids double-stepping caused by the OS's own key-repeat events.
- Rendering the world twice (once per viewport in split-screen mode) will approximately double draw calls. At 200 units on a 200 × 200 grid this remains well within the WebGL budget, but the `ViewportManager` should only activate dual-render when two players are active.
- The `WorldFactory` constant `AI_COUNT` should be renamed to `UNIT_COUNT` to reflect that all units are now wanderers.
- Care must be taken that both `KeyboardInputController` instances do not share mutable state, since they both listen on the same `window` keydown event but must independently track hold-repeat timers per key.
