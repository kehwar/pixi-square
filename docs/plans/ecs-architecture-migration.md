# Plan: ECS Architecture Migration

> Source PRD: docs/prd/ecs-architecture-migration.md

## Architectural decisions

- **ECS library**: bitECS — `GameScene` extends plain `Phaser.Scene`; systems are plain exported functions; components are SoA arrays indexed by entity ID
- **World context**: `createWorld<GameWorld>({ scene, events })` — systems access the Phaser scene and event emitter via `world.scene` / `world.events`; no class constructors or dependency injection
- **Entity model**: one world entity (`worldEid`) + 200 unit entities
- **Execution order**: `GameScene.update()` calls `MovementSystem.update(world, delta)` then `UnitRendererSystem.update(world)` each frame; `WanderingSystem` and `PathfindingSystem` have no `update()` — they are event-driven or on-demand
- **Grid constants**: `COLS=200`, `ROWS=200`, `TILE_SIZE=32`, `OBSTACLE_DENSITY=0.1` — live in `GridSystem`
- **New scene file**: `GameScene.ts` is created in Phase 1 alongside the existing `Game.ts`; `Game.ts` is deleted only in Phase 3 once `GameScene.ts` is fully functional
- **Vue boundary**: `EventBus.ts` and `PhaserGame.vue` are never modified
- **Deleted constructs (end-state)**: `Game.ts`, `Grid`, `World`, `WorldFactory`, `Unit`, `findPath`, `MinHeap` — fully replaced by `GameScene.ts` and bitECS system files

---

## Phase 1: bitECS scaffold + grid rendering

> ✅ Completed — bitECS installed; `GameScene.ts` created with world + grid wiring; `GridSystem.ts` and `GridRendererSystem.ts` implemented; spec files written; `main.ts` updated to register `GameScene`; `grid.ts` and `grid.spec.ts` preserved for Phase 3 cleanup.

**User stories**: 2, 3, 15, 16, 17, 21

### What to build

Install bitECS. Create `GameScene.ts` as a new file alongside `Game.ts` — it extends plain `Phaser.Scene` and is registered in `main.ts` in place of `Game`. The scene creates a bitECS world with a typed context (`{ scene, events }`), then creates a single world entity (`worldEid`).

Two system files handle the grid:

- `GridSystem.ts`: `GridSystem.create(world, worldEid)` generates the 200×200 tile array with 10% obstacle density and writes it into `Grid[worldEid]`; exports `isPassable(worldEid, col, row)` and `randomPassableTile(worldEid)` as stable helper functions; owns `COLS`, `ROWS`, `TILE_SIZE`, `OBSTACLE_DENSITY`, and the `TileCoord`, `TileType`, and `Tile` types.
- `GridRendererSystem.ts`: `GridRendererSystem.create(world, worldEid)` draws every tile exactly once using a single `Phaser.GameObjects.Graphics` object and stores it internally for later disposal; has no `update()`; `destroySystems(world)` disposes the graphics object.

`GameScene.create()` emits the same `EventBus` events (`'current-scene-ready'`, `'navigate'`) as the current `Game.ts`. The camera is centered on the grid.

Grid test cases from `grid.spec.ts` are migrated to `GridSystem.spec.ts` and `GridRendererSystem.spec.ts`. `grid.ts` and `grid.spec.ts` are deleted.

### Acceptance criteria

- [x] `bitecs` appears in `package.json` dependencies
- [x] `GameScene.ts` exists and extends plain `Phaser.Scene`; `Game.ts` still exists but is no longer registered
- [x] Booting the app shows the 200×200 tile grid with passable and obstacle colours
- [x] `GridSystem.spec.ts` passes: tile generation, obstacle density, `isPassable()`, bounds checks, `randomPassableTile()`
- [x] `GridRendererSystem.spec.ts` passes: `create()` produces `fillRect` draw calls for every tile type; `destroySystems()` disposes the graphics object
- [ ] ~~`grid.ts` and `grid.spec.ts` are deleted~~ — deferred to Phase 3 cleanup
- [x] No Lint/TypeScript errors; all existing non-grid tests still pass

### Notes

- `grid.ts` and `grid.spec.ts` were **not** deleted in this phase — they remain alongside the new `GridSystem.ts` and will be removed in Phase 3 along with the other old simulation files.
- `GridSystem.ts` uses plain JS arrays (`Grid: GridData[]`) rather than bitECS typed arrays because tiles are arbitrary objects (`{ type }`) not numeric SoA. `addComponent` is called to register the entity, but the data is stored directly in the array.
- `GridRendererSystem.ts` exposes `_getGraphics()` and `_reset()` helpers (prefixed `_`) for test access — not part of the public API.
- `GameScene.ts` registers a `shutdown` event listener (not `destroy`) to call `destroySystems` — this matches Phaser 4's scene lifecycle.

---

## Phase 2: unit population + static rendering

> ✅ Completed — `PositionSystem.ts`, `UnitFactorySystem.ts`, and `UnitRendererSystem.ts` created; 200 unit entities spawned on passable tiles; shared `'unit'` texture generated once via a temporary `Graphics` object; one `Image` per unit created on first `update()` call and repositioned on every subsequent call; `UnitRendererSystem.spec.ts` written with 10 passing tests; `GameScene.ts` updated to call `UnitFactorySystem.create` in `create()` and `UnitRendererSystem.update` in `update()`; all 95 tests pass.

**User stories**: 4, 5, 6, 12, 13, 14, 18 (partial), 19

### What to build

Add three system files:

- `PositionSystem.ts`: exports the `Position` SoA component (`col`, `row`, `pixelX`, `pixelY` arrays indexed by entity ID).
- `UnitRendererSystem.ts`: on the first call to `UnitRendererSystem.update(world)`, generates a shared `'unit'` texture via a temporary `Graphics` object, then creates one `Phaser.GameObjects.Image` per unit entity and stores it in `UnitSprite[eid].sprite`; on every subsequent call repositions each `Image` using `Position.pixelX[eid]` / `Position.pixelY[eid]`; `destroySystems(world)` calls `sprite.destroy()` for each entity. No per-frame geometry rebuilding.
- `UnitFactorySystem.ts`: `UnitFactorySystem.create(world, worldEid)` spawns 200 unit entities using `addEntity` + `addComponent`; picks a random passable starting tile per unit via `randomPassableTile(worldEid)` from `GridSystem`; writes initial `Position` values.

200 coloured squares appear on the grid at their starting positions. They do not move yet.

`UnitRendererSystem.spec.ts` is written fresh: first-call asserts `generateTexture('unit', ...)` is called, the temporary `Graphics` is destroyed, and `world.scene.add.image()` is called once per unit at the correct pixel coordinates; subsequent-call asserts `sprite.setPosition()` is called with updated coordinates; `destroySystems` asserts `sprite.destroy()` is called for each entity.

### Acceptance criteria

- [x] 200 unit squares are visible on the grid at boot
- [x] Each unit square is positioned at a passable tile
- [x] `UnitRendererSystem.spec.ts` passes: first-call initializes shared texture and `Image` objects; subsequent-call repositions each `Image`; `destroySystems` disposes all sprites
- [x] No Lint/TypeScript errors; all prior tests still pass

### Notes

- `PositionSystem.ts` exports both the `Position` SoA component and an `addPositionComponent` helper that computes `pixelX`/`pixelY` from `col`/`row` using `TILE_SIZE`.
- `UnitRendererSystem.ts` uses a module-level `unitEids: number[]` list populated on the first `update()` call (via `query(world, [Position])`); `destroySystems` and subsequent calls iterate this list rather than re-querying.
- `UnitRendererSystem._reset()` is exposed for test isolation (resets `UnitSprite`, `unitEids`, and `initialized`).
- `GameScene.update()` only calls `UnitRendererSystem.update(world)` at this phase; `MovementSystem.update(world, delta)` will be added in Phase 3.

---

## Phase 3: movement, pathfinding, wandering, and full cleanup

**User stories**: 1, 7, 8, 9, 10, 11, 18 (complete), 20, 22, 23

### What to build

Add three system files to complete autonomous unit behaviour:

- `MovementSystem.ts`: exports the `Movement` SoA component (`speed`, `path` arrays); `MovementSystem.update(world, delta)` advances `Position.pixelX[eid]` / `Position.pixelY[eid]` toward the next waypoint each frame, snapping to tile centre on arrival and updating `Position.col[eid]` / `Position.row[eid]`; emits `world.events.emit('movement:path-empty', eid)` when a path deque empties.
- `PathfindingSystem.ts`: exports `requestPath(world, eid, col, row)` — runs A\* synchronously against `Grid[worldEid]` and writes the result into `Movement.path[eid]`; owns the `MinHeap` implementation internally.
- `WanderingSystem.ts`: `WanderingSystem.create(world)` calls `world.events.on('movement:path-empty', eid => ...)` — the handler calls `randomPassableTile(worldEid)` from `GridSystem` and then `requestPath(world, eid, col, row)` from `PathfindingSystem`; the new path is available within the same frame.

`UnitFactorySystem.create` is updated to also attach `Movement`, `Pathfinding`, and `Wandering` components to each unit entity and call `requestPath` once per unit to seed the first path. `WanderingSystem.create(world)` is called in `GameScene.create()` before `UnitFactorySystem.create`.

Once all systems are in place and all tests pass, the old simulation layer is deleted: `Game.ts`, `world.ts`, `unit.ts`, `pathfinder.ts`, `world.spec.ts`, and `pathfinder.spec.ts`. A\* test cases from `pathfinder.spec.ts` are migrated to `PathfindingSystem.spec.ts`. Movement and wandering cases from `world.spec.ts` are migrated to `MovementSystem.spec.ts` and `WanderingSystem.spec.ts`.

Entity querying via `query(world, [Position, Movement])` is verified to return all 200 unit entities.

### Acceptance criteria

- [ ] All 200 units wander the grid indefinitely without stopping
- [ ] Units navigate around obstacles using A\*
- [ ] `PathfindingSystem.spec.ts` passes: all A\* cases (diagonal, corner-cut, obstacles, unreachable)
- [ ] `MovementSystem.spec.ts` passes: path advance, waypoint snap, `'movement:path-empty'` event emission
- [ ] `WanderingSystem.spec.ts` passes: subscribes to `'movement:path-empty'`, calls `requestPath` with a passable tile
- [ ] `Game.ts`, `world.ts`, `unit.ts`, `pathfinder.ts`, `world.spec.ts`, `pathfinder.spec.ts` are all deleted
- [ ] `query(world, [Position, Movement])` returns 200 entities
- [ ] No Lint/TypeScript errors; full test suite passes
