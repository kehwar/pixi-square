## Problem Statement

The `Game` Phaser scene is monolithic, and the simulation layer (`World`, `Grid`, `pathfinder`, `Unit`) is a parallel object graph that sits outside the ECS entirely. Adding new per-entity behaviors requires modifying both the scene class and the simulation classes simultaneously, and there is no compositional model for attaching, removing, or reordering behaviors per entity. The simulation layer cannot be driven by Phaser's update loop without manual wiring in the scene.

## Solution

Migrate the entire game — both the Phaser scene layer and the simulation layer — to use the **bitECS** library (`npm install bitecs`). The `World`, `Grid`, `WorldFactory`, and `Unit` constructs are deleted and replaced by focused system files, each owning a component definition and a system function. The `findPath()` standalone function is absorbed into `PathfindingSystem`. The `GameScene` extends plain `Phaser.Scene`, creates the bitECS world in `create()`, and explicitly calls system functions in `update()`.

Controller ownership and idle behavior are explicitly out of scope and will be added as systems in a later phase.

## User Stories

1. As a developer, I want the simulation state (tile grid, unit positions, movement) to live inside bitECS components, so that all game logic is driven by the same update loop without manual wiring.
2. As a developer, I want `GridSystem` to own the tile array and obstacle generation, so that any system can read grid data through the exported helper functions.
3. As a developer, I want `GridRendererSystem.create()` to draw the static tile grid once, so that a 200×200 tile grid does not incur a per-frame draw cost.
4. As a developer, I want `UnitFactorySystem.create()` to spawn all unit entities, so that unit bootstrapping is isolated in one place and called explicitly by the scene.
5. As a developer, I want each unit to have its own entity with `Position`, `Movement`, `Pathfinding`, `Wandering`, and `UnitGraphics` components, so that per-unit data is independently queryable.
6. As a developer, I want `Position` to own `col`, `row`, `pixelX`, and `pixelY`, so that all positional state for a unit is in one place.
7. As a developer, I want `MovementSystem.update()` to own the path deque and advance the unit's pixel position each frame, so that frame-by-frame movement is isolated from path computation.
8. As a developer, I want `MovementSystem.update()` to emit a `'movement:path-empty'` event on `world.events` when a path deque empties, so that other systems can react without polling.
9. As a developer, I want `WanderingSystem.create()` to subscribe to `world.events` `'movement:path-empty'` and delegate to `requestPath()` with a random passable destination, so that wandering behavior is isolated from movement and pathfinding.
10. As a developer, I want `PathfindingSystem` to own the A* algorithm and export a `requestPath(world, eid, col, row)` function that writes the result into `Movement.path[eid]`, so that path computation is reusable by any code that needs it.
11. As a developer, I want grid passability to be readable via `isPassable()` and `randomPassableTile()` exported from `GridSystem`, so that any system can access grid state through a stable interface without coupling to the world entity ID.
12. As a developer, I want `UnitRendererSystem.update()` to generate a shared unit texture on its first call and create one `Image` per unit entity, then reposition each `Image` to `Position.pixelX[eid]` / `Position.pixelY[eid]` on every subsequent call, so that units are rendered without per-frame geometry rebuilding.
13. As a developer, I want `UnitRendererSystem.update()` to be called after `MovementSystem.update()` in the scene's `update()` method, so that it reads the updated position within the same frame it was written.
14. As a developer, I want a `destroySystems(world)` function called in `GameScene`'s shutdown hook to dispose all Phaser game objects owned by systems, so that there are no resource leaks when the scene shuts down.
15. As a developer, I want the `GameScene` to extend plain `Phaser.Scene` and contain no simulation logic, so that future behaviors are added by writing new system files and calling them from `update()`.
16. As a developer, I want the Vue–Phaser boundary (`EventBus`, `PhaserGame.vue`) to remain unchanged, so that the ECS migration is invisible to the Vue layer.
17. As a developer, I want `isPassable(worldEid, col, row)` and `randomPassableTile(worldEid)` exported from `GridSystem`, so that PathfindingSystem and WanderingSystem can read grid state through a stable function interface.
18. As a developer, I want `UnitFactorySystem.create()` to use `isPassable` and `randomPassableTile` from `GridSystem` when placing units, so that grid access is explicit and traceable.
19. As a developer, I want each system to have its own test file, so that behaviors are verified in isolation without running a full Phaser game.
20. As a developer, I want the A* test cases (currently in `pathfinder.spec.ts`) migrated to `PathfindingSystem.spec.ts`, so that the algorithm is still fully covered after the standalone function is deleted.
21. As a developer, I want the grid test cases (currently in `grid.spec.ts`) migrated to `GridSystem.spec.ts`, so that tile generation and passability checks are still fully covered after the `Grid` class is deleted.
22. As a developer, I want the movement and wandering test cases (currently in `world.spec.ts`) migrated to `MovementSystem.spec.ts` and `WanderingSystem.spec.ts`, so that tick-loop behavior is still verified after the `World` class is deleted.
23. As a developer, I want to query unit entities using `query(world, [Position, Movement])`, so that future systems can locate all units without iterating manually.

## Implementation Decisions

### Architectural boundary
The entire simulation layer (`World`, `Grid`, `WorldFactory`, `Unit`, `pathfinder`) is deleted and replaced by bitECS system files. The `findPath()` function and its internal `MinHeap` move into `PathfindingSystem`. The `TileCoord` interface and tile-related types move alongside `GridSystem`. `EventBus.ts`, `PhaserGame.vue`, and all Vue files are unchanged.

### Library
Install **bitECS** (`npm install bitecs`). `GameScene` extends plain `Phaser.Scene`. Systems are plain functions; components are module-level arrays exported from each system file.

### World context
The bitECS world is created with a typed context object:

```ts
interface GameWorld {
  scene: Phaser.Scene
  events: Phaser.Events.EventEmitter
}
const world = createWorld<GameWorld>({ scene: this, events: new Phaser.Events.EventEmitter() })
```

Every system function receives `world` and accesses `world.scene` and `world.events` directly. No component class constructors or dependency injection — all cross-system references go through the world context or the shared component arrays.

### Component definitions
Each system file exports its component(s) at module level. Components follow bitECS conventions — plain arrays or SoA objects indexed by entity ID:

- **GridSystem.ts** — `Grid = [] as { tiles: Tile[][] }[]`
- **PositionSystem.ts** — `Position = { col: number[], row: number[], pixelX: number[], pixelY: number[] }`
- **MovementSystem.ts** — `Movement = { speed: number[], path: [] as TileCoord[][] }`
- **PathfindingSystem.ts** — `Pathfinding = {}` (marker component)
- **WanderingSystem.ts** — `Wandering = {}` (marker component)
- **UnitRendererSystem.ts** — `UnitSprite = [] as { sprite: Phaser.GameObjects.Image }[]`

### Entity model

**World entity** (one, `worldEid`) — created first in `GameScene.create()`:
- `Grid` — `Grid[worldEid] = { tiles: generateTiles() }` set inside `GridSystem.create(world, worldEid)`
- No renderer component — `GridRendererSystem.create(world, worldEid)` draws tiles immediately and stores its `Graphics` object internally for later disposal

**Unit entities** (200, created by `UnitFactorySystem.create(world, worldEid)`):
- `Position` — `Position.col[eid]`, `Position.row[eid]`, `Position.pixelX[eid]`, `Position.pixelY[eid]`; initialized to a random passable tile
- `Movement` — `Movement.speed[eid]`, `Movement.path[eid]` (a `TileCoord[]` deque)
- `Pathfinding` — marker; presence indicates the entity participates in pathfinding queries
- `Wandering` — marker; presence indicates the entity participates in wandering queries
- `UnitSprite` — `UnitSprite[eid] = { sprite: ... }`; populated by `UnitRendererSystem.update()` on its first call

### Execution order
`GameScene.update(time, delta)` calls systems in this fixed order:

1. `MovementSystem.update(world, delta)` — advances `pixelX`/`pixelY`, emits `'movement:path-empty'` on drain
2. `UnitRendererSystem.update(world)` — on first call: generates shared texture and creates one `Image` per unit; on every call: repositions each `Image`

`WanderingSystem` has no `update()`. Its handler (registered in `create()`) fires synchronously inside `MovementSystem.update()` as part of the `world.events.emit('movement:path-empty', eid)` call chain: `WanderingSystem` listener → `requestPath(world, eid, col, row)` → `Movement.path[eid] = result`. The new path is available immediately.

`GridRendererSystem` has no `update()` — draw-once in `create()`.

`PathfindingSystem` has no `update()` — called on-demand via `requestPath()`.

### UnitRendererSystem — shared texture and first-update initialization
On the first call to `UnitRendererSystem.update(world)`, the system:
1. Creates a temporary `Graphics` object via `world.scene.add.graphics()`.
2. Draws one filled rectangle (unit size) at `(0, 0)` with `fillStyle` + `fillRect`.
3. Calls `generateTexture('unit', unitSize, unitSize)` to bake it into a named texture.
4. Destroys the temporary `Graphics` object.
5. Iterates `query(world, [Position, UnitSprite])` and for each entity calls `world.scene.add.image(pixelX, pixelY, 'unit')`, storing the result in `UnitSprite[eid].sprite`.
6. Sets an internal `initialized` flag to skip this block on future calls.

On every subsequent call the system iterates the same query and calls `sprite.setPosition(Position.pixelX[eid], Position.pixelY[eid])` — no geometry is rebuilt.

### WanderingSystem ↔ PathfindingSystem delegation
`WanderingSystem.create(world)` calls `world.events.on('movement:path-empty', (eid: number) => { ... })`. The handler calls `randomPassableTile(worldEid)` from `GridSystem` and then `requestPath(world, eid, col, row)` from `PathfindingSystem`. `requestPath()` runs A* synchronously and writes `Movement.path[eid] = result`. This chain completes within the same frame it is triggered.

### GridSystem tile generation and helpers
Tile generation (200×200 array, 10% random obstacles) runs inside `GridSystem.create(world, worldEid)`. Helper functions exported from `GridSystem.ts`:

- `isPassable(worldEid: number, col: number, row: number): boolean`
- `randomPassableTile(worldEid: number): TileCoord`

Both read directly from `Grid[worldEid].tiles`. Any system that imports `GridSystem` can call them.

### UnitFactorySystem and grid access
`UnitFactorySystem.create(world, worldEid)` imports `isPassable` and `randomPassableTile` from `GridSystem`. For each of the 200 units it:
1. Calls `addEntity(world)` and attaches `Position`, `Movement`, `Pathfinding`, `Wandering`, `UnitSprite` with `addComponent`.
2. Picks a random passable starting tile via `randomPassableTile(worldEid)` and writes the initial position values.
3. Immediately calls `requestPath(world, eid, col, row)` to seed the first path.

`UnitSprite[eid]` is left uninitialized at this point — `UnitRendererSystem.update()` populates it on its first call.

### GameScene structure
`GameScene.create()`:
1. Creates `world` with `{ scene: this, events: new Phaser.Events.EventEmitter() }`.
2. Creates `worldEid = addEntity(world)` and attaches `Grid`.
3. Calls `GridSystem.create(world, worldEid)` — generates tile array.
4. Calls `GridRendererSystem.create(world, worldEid)` — draws tiles once.
5. Calls `WanderingSystem.create(world)` — subscribes event listener.
6. Calls `UnitFactorySystem.create(world, worldEid)` — spawns 200 unit entities.
7. Centers camera on grid.
8. Emits `EventBus` `'current-scene-ready'` and `'navigate'` events (unchanged).

`GameScene.update(time, delta)`:
1. `MovementSystem.update(world, delta)`
2. `UnitRendererSystem.update(world)`

`GameScene` registers a shutdown listener to call `destroySystems(world)`, which disposes the `Graphics` object owned by `GridRendererSystem` and each `UnitSprite[eid].sprite`.

### Rendering colors
A shared `COLORS` constant object (tile and unit colors) is defined in the game layer and imported by `GridRendererSystem` and `UnitRendererSystem`.

### Deleted constructs
- `Grid` class and `grid.ts`
- `World` class, `WorldFactory` class, and `world.ts`
- `Unit` interface and `unit.ts`
- `findPath()` function, `MinHeap` class, and `pathfinder.ts`

### Surviving constructs
- `TileCoord` interface — moves alongside `GridSystem`
- `TileType` and `Tile` types — move into `GridSystem`
- `COLS`, `ROWS`, `TILE_SIZE`, `OBSTACLE_DENSITY` constants — move into `GridSystem`
- `EventBus` — unchanged
- `Boot`, `Preloader`, `MainMenu`, `GameOver` scenes — unchanged (still extend Phaser's `Scene` directly)

## Testing Decisions

### What makes a good test
Test the **observable output** of a system function given controlled inputs — not internal array state. Build a real bitECS world with `createWorld()`, add entities and components, call the system function, and assert the resulting component values or emitted events. For renderer systems, mock `world.scene.add.graphics()` with a spy object and assert draw calls. Never assert on private module state.

### Modules to test and migration

- **GridSystem** (`GridSystem.spec.ts`) — migrated from `grid.spec.ts`: tile generation, obstacle density, `isPassable()`, bounds checks, `randomPassableTile()`. Create a real `createWorld()` with a mock scene; call `GridSystem.create(world, worldEid)`; assert helper function outputs.
- **MovementSystem** (`MovementSystem.spec.ts`) — migrated from `world.spec.ts` (tick/movement cases): path advance, waypoint snap, `'movement:path-empty'` event emission. Create a world with mock `events`; set `Movement.path[eid]`; call `MovementSystem.update(world, delta)`; assert `Position.pixelX[eid]` and that `world.events.emit` was called with `'movement:path-empty'`.
- **PathfindingSystem** (`PathfindingSystem.spec.ts`) — migrated from `pathfinder.spec.ts`: all A* cases (diagonal, corner-cut, obstacles, unreachable). Call `requestPath(world, eid, col, row)` with a world whose `Grid[worldEid]` contains a controlled tile map; assert `Movement.path[eid]` equals the expected route.
- **WanderingSystem** (`WanderingSystem.spec.ts`) — migrated from `world.spec.ts` (wandering cases): `create()` subscribes to `'movement:path-empty'`; emitting it triggers `requestPath` with a passable tile. Stub `world.events` with a real `Phaser.Events.EventEmitter`; spy on `requestPath`; call `WanderingSystem.create(world)` then emit `'movement:path-empty'`; assert `requestPath` was called.
- **UnitRendererSystem** (`UnitRendererSystem.spec.ts`) — first-call: assert `generateTexture('unit', ...)` is called on the temporary `Graphics` spy, the temporary `Graphics` is destroyed, and `world.scene.add.image()` is called once per unit entity with the correct initial position; subsequent-call: assert `sprite.setPosition()` is called for each entity with updated `Position.pixelX[eid]` / `Position.pixelY[eid]`; assert `destroySystems(world)` calls `sprite.destroy()` for each entity. Mock `world.scene.add.graphics()` and `world.scene.add.image()` as spy factories.
- **GridRendererSystem** (`GridRendererSystem.spec.ts`) — assert `create()` produces `fillRect` draw calls for every tile; assert `destroySystems(world)` calls `gfx.destroy()`. Mock `world.scene.add.graphics()` returning a spy object; stub `Grid[worldEid]`.

### Prior art
Existing tests in `src/game/simulation/__tests__/` use plain object stubs with no Phaser canvas and are the model for new system tests. The Phaser module mock pattern from `src/game/__tests__/EventBus.spec.ts` is reused wherever a system accesses `world.scene`.

### Deleted test files
`world.spec.ts`, `grid.spec.ts`, and `pathfinder.spec.ts` are deleted once their test logic has been fully migrated to the corresponding system spec files.

## Out of Scope

- Controller ownership (`'p1'` / `'p2'`), idle timers, and unit claiming/releasing — deferred to a future phase.
- Input handling, camera follow, split-screen, or any multiplayer feature.
- Migrating `Boot`, `Preloader`, `MainMenu`, or `GameOver` scenes.
- Introducing new visual features (highlight rings, zoom, per-player colors).
- Changing `PhaserGame.vue`, `EventBus.ts`, or any Vue component.
- Per-viewport camera systems.

## Further Notes

- The one-entity-per-unit model enables future per-unit systems (controller, input routing, camera follow, visual state) to be added as new system files without modifying any existing system.
- `requestPath()` is a synchronous exported function. This makes it testable without async setup and makes the WanderingSystem delegation chain deterministic within a single frame.
- `UnitRendererSystem` generates the unit texture once and repositions `Image` game objects each frame — no per-frame geometry rebuilding. If even `setPosition` per-entity becomes a bottleneck with very large unit counts, the system can be replaced by a `RenderTexture`-stamp approach operating on `query(world, [Position, UnitSprite])` without changing any other system's interface.
- `query(world, [Position, Movement])` is the mechanism future systems will use to locate all units or specific subsets. The component structure established here makes those queries natural.
- The shared `'unit'` texture key is owned by `UnitRendererSystem`. No other system should reference it by name.
