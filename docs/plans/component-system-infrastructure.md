# Plan: Component System Infrastructure

> Source PRD: docs/prd/component-system-infrastructure.md

## Architectural decisions

- **`ComponentSystem<TData>` token model**: the class constructor is both the bitECS component token (`addComponent`, `query`, `observe`) and the `world.components` Map key. No constructor parameters, no instance data property.
- **`GameWorld` interface**: `scene`, `events`, `components`, `observers`, `systems`, `installSystem`, `setupComponentData`. The complete contract — no fields are added outside `createWorld`.
- **`world.events`**: a dedicated `Phaser.Events.EventEmitter` owned by the world. Cross-system game events (e.g. `'movement:path-empty'`) go here, never on Phaser's internal scene bus.
- **Per-entity hook signatures**: all hooks receive `(world: GameWorld, eid: number)` — no `worldEid` parameter. Per-system hooks receive `(world: GameWorld)` only.
- **`installSystem` contract**: pushes system onto `world.systems`, stores the `observe` unsubscribe in `world.observers`, calls `system.install(world)` once. One call wires the full lifecycle.
- **System instantiation**: inline at call sites (`world.installSystem(new GridSystem())`). No module-level singletons.
- **`utils/pathfinding.ts`**: pure module — A\*, `MinHeap`, `findPath`, `requestPath` — accepting data objects directly. Zero ECS coupling.
- **`isPassable` / `randomPassableTile`**: accept a `GridData` object directly. No `worldEid` coupling.
- **Teardown order**: `destroy` and `shutdown` both run the same sequence — per-entity `destroy` for each system, then per-system `uninstall`, then drain `world.observers`.

---

## Phase 1: Foundation

> ✅ Completed — `ComponentSystem<TData>` abstract class and `createWorld(scene)` factory introduced in `src/game/systems/ComponentSystem.ts` and `src/game/systems/types.ts`. All lifecycle hooks default to no-ops. `installSystem` wires `observe`/`onAdd` and calls `system.install`. `setupComponentData` + `static getComponent` provide typed per-entity data access. 11 new tests; 77/77 suite green; no lint or TypeScript errors. No existing files modified.

**User stories**: 1, 2, 3, 4, 5, 6, 7, 8

### What to build

Introduce the `ComponentSystem<TData>` abstract base class and the `createWorld(scene)` factory. The base class exposes all lifecycle hooks as default no-ops and a `static getComponent(world, eid): TData` method. `createWorld` returns a fully typed `GameWorld` with `installSystem` and `setupComponentData` wired. `installSystem` registers an `observe` callback so that `addComponent(world, eid, SystemClass)` automatically fires `system.create(world, eid)`. No existing code is modified in this phase.

### Acceptance criteria

- [x] `ComponentSystem<TData>` abstract class exists with no-op defaults for all hooks: `install`, `uninstall`, `create`, `update`, `sleep`, `wake`, `pause`, `resume`, `destroy`
- [x] `static getComponent(world, eid): TData` returns the typed per-entity data object without a manual cast at the call site
- [x] `createWorld(scene)` returns a `GameWorld` with `scene`, `events`, `components`, `observers`, `systems`, `installSystem`, `setupComponentData` all initialised
- [x] `world.installSystem(system)` pushes to `world.systems`, stores the unsubscribe in `world.observers`, and calls `system.install(world)` once
- [x] Attaching a component via `addComponent(world, eid, SystemClass)` automatically fires `system.create(world, eid)` for that system
- [x] `world.setupComponentData(SystemClass, data)` stores `data` in `world.components` keyed by the constructor
- [x] Tests assert: `world.systems` contains the system after install; `install` is called exactly once; `create` fires automatically on `addComponent`; `getComponent` returns the correct typed object; `uninstall` is called on teardown; `world.observers` is drained after teardown
- [x] No Lint/TypeScript errors

### Notes

- `GameWorld` is now defined as `World<GameWorldContext>` (a bitECS world augmented with our context). The old `GameWorld` interface became `GameWorldContext`; the exported `GameWorld` type alias is backward-compatible with all existing `World<GameWorld>` usages.
- `ComponentSystem<TData>` uses `protected declare _type: TData` as a phantom property to make the type parameter reachable by the linter without introducing any runtime field.
- `static getComponent` uses a typed `this: ComponentSystemClass<T>` parameter so TypeScript infers `T` from the calling subclass — no cast needed at call sites.
- `createWorld` imports `Events` from Phaser; tests that import it as a value must mock `phaser` via `vi.mock`.
- Container registered via `setupComponentData` is typed `T[]` (sparse array indexed by entity ID); `getComponent` returns `container[eid]`.

---

## Phase 2: Utility extraction

> ✅ Completed — A\*, `MinHeap`, `findPath`, and `requestPath` extracted to `src/game/utils/pathfinding.ts`. `isPassable` and `randomPassableTile` updated to accept `GridData` directly. `PathfindingSystem` is now a no-op `ComponentSystem<object>` marker class. All call sites in `GridRendererSystem`, `WanderingSystem`, and `UnitFactorySystem` updated. All existing A\* tests migrated to import from `utils/pathfinding`. New `utils/pathfinding.spec.ts` added (15 tests). 92/92 suite green; no lint or TypeScript errors.

**User stories**: 16, 17, 18, 19

### What to build

Extract the A\* algorithm, `MinHeap`, `findPath`, and `requestPath` from `PathfindingSystem.ts` into a new `utils/pathfinding.ts` module. All functions accept data objects directly — no ECS world or entity IDs at the algorithm level. Update `isPassable(gridData, col, row)` and `randomPassableTile(gridData)` in `GridSystem.ts` to accept a `GridData` object instead of `worldEid`. Update every call site across systems and tests. Refactor `PathfindingSystem` to extend `ComponentSystem<object>` with fully no-op hooks and no data registration. Update `PathfindingSystem.spec.ts` to import A\* utilities from `utils/pathfinding.ts`.

### Acceptance criteria

- [x] `utils/pathfinding.ts` exports `findPath` and `requestPath(gridData, movementData, positionData, eid, col, row)` as plain functions with no ECS imports
- [x] `isPassable(gridData, col, row)` and `randomPassableTile(gridData)` accept a `GridData` object; no `worldEid` parameter
- [x] All call sites in `GridRendererSystem`, `WanderingSystem`, `UnitFactorySystem`, and their specs updated to pass data objects
- [x] `PathfindingSystem` extends `ComponentSystem<object>`, registers no data store, all hooks are no-ops
- [x] `PathfindingSystem.spec.ts` imports `findPath` / `requestPath` from `utils/pathfinding.ts`
- [x] All existing A\* test cases pass without behavioural change
- [x] `utils/pathfinding` has its own unit tests asserting correct routes and correct path writes into movement data
- [x] No Lint/TypeScript errors

### Notes

- `requestPath` in `utils/pathfinding.ts` derives the grid's bounds (`rows`, `cols`) from `gridData.tiles.length` and `gridData.tiles[0].length` rather than the global `COLS`/`ROWS` constants from `GridSystem`, so it works correctly with any-sized grid in tests without the `GridSystem` import.
- `PathfindingSystem` exports `Pathfinding = PathfindingSystem` as a legacy alias so existing call sites (`addComponent(world, eid, Pathfinding)`) compile unchanged.
- `WanderingSystem` now imports `requestPath` from `../utils/pathfinding` and passes `Grid[worldEid]!`, `Movement`, and `Position` as data stores directly.
- `UnitFactorySystem` likewise imports `requestPath` from `../utils/pathfinding`.
- `PathfindingSystem.spec.ts` integration tests seed `Position` and `Movement` data arrays directly (no `addPositionComponent` / `addMovementComponent` with a fake world) since `requestPath` now operates on plain data stores.

---

## Phase 3: Grid systems migration

**User stories**: 20 (GridSystem, GridRendererSystem)

### What to build

Refactor `GridSystem` and `GridRendererSystem` to extend `ComponentSystem` with the correct `TData`. `GridSystem.install` registers the data store via `world.setupComponentData`; `GridSystem.create` populates the grid for the attached entity. `GridRendererSystem.create` draws the grid for the entity and `GridRendererSystem.destroy` cleans up the graphics object. The module-level `graphics` singleton and the separate `destroySystems` export are removed. All existing tests are updated to call hooks with the `(world, eid)` signature.

### Acceptance criteria

- [ ] `GridSystem` extends `ComponentSystem<GridData>` and calls `world.setupComponentData` in `install`
- [ ] `GridSystem.create(world, eid)` populates the grid component for `eid`; no `worldEid` parameter
- [ ] `GridRendererSystem` extends `ComponentSystem` with `create` drawing the grid and `destroy` cleaning up
- [ ] No module-level mutable singletons remain in either system
- [ ] `GridSystem.spec.ts` and `GridRendererSystem.spec.ts` updated to new hook signatures; all existing assertions pass
- [ ] No Lint/TypeScript errors

---

## Phase 4: Movement & pathfinding migration

**User stories**: 20 (PositionSystem, MovementSystem, PathfindingSystem)

### What to build

Refactor `PositionSystem` and `MovementSystem` to extend `ComponentSystem` with the appropriate `TData`. Each system registers its data store in `install` and handles per-entity initialisation in `create`. `MovementSystem.update` continues to emit `'movement:path-empty'` on `world.events`. `PathfindingSystem` is already a no-op marker from phase 2 — this phase confirms it is wired correctly as a `ComponentSystem`. All existing tests are updated to the new hook signatures.

### Acceptance criteria

- [ ] `PositionSystem` extends `ComponentSystem<PositionData>`, data store registered in `install`, `create` sets initial column/row/pixel coords
- [ ] `MovementSystem` extends `ComponentSystem<MovementData>`, data store registered in `install`, `create` sets initial speed and empty path
- [ ] `MovementSystem.update(world, eid, delta)` per-entity signature; `'movement:path-empty'` emitted on `world.events` as before
- [ ] `PathfindingSystem` is a registered `ComponentSystem<object>` with all no-op hooks
- [ ] `MovementSystem.spec.ts`, `PathfindingSystem.spec.ts` updated to new signatures; all existing assertions pass
- [ ] No Lint/TypeScript errors

---

## Phase 5: Unit systems migration

**User stories**: 20 (UnitFactorySystem, UnitRendererSystem, WanderingSystem), 22, 23, 24, 25

### What to build

Refactor the three remaining systems. `UnitRendererSystem.install` generates the shared `'unit'` texture once — `create` then unconditionally creates an `Image` for the entity without any guard flag. `WanderingSystem.install` registers the single `'movement:path-empty'` event listener; `uninstall` removes it. `UnitFactorySystem.create` attaches the `WanderingSystem` marker component to each unit entity it spawns, so all wandering units are automatically included in the `WanderingSystem` loops. All tests updated.

### Acceptance criteria

- [ ] `UnitRendererSystem.install(world)` generates the `'unit'` texture exactly once; `create(world, eid)` adds an `Image` unconditionally; no `initialized` flag exists
- [ ] `UnitRendererSystem.destroy(world, eid)` destroys the sprite for `eid`; no `destroySystems` export
- [ ] `WanderingSystem.install(world)` registers exactly one `'movement:path-empty'` listener
- [ ] `WanderingSystem.uninstall(world)` removes that listener
- [ ] `UnitFactorySystem.create(world, eid)` attaches `WanderingSystem` as a marker component to the spawned unit
- [ ] No module-level mutable singletons remain in any of the three systems
- [ ] `UnitRendererSystem.spec.ts`, `WanderingSystem.spec.ts`, `UnitFactorySystem.spec.ts` updated to new signatures; all existing assertions pass
- [ ] No Lint/TypeScript errors

---

## Phase 6: Scene wiring

**User stories**: 9, 10, 11, 12, 13, 14, 15, 21

### What to build

Update `GameScene.create()` to call `createWorld(this)` once and then `world.installSystem(new XSystem())` for each system in dependency order. Replace all manual `System.create` / `System.update` / `System.destroySystems` calls with world-driven Phaser scene event listeners: `update` iterates all systems and their matched entities; `sleep`, `wake`, `pause`, `resume` do the same for their respective hooks; `destroy` and `shutdown` run the teardown sequence (per-entity `destroy`, per-system `uninstall`, drain `world.observers`). The final observable behaviour — 200 units wandering the grid indefinitely — is identical.

### Acceptance criteria

- [ ] `GameScene.create()` calls `createWorld(this)` once and `world.installSystem(new XSystem())` for every system; no manual per-system create calls remain
- [ ] `GameScene.update` iterates `world.systems` only — no named system references
- [ ] Phaser `sleep`, `wake`, `pause`, `resume` events are wired to the corresponding world loop
- [ ] Both `destroy` and `shutdown` events run the full teardown sequence; all `world.observers` are drained
- [ ] No `worldEid` variable exists in `GameScene`
- [ ] Dev server renders 200 units wandering the grid identically to the pre-refactor behaviour
- [ ] No Lint/TypeScript errors
