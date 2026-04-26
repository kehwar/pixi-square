---
date: 2026-04-26
---

# ECS Architecture Migration Complete

## Problem Statement

The `Game` Phaser scene was monolithic. The simulation layer (`World`, `Grid`, `WorldFactory`, `Unit`, `pathfinder`) was a parallel object graph sitting entirely outside the ECS. Adding per-entity behaviors required touching both the scene class and the simulation classes simultaneously. There was no compositional model for attaching, removing, or reordering behaviors per entity. Teardown was manual and error-prone — systems had to be explicitly called in `destroy()` with no lifecycle guarantee.

The goal was to replace the whole stack with **bitECS**, keeping the Vue/Phaser boundary (`EventBus`, `PhaserGame.vue`) untouched.

## Solution

Two sequential plan phases delivered the migration:

**Phase A (ECS Migration — 3 phases):** Deleted the old simulation layer and replaced it with bitECS system files. `GameScene` was introduced as a plain `Phaser.Scene` subclass. Systems were plain exported functions. Components were module-level SoA arrays.

**Phase B (Component System Infrastructure — 6 phases + cleanup):** Introduced the `ComponentSystem<TComponent, TStorage>` abstract base class, which acts simultaneously as the bitECS component token and as the holder of per-entity lifecycle hooks. `createWorld(scene)` replaced raw `createBitECSWorld`. `installSystem` wired `observe`/`onAdd`+`onRemove` automatically. All eight system files were migrated to class subclasses. `GameScene` was cleaned to a pure wiring layer.

End state: 200 units wander a 200×200 obstacle grid indefinitely using A\*, driven by Phaser's scene lifecycle with no manual teardown calls.

## Implementation Decisions

### `ComponentSystem<TComponent, TStorage>` as bitECS token + lifecycle holder

The class constructor doubles as the bitECS component token passed to `addComponent`, `query`, and `observe`. It also holds instance methods (`getComponent`, `setComponent`, `clearComponent`) and lifecycle hooks (`install`, `uninstall`, `create`, `update`, `destroy`, `sleep`, `wake`, `pause`, `resume`). This means a single `world.installSystem(new GridSystem())` call wires the full lifecycle — no separate registration step.

Phantom `protected declare` fields anchor both type parameters (`TComponent`, `TStorage`) for TypeScript without runtime cost. `TStorage` defaults to `TComponent[]` so AoS subclasses only need one type argument.

### AoS vs SoA storage per system

SoA (struct-of-arrays) is used for `PositionSystem` and `MovementSystem`, where numeric fields are hot-path and benefit from cache locality. AoS (array-of-structs) is used for `GridSystem`, `GridRendererSystem`, and `UnitRendererSystem`, where each entity holds a rich object (`GridData`, `Graphics`, `Image`) that makes field-separation pointless.

`ComponentSystem.getComponent` defaults to AoS (`storage[eid]`). SoA subclasses override it to pluck fields from their typed struct.

### `world.addComponent(SystemClass, eid, init?)`

Plain bitECS `addComponent` fires `create` immediately via `observe`/`onAdd`, but the hook runs before the caller can set initial values. The `init` callback pattern — `world.addComponent(PositionSystem, eid, (w, sys, e) => sys.setPosition(w, e, col, row))` — solves this: the callback receives a fully-typed system instance and fires after `create`, so initial state can be set with proper type safety at the call site.

### `world.events` as a dedicated `EventEmitter`

Cross-system events (e.g. `'movement:path-empty'`) go on a world-owned `Phaser.Events.EventEmitter`, not on Phaser's internal scene bus. This keeps game-logic events cleanly separated from Phaser's engine lifecycle events and avoids interference if the scene is paused or restarted.

### `utils/pathfinding.ts` — zero ECS coupling

A\*, `MinHeap`, `findPath`, and `requestPath` live in `src/game/utils/pathfinding.ts` as pure functions that accept data objects directly — no world, no entity IDs at the algorithm level. `requestPath(gridData, movementData, positionData, eid, col, row)` writes into the movement data store passed to it. `PathfindingSystem` became a no-op marker class so the class token can still be used for `addComponent`/`query`.

`isPassable(gridData, col, row)` and `randomPassableTile(gridData)` in `GridSystem` accept a `GridData` object directly — no `worldEid` parameter — so any code with a reference to grid data can call them without going through the world.

### `WanderingSystem` resolves the grid entity at event time

`WanderingSystem.install` registers a single `'movement:path-empty'` listener. The listener calls `query(world, [GridSystem])` at event time to locate the grid entity rather than capturing a `worldEid` closure at install time. This means `WanderingSystem` has no dependency on installation order relative to the grid.

### `world.systems` as `Map<ComponentSystemClass, ComponentSystem>`

Started as an array, briefly tried `Set`, settled on `Map` keyed by constructor. O(1) typed lookup via `world.getComponent(SystemClass, eid)` and `world.getComponentStorage(SystemClass)` made call sites cleaner and eliminated a pattern where callers stored system references as scene fields.

### Teardown guarded by `_tornDown` flag

Phaser emits `shutdown` before `destroy` on scene removal. Both events call the same `_teardown()` method, which is idempotent via a `_tornDown: boolean` guard. Teardown sequence: per-entity `destroy` hook for each system (via `query`) → per-system `uninstall` → drain `world.observers`.

## Alternatives Considered

**Keep systems as plain exported functions (original Phase A approach).** Worked fine for three systems but produced no composable lifecycle model. Teardown required calling a `destroySystems` free-function manually in the scene. Adding `sleep`/`wake`/`pause`/`resume` hooks would have required more manual wiring. Replaced by `ComponentSystem` in Phase B.

**Store system instances on `GameScene` as member fields.** Early drafts had `this.movementSystem` etc. so the scene could call per-system update/destroy directly. Eliminated by Phase 6: `GameScene.update` now iterates `world.systems` with no named system references.

**Attach `UnitFactorySystem` to its own entity.** Considered giving the factory system a dedicated entity to avoid coupling it to the grid entity. Rejected — the factory needs `Grid[eid]` populated before it runs, and attaching to the same entity as `GridSystem` guarantees it fires after `GridSystem.create` in observer order. Using a separate entity would require an explicit dependency signal.

**Use Phaser's scene bus for `'movement:path-empty'`.** Rejected to avoid any risk of Phaser engine events silencing game-logic events during scene transitions.

## Further Notes

### Final file structure

```
src/game/
  EventBus.ts                  — unchanged throughout
  systems/
    World.ts                   — GameWorldContext, GameWorld, createWorld()
    ComponentSystem.ts         — abstract base class + ComponentSystemClass type
    GridSystem.ts
    GridRendererSystem.ts
    PositionSystem.ts
    MovementSystem.ts
    PathfindingSystem.ts       — no-op marker class
    WanderingSystem.ts
    UnitRendererSystem.ts
    UnitFactorySystem.ts
  utils/
    pathfinding.ts             — A*, MinHeap, findPath, requestPath
  scenes/
    GameScene.ts
```

Deleted: `Game.ts`, `world.ts`, `unit.ts`, `pathfinder.ts`, `grid.ts` and all their spec files (test coverage migrated to system spec files).

### Test count

96 tests passing across 11 spec files. All A\* cases, movement tick semantics, wandering event handling, grid generation and rendering, and scene lifecycle are covered in isolation via Phaser mocks.

### What this enables

The `ComponentSystem` + `world.installSystem` model is the composition point for all future per-entity behaviors. Adding a new behavior is: write a `ComponentSystem` subclass, call `world.installSystem`, attach to entities. The scene wiring layer does not need to change.
