## Problem Statement

The `Game` Phaser scene is monolithic, and the simulation layer (`World`, `Grid`, `pathfinder`, `Unit`) is a parallel object graph that sits outside the ECS entirely. Adding new per-entity behaviors requires modifying both the scene class and the simulation classes simultaneously, and there is no compositional model for attaching, removing, or reordering behaviors per entity. The simulation layer cannot be driven by Phaser's update loop without manual wiring in the scene.

## Solution

Migrate the entire game — both the Phaser scene layer and the simulation layer — to use the **phatty** ECS library (`npm install phatty`). The `World`, `Grid`, `WorldFactory`, and `Unit` constructs are deleted and replaced by focused `Component` subclasses attached to entities. The `findPath()` standalone function is absorbed into `PathfindingComponent`. The `GameScene` becomes a thin phatty `Scene` responsible only for creating entities and wiring the camera; simulation and rendering are driven entirely through component `update()` hooks.

Controller ownership and idle behavior are explicitly out of scope and will be added as components in a later phase.

## User Stories

1. As a developer, I want the simulation state (tile grid, unit positions, movement) to live inside ECS components, so that all game logic is driven by the same update loop without manual wiring.
2. As a developer, I want `GridComponent` to own the tile array and obstacle generation, so that any component can read grid data by holding a reference to it.
3. As a developer, I want `GridRendererComponent` to draw the static tile grid once in `create()`, so that a 200×200 tile grid does not incur a per-frame draw cost.
4. As a developer, I want `UnitFactoryComponent` to spawn all unit entities in `create()`, so that the world entity is responsible for bootstrapping the unit population.
5. As a developer, I want each unit to have its own entity with `PositionComponent`, `MovementComponent`, `PathfindingComponent`, `WanderingComponent`, and `UnitRendererComponent`, so that per-unit behaviors are independently composable.
6. As a developer, I want `PositionComponent` to own `col`, `row`, `pixelX`, and `pixelY`, so that all positional state for a unit is in one place.
7. As a developer, I want `MovementComponent` to own the path deque and advance the unit's pixel position each frame, so that frame-by-frame movement is isolated from path computation.
8. As a developer, I want `MovementComponent` to emit an event when the path deque empties, so that other components can react without polling.
9. As a developer, I want `WanderingComponent` to listen for the path-empty event and delegate to `PathfindingComponent` with a random passable destination, so that wandering behavior is isolated from movement and pathfinding.
10. As a developer, I want `PathfindingComponent` to own the A* algorithm and expose a `requestPath(col, row)` method that writes the result to `MovementComponent`, so that path computation is reusable by any component that needs it.
11. As a developer, I want `PathfindingComponent` to receive a `GridComponent` reference as a constructor argument, so that it can read passability data without querying the scene.
12. As a developer, I want `UnitRendererComponent` to clear and redraw its `Graphics` object each frame at the position from `PositionComponent`, so that the visual always reflects the current simulation state.
13. As a developer, I want `UnitRendererComponent` to have a higher `priority` than `MovementComponent`, so that it reads the updated position within the same frame it was written.
14. As a developer, I want `destroy()` implemented on every component that owns Phaser game objects, so that there are no resource leaks when the scene shuts down.
15. As a developer, I want the `GameScene` to extend phatty's `Scene` and contain no simulation logic, so that future behaviors are added by attaching components rather than editing the scene.
16. As a developer, I want the Vue–Phaser boundary (`EventBus`, `PhaserGame.vue`) to remain unchanged, so that the ECS migration is invisible to the Vue layer.
17. As a developer, I want `GridComponent` to expose an `isPassable(col, row)` method and a `randomPassableTile()` helper, so that other components can read grid state through a stable interface.
18. As a developer, I want `UnitFactoryComponent` to receive the `GridComponent` reference as a constructor argument and pass it down to `PathfindingComponent` and `WanderingComponent` when creating each unit entity, so that grid access is explicit and traceable.
19. As a developer, I want each component to have its own test file, so that behaviors are verified in isolation without running a full Phaser game.
20. As a developer, I want the A* test cases (currently in `pathfinder.spec.ts`) migrated to `PathfindingComponent.spec.ts`, so that the algorithm is still fully covered after the standalone function is deleted.
21. As a developer, I want the grid test cases (currently in `grid.spec.ts`) migrated to `GridComponent.spec.ts`, so that tile generation and passability checks are still fully covered after the `Grid` class is deleted.
22. As a developer, I want the movement and wandering test cases (currently in `world.spec.ts`) migrated to `MovementComponent.spec.ts` and `WanderingComponent.spec.ts`, so that tick-loop behavior is still verified after the `World` class is deleted.
23. As a developer, I want to query unit entities by component type using `this.entities.query.with(PositionComponent).all()`, so that future systems can locate all units without iterating manually.

## Implementation Decisions

### Architectural boundary
The entire simulation layer (`World`, `Grid`, `WorldFactory`, `Unit`, `pathfinder`) is deleted and replaced by ECS components. The `findPath()` function and its internal `MinHeap` move into `PathfindingComponent`. The `TileCoord` interface and tile-related types move alongside `GridComponent`. `EventBus.ts`, `PhaserGame.vue`, and all Vue files are unchanged.

### Library
Install **phatty** (`npm install phatty`). `GameScene` extends phatty's `Scene`. All components extend phatty's `Component`.

### Entity model

**World entity** (one) — created first in `GameScene.create()`:
- `GridComponent` — generates tile array in `create()`, exposes `isPassable()` and `randomPassableTile()`
- `GridRendererComponent` — draws all tiles once in `create()`, requires `GridComponent` on the same entity
- `UnitFactoryComponent` — receives a `GridComponent` reference as a constructor argument; creates all unit entities in `create()`

**Unit entities** (200, created by `UnitFactoryComponent`):
- `PositionComponent` — holds `col`, `row`, `pixelX`, `pixelY`; initialized to a random passable tile
- `MovementComponent` — owns `speed` and the `TileCoord[]` path deque; advances `pixelX`/`pixelY` toward the next waypoint each frame at `speed` tiles/second; snaps to tile center on arrival; emits a `'path-empty'` event when the deque is exhausted; requires `PositionComponent`
- `PathfindingComponent` — owns the A* algorithm and `MinHeap`; exposes `requestPath(col, row)` which computes the path and calls `movementComponent.setPath(result)`; receives `GridComponent` as a constructor argument; requires `MovementComponent`
- `WanderingComponent` — in `create()`, subscribes to `MovementComponent`'s `'path-empty'` event; on each emission, picks a random passable tile via the held `GridComponent` reference and calls `pathfindingComponent.requestPath(col, row)`; receives `GridComponent` as a constructor argument; requires `MovementComponent` and `PathfindingComponent`
- `UnitRendererComponent` — creates a `Phaser.GameObjects.Graphics` object in the constructor; `update()` clears and redraws a filled rectangle at `positionComponent.pixelX / pixelY`; priority `10` (runs after all other unit components); requires `PositionComponent`

### Execution order
`MovementComponent`, `PathfindingComponent`, and `WanderingComponent` all use the default priority `0`. `UnitRendererComponent` uses priority `10`, ensuring it reads the updated position after `MovementComponent` has advanced it. `GridRendererComponent` never runs `update()` (draw-once in `create()`).

### WanderingComponent ↔ PathfindingComponent delegation
`WanderingComponent.create()` resolves both `MovementComponent` (via `this.entity.components.get`) and `PathfindingComponent`. It subscribes to `movementComponent.events.on('path-empty', ...)`. The handler picks a random passable tile and calls `pathfindingComponent.requestPath(col, row)`. `PathfindingComponent.requestPath()` is a synchronous call: it runs A*, then calls `movementComponent.setPath(result)`. This chain completes within the same frame.

### GridComponent tile generation
Tile generation (200×200 array, 10% random obstacles) happens in `GridComponent.create()`, following phatty's convention of deferring initialization that should happen after the entity and scene are fully set up.

### UnitFactoryComponent and grid access
`UnitFactoryComponent` receives the `GridComponent` instance as a constructor argument (passed by `GameScene.create()`, which creates `GridComponent` first and passes it in). `UnitFactoryComponent.create()` uses the grid reference to pick random passable starting tiles and passes the same reference to `PathfindingComponent` and `WanderingComponent` on each new unit entity.

### GameScene structure
`GameScene.create()`:
1. Emits `EventBus` `'current-scene-ready'` and `'navigate'` events (unchanged).
2. Creates the world entity, adds `GridComponent`, then `GridRendererComponent`, then `UnitFactoryComponent` (with the `GridComponent` instance).
3. Centers the camera on the grid.

`GameScene` does not override `update()`. Phatty dispatches all component `update()` hooks automatically.

### Rendering colors
A shared `COLORS` constant object (tile and unit colors) is defined in the game layer and imported by `GridRendererComponent` and `UnitRendererComponent`.

### Deleted constructs
- `Grid` class and `grid.ts`
- `World` class, `WorldFactory` class, and `world.ts`
- `Unit` interface and `unit.ts`
- `findPath()` function, `MinHeap` class, and `pathfinder.ts`

### Surviving constructs
- `TileCoord` interface — moves alongside `GridComponent`
- `TileType` and `Tile` types — move into `GridComponent`
- `COLS`, `ROWS`, `TILE_SIZE`, `OBSTACLE_DENSITY` constants — move into `GridComponent`
- `EventBus` — unchanged
- `Boot`, `Preloader`, `MainMenu`, `GameOver` scenes — unchanged (still extend Phaser's `Scene` directly)

## Testing Decisions

### What makes a good test
Test the **observable output** of a component given controlled inputs — not internal field assignments. Inject mock or stub dependencies as constructor arguments. For renderer components, use a mock `Graphics` with spy methods and assert draw calls. For logic components, stub sibling components and assert method calls or event emissions. Never assert on private fields.

### Modules to test and migration

- **GridComponent** (`GridComponent.spec.ts`) — migrated from `grid.spec.ts`: tile generation, obstacle density, `isPassable()`, bounds checks, `getTile()`, `randomPassableTile()`. Mock the scene; no Phaser canvas needed.
- **MovementComponent** (`MovementComponent.spec.ts`) — migrated from `world.spec.ts` (tick/movement cases): path advance, waypoint snap, `setPath()`, `'path-empty'` event emission. Stub `PositionComponent`.
- **PathfindingComponent** (`PathfindingComponent.spec.ts`) — migrated from `pathfinder.spec.ts`: all A* cases (diagonal, corner-cut, obstacles, unreachable). Call via `requestPath()` with a stub `GridComponent` and stub `MovementComponent`; assert `setPath()` is called with the correct result.
- **WanderingComponent** (`WanderingComponent.spec.ts`) — migrated from `world.spec.ts` (wandering cases): subscribes to `'path-empty'`, calls `requestPath()` with a passable tile. Stub `MovementComponent`, `PathfindingComponent`, and `GridComponent`.
- **UnitRendererComponent** (`UnitRendererComponent.spec.ts`) — assert `update()` calls `fillRect` at `positionComponent.pixelX / pixelY`; assert `destroy()` disposes the `Graphics` object. Stub `PositionComponent` and mock `Graphics`.
- **GridRendererComponent** (`GridRendererComponent.spec.ts`) — assert `create()` produces draw calls for every tile type; assert `destroy()` disposes the `Graphics` object. Stub `GridComponent` and mock `Graphics`.

### Prior art
Existing tests in `src/game/simulation/__tests__/` use plain object stubs with no Phaser canvas and are the model for new component tests. The Phaser module mock pattern from `src/game/__tests__/EventBus.spec.ts` is reused wherever a component accesses `this.entity.scene`.

### Deleted test files
`world.spec.ts`, `grid.spec.ts`, and `pathfinder.spec.ts` are deleted once their test logic has been fully migrated to the corresponding component spec files.

## Out of Scope

- Controller ownership (`'p1'` / `'p2'`), idle timers, and unit claiming/releasing — deferred to a future phase.
- Input handling, camera follow, split-screen, or any multiplayer feature.
- Migrating `Boot`, `Preloader`, `MainMenu`, or `GameOver` scenes to phatty.
- Introducing new visual features (highlight rings, zoom, per-player colors).
- Changing `PhaserGame.vue`, `EventBus.ts`, or any Vue component.
- Per-viewport camera components.

## Further Notes

- The one-entity-per-unit model enables future per-unit components (controller, input routing, camera follow, visual state) to be added without modifying any existing component.
- `PathfindingComponent.requestPath()` is a synchronous public method. This makes it testable without async setup and makes `WanderingComponent`'s delegation chain deterministic within a single frame.
- If 200 individual `Graphics` objects prove to be a performance concern, `UnitRendererComponent` can be replaced by a single `UnitLayerComponent` on the world entity without changing any other component's interface.
- Phatty's `QueryBuilder` (`this.entities.query.with(PositionComponent).all()`) is the mechanism future systems will use to locate all units or specific subsets. The entity structure established here makes those queries natural.
