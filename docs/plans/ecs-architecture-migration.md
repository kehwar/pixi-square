# Plan: ECS Architecture Migration

> Source PRD: docs/prd/ecs-architecture-migration.md

## Architectural decisions

- **ECS library**: phatty — `GameScene` extends phatty `Scene`, all components extend phatty `Component`
- **Entity model**: one world entity (grid + factory) + 200 unit entities
- **Component priorities**: logic components default `0`; `UnitRendererComponent` priority `10`
- **Grid constants**: `COLS=200`, `ROWS=200`, `TILE_SIZE=32`, `OBSTACLE_DENSITY=0.1` — live in `GridComponent`
- **New scene file**: `GameScene.ts` is created in Phase 1 alongside the existing `Game.ts`; `Game.ts` is deleted only in Phase 3 once `GameScene.ts` is fully functional
- **Vue boundary**: `EventBus.ts` and `PhaserGame.vue` are never modified
- **Deleted constructs (end-state)**: `Game.ts`, `Grid`, `World`, `WorldFactory`, `Unit`, `findPath`, `MinHeap` — fully replaced by `GameScene.ts` and ECS components

---

## Phase 1: phatty scaffold + grid rendering

**User stories**: 2, 3, 15, 16, 17, 21

### What to build

Install phatty. Create `GameScene.ts` as a new file alongside `Game.ts` — it extends phatty's `Scene` and is registered in `main.ts` in place of `Game`. The scene creates a single world entity with two components:

- `GridComponent`: generates the 200×200 tile array with 10% obstacle density in `create()`; exposes `isPassable(col, row)` and `randomPassableTile()`; owns `COLS`, `ROWS`, `TILE_SIZE`, and `OBSTACLE_DENSITY` constants; owns the `TileCoord`, `TileType`, and `Tile` types.
- `GridRendererComponent`: draws every tile exactly once in `create()` using a single `Phaser.GameObjects.Graphics` object; never runs `update()`; implements `destroy()` to dispose the graphics object; requires `GridComponent` on the same entity.

`GameScene.create()` emits the same `EventBus` events (`'current-scene-ready'`, `'navigate'`) as the current `Game.ts`, keeping the Vue layer unaware of the change. The camera is centered on the grid.

Grid test cases from `grid.spec.ts` are migrated to `GridComponent.spec.ts` and `GridRendererComponent.spec.ts`. `Grid` class, `grid.ts`, and `grid.spec.ts` are deleted.

### Acceptance criteria

- [ ] `phatty` appears in `package.json` dependencies
- [ ] `GameScene.ts` exists and extends phatty `Scene`; `Game.ts` still exists but is no longer registered
- [ ] Booting the app shows the 200×200 tile grid with passable and obstacle colours
- [ ] `GridComponent.spec.ts` passes: tile generation, obstacle density, `isPassable()`, bounds checks, `getTile()`, `randomPassableTile()`
- [ ] `GridRendererComponent.spec.ts` passes: `create()` produces draw calls for every tile type; `destroy()` disposes the graphics object
- [ ] `grid.ts` and `grid.spec.ts` are deleted
- [ ] No Lint/TypeScript errors; all existing non-grid tests still pass

---

## Phase 2: unit population + static rendering

**User stories**: 4, 5, 6, 12, 13, 14, 18 (partial), 19

### What to build

Add three components to the project:

- `PositionComponent`: holds `col`, `row`, `pixelX`, `pixelY`; initialized to a random passable tile.
- `UnitRendererComponent`: creates a `Phaser.GameObjects.Graphics` object; `update()` clears and redraws a filled rectangle at `positionComponent.pixelX / pixelY`; priority `10`; requires `PositionComponent`; `destroy()` disposes the graphics object.
- `UnitFactoryComponent`: added to the world entity; receives the `GridComponent` instance as a constructor argument; `create()` spawns 200 unit entities, each with `PositionComponent` (random passable starting tile) and `UnitRendererComponent`.

200 coloured squares appear on the grid at their starting positions. They do not move yet.

`UnitRendererComponent.spec.ts` is written fresh: asserts `update()` calls `fillRect` at the correct pixel coordinates; asserts `destroy()` disposes the graphics object.

### Acceptance criteria

- [ ] 200 unit squares are visible on the grid at boot
- [ ] Each unit square is positioned at a passable tile
- [ ] `UnitRendererComponent.spec.ts` passes: `update()` draws at `positionComponent.pixelX / pixelY`; `destroy()` disposes graphics
- [ ] No Lint/TypeScript errors; all prior tests still pass

---

## Phase 3: movement, pathfinding, wandering, and full cleanup

**User stories**: 1, 7, 8, 9, 10, 11, 18 (complete), 20, 22, 23

### What to build

Add three components to complete autonomous unit behaviour:

- `MovementComponent`: owns `speed` and the `TileCoord[]` path deque; `update()` advances `pixelX`/`pixelY` toward the next waypoint at `speed` tiles/second, snapping to tile centre on arrival; calls `PositionComponent` to update `col`/`row` on snap; emits a `'path-empty'` event when the deque empties; exposes `setPath(path)`; requires `PositionComponent`.
- `PathfindingComponent`: owns the A\* algorithm and `MinHeap`; exposes `requestPath(col, row)` — runs A\* synchronously and calls `movementComponent.setPath(result)`; receives `GridComponent` as a constructor argument; requires `MovementComponent`.
- `WanderingComponent`: in `create()`, resolves `MovementComponent` and `PathfindingComponent` from the entity and subscribes to `movementComponent.events.on('path-empty', ...)`; the handler picks a random passable tile via the held `GridComponent` reference and calls `pathfindingComponent.requestPath(col, row)`; receives `GridComponent` as a constructor argument; requires `MovementComponent` and `PathfindingComponent`.

`UnitFactoryComponent` is updated to attach `MovementComponent`, `PathfindingComponent`, and `WanderingComponent` to every unit entity and to issue an initial `requestPath()` call per unit so movement begins immediately on boot.

Once all components are in place and all tests pass, the old simulation layer is deleted: `Game.ts`, `world.ts`, `unit.ts`, `pathfinder.ts`, `world.spec.ts`, and `pathfinder.spec.ts`. A\* test cases from `pathfinder.spec.ts` are migrated to `PathfindingComponent.spec.ts`. Movement and wandering cases from `world.spec.ts` are migrated to `MovementComponent.spec.ts` and `WanderingComponent.spec.ts`.

Entity querying via `this.entities.query.with(PositionComponent).all()` is verified to return all 200 unit entities.

### Acceptance criteria

- [ ] All 200 units wander the grid indefinitely without stopping
- [ ] Units navigate around obstacles using A\*
- [ ] `PathfindingComponent.spec.ts` passes: all A\* cases (diagonal, corner-cut, obstacles, unreachable)
- [ ] `MovementComponent.spec.ts` passes: path advance, waypoint snap, `setPath()`, `'path-empty'` event emission
- [ ] `WanderingComponent.spec.ts` passes: subscribes to `'path-empty'`, calls `requestPath()` with a passable tile
- [ ] `Game.ts`, `world.ts`, `unit.ts`, `pathfinder.ts`, `world.spec.ts`, `pathfinder.spec.ts` are all deleted
- [ ] `this.entities.query.with(PositionComponent).all()` returns 200 entities
- [ ] No Lint/TypeScript errors; full test suite passes
