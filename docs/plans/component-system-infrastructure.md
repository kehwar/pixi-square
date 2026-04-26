# Plan: Component System Infrastructure

> Source PRD: docs/prd/component-system-infrastructure.md

## Architectural decisions

- **`ComponentSystem<TComponent, TStorage>` token model**: the class constructor is both the bitECS component token (`addComponent`, `query`, `observe`) and the `world.components` Map key. No constructor parameters, no instance data property. `TComponent` is the per-entity value returned by `getComponent`; `TStorage` is the raw container stored in `world.components` (defaults to `TComponent[]` for AoS). SoA subclasses declare an explicit `TStorage` shape and override `getComponent` to pluck fields manually.
- **`GameWorld` interface**: `scene`, `events`, `components`, `observers`, `systems`, `installSystem`, `setupComponentStorage`. The complete contract — no fields are added outside `createWorld`.
- **`world.events`**: a dedicated `Phaser.Events.EventEmitter` owned by the world. Cross-system game events (e.g. `'movement:path-empty'`) go here, never on Phaser's internal scene bus.
- **Per-entity hook signatures**: all hooks receive `(world: GameWorld, eid: number)` — no `worldEid` parameter. Per-system hooks receive `(world: GameWorld)` only.
- **`installSystem` contract**: pushes system onto `world.systems`, stores **two** `observe` unsubscribes in `world.observers` (one `onAdd` → `create`, one `onRemove` → `destroy`), calls `system.install(world)` once. One call wires the full lifecycle.
- **System instantiation**: inline at call sites (`world.installSystem(new GridSystem())`). No module-level singletons.
- **`utils/pathfinding.ts`**: pure module — A\*, `MinHeap`, `findPath`, `requestPath` — accepting data objects directly. Zero ECS coupling.
- **`isPassable` / `randomPassableTile`**: accept a `GridData` object directly. No `worldEid` coupling.
- **Teardown order**: `destroy` and `shutdown` both run the same sequence — per-entity `destroy` for each system, then per-system `uninstall`, then drain `world.observers`.

---

## Phase 1: Foundation

> ✅ Completed — `ComponentSystem<TComponent, TStorage>` abstract class and `createWorld(scene)` factory introduced in `src/game/systems/ComponentSystem.ts` and `src/game/systems/types.ts`. Lifecycle hooks default to no-ops; `destroy` defaults to calling `clearComponent`. `installSystem` wires `observe`/`onAdd`+`onRemove` and calls `system.install`. `setupComponentStorage` + instance methods `getComponentStorage`, `getComponent`, `setComponent`, `clearComponent` provide typed per-entity data access for both AoS and SoA patterns. 11 new tests; 77/77 suite green; no lint or TypeScript errors. No existing files modified.

**User stories**: 1, 2, 3, 4, 5, 6, 7, 8

### What to build

Introduce the `ComponentSystem<TData>` abstract base class and the `createWorld(scene)` factory. The base class exposes all lifecycle hooks as default no-ops and instance methods `getComponent`, `setComponent`, `clearComponent`. `createWorld` returns a fully typed `GameWorld` with `installSystem` and `setupComponentStorage` wired. `installSystem` registers `observe` callbacks for both `onAdd` (fires `create`) and `onRemove` (fires `destroy`). No existing code is modified in this phase.

### Acceptance criteria

- [x] `ComponentSystem<TComponent, TStorage>` abstract class exists with no-op defaults for: `install`, `uninstall`, `create`, `update`, `sleep`, `wake`, `pause`, `resume`; `destroy` defaults to calling `clearComponent`
- [x] `getComponentStorage(world): TStorage` instance method — returns the raw container registered for this system
- [x] `getComponent(world, eid): TComponent` instance method — returns the typed per-entity data object without a manual cast at the call site; defaults to AoS (`storage[eid]`); overridable for SoA
- [x] `setComponent(world, eid, value)` instance method — writes the per-entity value into AoS storage; should be called in `create`
- [x] `clearComponent(world, eid)` instance method — deletes the per-entity slot from AoS storage; called by the default `destroy`; no-ops when no storage is registered
- [x] `createWorld(scene)` returns a `GameWorld` with `scene`, `events`, `components`, `observers`, `systems`, `installSystem`, `setupComponentStorage` all initialised
- [x] `world.installSystem(system)` pushes to `world.systems`, stores the unsubscribe in `world.observers`, and calls `system.install(world)` once
- [x] Attaching a component via `addComponent(world, eid, SystemClass)` automatically fires `system.create(world, eid)` for that system
- [x] `world.setupComponentStorage(SystemClass, data)` stores `data` in `world.components` keyed by the constructor
- [x] Tests assert: `world.systems` contains the system after install; `install` is called exactly once; `create` fires automatically on `addComponent`; `getComponent` returns the correct typed object; `uninstall` is called on teardown; `world.observers` is drained after teardown; `world.observers` has length 2 per installed system (one onAdd + one onRemove)
- [x] No Lint/TypeScript errors

### Notes

- `GameWorld` is now defined as `World<GameWorldContext>` (a bitECS world augmented with our context). The old `GameWorld` interface became `GameWorldContext`; the exported `GameWorld` type alias is backward-compatible with all existing `World<GameWorld>` usages.
- `ComponentSystem<TComponent, TStorage>` uses phantom `protected declare` properties (`_component`, `_storage`) to anchor both type params for the linter without introducing runtime fields. `TStorage` defaults to `TComponent[]` so AoS subclasses only need one type arg.
- All data-access methods are **instance methods** (`getComponentStorage`, `getComponent`, `setComponent`, `clearComponent`), not statics. Call sites use `this.getComponent(world, eid)` inside hook overrides, or hold a reference to the system instance.
- `getComponent` defaults to AoS (`(storage as TComponent[])[eid]`). SoA subclasses override all four helpers to operate on their struct storage.
- `destroy` has a default implementation that calls `this.clearComponent(world, eid)`. `clearComponent` guards against unregistered storage (no-ops when `world.components.get(Ctor)` is `undefined`).
- `world.components` is typed `Map<ComponentSystemClass<any, any>, unknown>` so both AoS and SoA keys are accepted without a `TStorage extends any[]` constraint.
- `world.installSystem` pushes **two** observers per system: one for `onAdd` (fires `create`) and one for `onRemove` (fires `destroy`). So `world.observers.length === world.systems.length * 2` after wiring.
- `createWorld` imports `Events` from Phaser; tests that import it as a value must mock `phaser` via `vi.mock`.
- Container registered via `setupComponentStorage` accepts `TStorage` directly — callers pass `T[]` for AoS or a SoA struct for SoA.

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

> ✅ Completed — `GridSystem` and `GridRendererSystem` converted to `ComponentSystem` subclasses. `GridSystem.install` registers `Grid[]` via `world.setupComponentStorage`; `GridSystem.create` populates `Grid[eid]` using `this.setComponent`. `GridRendererSystem` stores per-entity graphics in a module-level `GridRendererStore[]`; `create` draws the grid and `destroy` cleans up the `Graphics` object then calls `super.destroy`. Module-level `graphics` singleton and `destroySystems` free function removed. `GameScene` updated to use `createWorld` from `types.ts` and `installSystem` for both systems. `WanderingSystem.spec.ts` and `UnitFactorySystem.spec.ts` `makeWorld` helpers updated to use the new class API. 92/92 tests pass; no lint or TypeScript errors.ts pass; no lint or TypeScript errors.

**User stories**: 20 (GridSystem, GridRendererSystem)

### What to build

Refactor `GridSystem` and `GridRendererSystem` to extend `ComponentSystem` with the correct `TData`. `GridSystem.install` registers the data store via `world.setupComponentStorage`; `GridSystem.create` populates the grid for the attached entity using `this.setComponent`. `GridRendererSystem.create` draws the grid for the entity and `GridRendererSystem.destroy` cleans up the graphics object then calls `super.destroy`. The module-level `graphics` singleton and the separate `destroySystems` export are removed. All existing tests are updated to call hooks with the `(world, eid)` signature.

### Acceptance criteria

- [x] `GridSystem` extends `ComponentSystem<GridData>` and calls `world.setupComponentStorage` in `install`
- [x] `GridSystem.create(world, eid)` populates the grid component for `eid`; no `worldEid` parameter
- [x] `GridRendererSystem` extends `ComponentSystem` with `create` drawing the grid and `destroy` cleaning up
- [x] No module-level mutable singletons remain in either system
- [x] `GridSystem.spec.ts` and `GridRendererSystem.spec.ts` updated to new hook signatures; all existing assertions pass
- [x] No Lint/TypeScript errors

### Notes

- `GridRendererData` interface added to `GridRendererSystem.ts` with a single `graphics` field; module-level `GridRendererStore: GridRendererData[]` array is the data store (same pattern as `Grid: GridData[]` in GridSystem).
- `GameScene` now uses `createWorld` from `types.ts` (our factory) instead of bitECS's `createWorld`. The two grid systems are wired via `world.installSystem(new GridSystem())` / `installSystem(new GridRendererSystem())` and entities attached with `addComponent`. Shutdown teardown calls `GridRendererSystem.getComponent(world, eid).graphics.destroy()` directly.
- `WanderingSystem.spec.ts` and `UnitFactorySystem.spec.ts` `makeWorldWithGrid` / `makeWorld` helpers were also updated since they previously called the removed `create` free function. Their Phaser mocks now include a functional `EventEmitter` (with `on`/`emit`) so `world.events` works in those tests.
- A pre-existing unused variable `gridData5x5` in `PathfindingSystem.spec.ts` was renamed to `_gridData5x5` to satisfy the lint rule.

---

## Phase 4: Movement & pathfinding migration

> ✅ Completed — `PositionSystem` and `MovementSystem` converted to `ComponentSystem` SoA subclasses. Both use `this.getComponentStorage(world)` internally — no direct module-level SoA references inside class methods. `MovementSystem.update` accesses Position storage via `world.components.get(PositionSystem)`. `GameWorld` gained `world.getComponent(SystemClass, eid)` and `world.getComponentStorage(SystemClass)` — O(1) typed lookups. `world.systems` is now `Map<ComponentSystemClass, ComponentSystem<any,any>>`. `GridRendererSystem` updated to use `world.getComponent(GridSystem, eid)`. `ComponentSystemClass` default `TStorage` widened to `any`. `GameScene` installs `PositionSystem`, `MovementSystem`, `PathfindingSystem`; update loop queries `[MovementSystem]` per-entity. `MovementSystem.spec.ts` updated. 90/92 tests pass (2 `UnitFactorySystem` failures deferred to Phase 5). No TypeScript or lint errors.

**User stories**: 20 (PositionSystem, MovementSystem, PathfindingSystem)

### What to build

Refactor `PositionSystem` and `MovementSystem` to extend `ComponentSystem` using the **SoA two-type-param form**: `ComponentSystem<PositionData, typeof Position>` and `ComponentSystem<MovementData, typeof Movement>`. Each system registers its existing SoA object (`Position` / `Movement`) as the storage in `install` via `world.setupComponentStorage`. Each system overrides `getComponent` (instance method) to pluck the per-entity fields from the SoA arrays. `PositionSystem.create(world, eid)` initialises all array slots to zero/default values; `addPositionComponent(world, eid, col, row)` is kept as a call-site helper that calls `addComponent` then immediately overwrites those defaults with the real coords. `MovementSystem.create(world, eid)` initialises speed to `DEFAULT_SPEED` and path to `[]`; `addMovementComponent` is kept similarly. `MovementSystem.update(world, eid, delta)` becomes a per-entity hook that operates on one entity's movement tick and emits `'movement:path-empty'` on `world.events` when the path drains; the internal `query([Position, Movement])` loop is removed. `PathfindingSystem` is already a no-op marker from phase 2 — this phase installs it via `world.installSystem` in `GameScene` (the spec needs no further changes). All tests are updated to the new hook signatures.

### Acceptance criteria

- [x] `PositionSystem` extends `ComponentSystem<PositionData, typeof Position>`; registers the module-level `Position` SoA object in `install`; `create` zero-initialises all four slots (`col`, `row`, `pixelX`, `pixelY`) for `eid`; `getComponent` (instance) overrides to return `{ col, row, pixelX, pixelY }` plucked from the arrays
- [x] `addPositionComponent(world, eid, col, row)` calls `addComponent(world, eid, PositionSystem)` then sets the four array slots to the provided coords, overriding the zero-defaults from `create`
- [x] `MovementSystem` extends `ComponentSystem<MovementData, typeof Movement>`; registers the `Movement` SoA object in `install`; `create` sets `speed = DEFAULT_SPEED` and `path = []`; `getComponent` (instance) overrides to return `{ speed, path }` plucked from arrays
- [x] `addMovementComponent(world, eid, speed?)` calls `addComponent(world, eid, MovementSystem)` then sets `speed` (defaulting to `DEFAULT_SPEED`); the zero-default from `create` is overwritten
- [x] `MovementSystem.update(world, eid, delta)` per-entity signature; no internal `query` call; accesses `Position` SoA arrays directly; `'movement:path-empty'` emitted on `world.events` as before
- [x] `PathfindingSystem` is a no-op `ComponentSystem<object>` (already done in phase 2) — no further changes needed to the class itself
- [x] `MovementSystem.spec.ts` updated to new hook signatures; all existing movement and path-empty assertions pass
- [x] No Lint/TypeScript errors

### Notes

- `PositionData` interface added to `PositionSystem.ts` with four fields: `col`, `row`, `pixelX`, `pixelY`. `Position` SoA object remains the module-level data store; `PositionSystem` class is the bitECS component token.
- `MovementData` interface added to `MovementSystem.ts` with `speed` and `path`. The old `TileCoord` import from `GridSystem` was replaced by an inline `{ col: number, row: number }` type in `MovementData` and the `Movement` SoA object.
- Old free-function `update(world, delta)` export removed from `MovementSystem.ts`; `MovementSystem.update(world, eid, delta)` is now an instance override.
- `PositionSystem.create` and `getComponent` use `this.getComponentStorage(world)` — no direct `Position` singleton reference inside the class. `MovementSystem.create`, `getComponent`, and `update` likewise use `this.getComponentStorage(world)` for movement data; `update` accesses position storage via `world.components.get(PositionSystem)` rather than importing `Position` directly.
- `GameWorld` (via `GameWorldContext`) gained two new methods during this phase: `world.getComponent(SystemClass, eid)` — typed O(1) lookup via `world.systems.get(SystemClass)`; and `world.getComponentStorage(SystemClass)` — typed O(1) lookup into `world.components`. Both infer their return types from the system class's type parameters.
- `world.systems` changed from `Array` → `Set` → `Map<ComponentSystemClass, ComponentSystem<any,any>>`, settling on `Map` for O(1) keyed access. `installSystem` now keys with `system.constructor`.
- `GridRendererSystem.create` uses `world.getComponent(GridSystem, eid)` instead of `Grid[eid]` directly.
- `ComponentSystemClass` default for `TStorage` changed from `TComponent[]` to `any` so SoA subclasses with non-array storage are accepted wherever bare `ComponentSystem` or `ComponentSystemClass` is used.
- `GameScene` stores `movementSystem` as a private field and queries `[MovementSystem]` in `update` to iterate per-entity. `PositionSystem` and `PathfindingSystem` are also wired via `world.installSystem` with no stored reference needed.
- `MovementSystem.spec.ts` `makeWorld` pre-registers both SoA stores in the `components` map and sets `systems: new Map()` / includes `getComponentStorage` stub so `getComponentStorage(world)` resolves without a full `installSystem` call.
- 2 `UnitFactorySystem.spec.ts` tests fail because they query `query(world, [Position, Movement])` using old SoA objects as tokens instead of `[PositionSystem, MovementSystem]`. These will be fixed in Phase 5.

---

## Phase 5: Unit systems migration

**User stories**: 20 (UnitFactorySystem, UnitRendererSystem, WanderingSystem), 22, 23, 24, 25

### What to build

Refactor the three remaining systems. `UnitRendererSystem extends ComponentSystem<UnitSpriteData>` (AoS); `install(world)` generates the shared `'unit'` texture once; `create(world, eid)` creates the `Image` immediately (no guard flag); `update(world, eid, delta)` repositions the sprite per entity using `Position` SoA arrays directly; `destroy(world, eid)` destroys the sprite and cleans up the store entry.

`WanderingSystem` becomes a **marker** `ComponentSystem<object>` with no data storage; `install(world)` registers a single `'movement:path-empty'` listener — the listener queries for the Grid entity internally (`query(world, [GridSystem])`) so it has no `worldEid` closure; `create(world, eid)` requests the initial path for the unit (replacing the manual `requestPath` call in `UnitFactorySystem`); `uninstall(world)` removes the listener. The `create` free function and `Wandering` plain-object export are removed.

`UnitFactorySystem` becomes a `ComponentSystem<object>` marker; `create(world, eid)` fires when the world entity gets `UnitFactorySystem` attached and spawns all unit entities, attaching `PositionSystem`, `MovementSystem`, `PathfindingSystem`, and `WanderingSystem` to each. `addComponent(world, unitEid, WanderingSystem)` triggers `WanderingSystem.create(world, unitEid)` automatically, so no separate `requestPath` call is needed in the factory. The `create` free function export is removed. All tests updated.

### Acceptance criteria

- [ ] `UnitRendererSystem.install(world)` generates the `'unit'` texture exactly once; `create(world, eid)` adds an `Image` unconditionally with no `initialized` flag; `update(world, eid, delta)` repositions the sprite from `Position` SoA arrays; `destroy(world, eid)` destroys the sprite for `eid`
- [ ] No module-level `initialized` flag or `unitEids` array in `UnitRendererSystem`; no `destroySystems` export
- [ ] `WanderingSystem extends ComponentSystem<object>` with no `setupComponentStorage` call; `install(world)` registers exactly one `'movement:path-empty'` listener that resolves gridData via `query(world, [GridSystem])` — no `worldEid` parameter or closure
- [ ] `WanderingSystem.create(world, eid)` requests the initial path for `eid` (calls `requestPath` using grid, Movement, Position data)
- [ ] `WanderingSystem.uninstall(world)` removes the `'movement:path-empty'` listener registered during `install`
- [ ] `UnitFactorySystem extends ComponentSystem<object>`; `create(world, eid)` spawns all unit entities, attaches `PositionSystem`, `MovementSystem`, `PathfindingSystem`, and `WanderingSystem` to each; no manual `requestPath` call (delegated to `WanderingSystem.create`)
- [ ] No module-level mutable singletons in any of the three systems
- [ ] `UnitRendererSystem.spec.ts`, `WanderingSystem.spec.ts`, `UnitFactorySystem.spec.ts` updated to new signatures; all existing assertions pass
- [ ] No Lint/TypeScript errors

---

## Phase 6: Scene wiring

**User stories**: 9, 10, 11, 12, 13, 14, 15, 21

### What to build

Update `GameScene.create()` to call `createWorld(this)` once and then `world.installSystem(new XSystem())` for each system in dependency order. The world entity (grid entity) is created via `addEntity` and stored as a **local `const gridEid`** (not as `this.worldEid`) — components are added to it to trigger `GridSystem.create`, `GridRendererSystem.create`, and `UnitFactorySystem.create`. Replace all manual `System.update` / `System.destroySystems` calls with world-driven Phaser scene event listeners: `update` iterates `world.systems`, queries each system's matched entities, and calls `system.update(world, eid, delta)` per entity; `sleep`, `wake`, `pause`, `resume` do the same for their respective hooks; `destroy` and `shutdown` run the teardown sequence (per-entity `destroy` for each system, per-system `uninstall`, drain `world.observers`). The final observable behaviour — 200 units wandering the grid indefinitely — is identical.

### Acceptance criteria

- [ ] `GameScene.create()` calls `createWorld(this)` once and `world.installSystem(new XSystem())` for every system; no manual per-system create calls remain
- [ ] The grid entity is created as a local `const gridEid` inside `create()`; no `this.worldEid` member field exists on the class
- [ ] `GameScene.update` iterates `world.systems` only — no named system references
- [ ] Phaser `sleep`, `wake`, `pause`, `resume` events are wired to the corresponding world loop
- [ ] Both `destroy` and `shutdown` events run the full teardown sequence; all `world.observers` are drained
- [ ] Dev server renders 200 units wandering the grid identically to the pre-refactor behaviour
- [ ] No Lint/TypeScript errors
