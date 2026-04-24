## Problem Statement

The current ECS architecture uses a collection of plain exported functions (`GridSystem.create`, `MovementSystem.update`, `WanderingSystem.create`, etc.) with no shared contract between them. Adding a new system requires manually wiring its create call in `GameScene.create()`, its update call in `GameScene.update()`, and its teardown call in the shutdown hook. There is no compositional model: each system is invisible to the scene loop until the developer explicitly names it in three separate places. Cross-system coupling is handled ad-hoc (worldEid threading, module-level singletons, internal state flags), and there is no consistent lifecycle hook for system initialization driven by component attachment.

## Solution

Introduce a `ComponentSystem<TData>` abstract base class that gives every system a uniform contract: optional per-entity hooks (`create`, `update`, `sleep`, `wake`, `pause`, `resume`, `destroy`) and per-system lifecycle hooks (`install`, `uninstall`). The **class constructor itself** is the bitECS component token — `addComponent(world, eid, PositionSystem)` and `query(world, [PositionSystem])` use the class directly. System data does **not** live on the system object — systems that require storage call `world.setupComponentData(SystemClass, data)` during their `install` hook, which stores the data in `world.components` keyed by the constructor.

A `createWorld(scene)` factory helper creates and returns the `GameWorld` object, placing the scene, an event emitter, and the component data store into the world context. The returned world exposes two methods: `world.installSystem(system)` wires a system's full lifecycle into the world in one call, and `world.setupComponentData(SystemClass, data)` is the only way to register component data. `GameScene` calls `createWorld(this)` once during setup, then wires Phaser scene events (`update`, `sleep`, `wake`, `pause`, `resume`, `destroy`, `shutdown`) to the corresponding loops over `world.systems`.

`PathfindingSystem` is refactored to extend `ComponentSystem` with fully no-op hooks for now — it exists as a registered component so unit entities can be tagged with it and future per-entity pathfinding behavior can be added without structural changes. Its A\* utility functions move to a plain `utils/pathfinding.ts` module that accepts data objects directly. `WanderingSystem.install(world)` registers the single `'movement:path-empty'` listener; the `Wandering` marker is attached to each unit entity so the update/destroy loops cover all wandering units correctly. `isPassable` and `randomPassableTile` are updated to accept grid data directly, eliminating worldEid coupling.

## User Stories

1. As a developer, I want a `ComponentSystem<TData>` abstract class with no constructor parameters and no instance data property, so that all system classes share a uniform, TypeScript-enforced contract where `TData` describes the per-entity data shape without coupling the system object to any runtime storage.
2. As a developer, I want a `createWorld(scene)` helper that constructs and returns a `GameWorld` object containing the scene reference, an event emitter, an empty `components` map, an empty `systems` array, and the `installSystem` and `setupComponentData` methods, so that the entire game context is initialized in one call.
3. As a developer, I want `world.setupComponentData(SystemClass, data)` to insert the given data object into `world.components` keyed by the system constructor, so that systems can register their data store during `install` and any other system can retrieve it via `world.components.get(SystemClass)`.
4. As a developer, I want `ComponentSystem<TData>` to expose a `static getComponent(world, eid): TData` method that retrieves the typed per-entity data object for `eid` from `world.components`, so that any system or utility can access another system's entity data in a fully type-safe way without a manual cast at the call site.
5. As a developer, I want `install(world)`, `uninstall(world)`, `create(world, eid)`, `update(world, eid, delta)`, `sleep(world, eid)`, `wake(world, eid)`, `pause(world, eid)`, `resume(world, eid)`, and `destroy(world, eid)` to be default no-ops on the base class, so that systems only override the hooks they actually need.
6. As a developer, I want `world.installSystem(system)` to push the system into `world.systems`, store the unsubscribe function returned by the bitECS `observe` hook in `world.observers`, and call `system.install(world)` once for any one-time world-level wiring, so that a single call wires the system's full lifecycle into the world.
7. As a developer, I want the `observe` hook registered by `world.installSystem` to fire `system.create(world, eid)` automatically whenever `addComponent(world, eid, SystemClass)` is called for that system's class, so that per-entity initialization does not require manual calls from the scene.
8. As a developer, I want `world.scene`, `world.events`, `world.systems`, `world.observers`, `world.components`, `world.installSystem`, and `world.setupComponentData` to form the complete `GameWorld` typed interface, so that all scene wiring, event communication, system registration, observer cleanup, and data access flow through one well-typed object.
9. As a developer, I want every system's `update` hook called for each of its matched entities on every frame, so that the scene loop has no per-system update call sites.
10. As a developer, I want to be able to omit `update()` from a system without breaking the update loop, so that systems with no per-frame work are harmlessly iterated without any special casing.
11. As a developer, I want every system's `sleep` hook called for each of its matched entities when the scene goes to sleep, so that all systems are notified without manual per-system wiring in the scene.
12. As a developer, I want every system's `wake` hook called for each of its matched entities when the scene wakes, so that all systems are notified without manual per-system wiring in the scene.
13. As a developer, I want every system's `pause` hook called for each of its matched entities when the scene is paused, so that all systems are notified without manual per-system wiring in the scene.
14. As a developer, I want every system's `resume` hook called for each of its matched entities when the scene resumes, so that all systems are notified without manual per-system wiring in the scene.
15. As a developer, I want every system's `destroy` hook called per entity and `uninstall` called once per system when the scene is destroyed or shut down, and all `observe` unsubscribe functions drained afterwards, so that all ECS observers and system resources are cleaned up without manual teardown in the scene.
16. As a developer, I want `isPassable(gridData, col, row)` and `randomPassableTile(gridData)` to accept a `GridData` object directly instead of `worldEid`, so that callers are not coupled to a world entity ID and any code with a data reference can call them.
17. As a developer, I want the A* algorithm, `MinHeap`, and `findPath()` extracted to a plain `utils/pathfinding.ts` module, so that the algorithm is a pure utility with no ECS coupling and is independently testable.
18. As a developer, I want `requestPath(gridData, movementData, positionData, eid, col, row)` in `utils/pathfinding.ts` to accept data objects directly, so that callers do not need to look up data through the world or a worldEid.
19. As a developer, I want `PathfindingSystem` refactored to extend `ComponentSystem<object>` with fully no-op hooks and no data registration, so that unit entities can be tagged with it as a marker component and future per-entity pathfinding behavior can be added without structural changes.
20. As a developer, I want all existing systems (`GridSystem`, `GridRendererSystem`, `PositionSystem`, `MovementSystem`, `UnitRendererSystem`, `WanderingSystem`, `UnitFactorySystem`, `PathfindingSystem`) refactored to extend `ComponentSystem<TData>` with the appropriate `TData` for each, so that they all participate in the uniform registration and update-loop model.
21. As a developer, I want `GameScene.create()` to call `const world = createWorld(this)` once and then `world.installSystem(new GridSystem())` for each system, so that system instances are created and wired in one place without requiring module-level singleton exports.
22. As a developer, I want `WanderingSystem.install(world)` to register the single `'movement:path-empty'` event listener, so that the listener is wired once at registration time and not duplicated per entity.
23. As a developer, I want `UnitFactorySystem.create(world, eid)` to attach the `WanderingSystem` marker component to each unit entity it creates, so that all wandering units are automatically included in the `WanderingSystem` update and destroy loops without manual tagging at the call site.
24. As a developer, I want `WanderingSystem.uninstall(world)` to remove the `'movement:path-empty'` event listener registered during `install`, so that no dangling listeners remain after the scene is destroyed.
25. As a developer, I want `UnitRendererSystem.install(world)` to generate the shared `'unit'` texture once at registration time, so that `create(world, eid)` only needs to create the `Image` for the entity with no guard logic.

## Implementation Decisions

### `ComponentSystem<TData>` abstract class

No constructor parameters, no instance `data` property. The **class constructor itself** is the bitECS component token — `addComponent(world, eid, PositionSystem)` registers the entity under `PositionSystem`, and `query(world, [PositionSystem])` returns all entities with that system. Subclasses only override the hooks they need. Default no-op implementations are provided for all lifecycle hooks: `install(world)`, `uninstall(world)`, `create(world, eid)`, `update(world, eid, delta)`, `sleep(world, eid)`, `wake(world, eid)`, `pause(world, eid)`, `resume(world, eid)`, and `destroy(world, eid)`. Systems that need per-entity data storage call `world.setupComponentData(SystemClass, data)` inside their `install` hook.

The class also provides a `static getComponent(world: GameWorld, eid: number): TData` method. It looks up `world.components.get(SystemClass)` and returns the data object for the given `eid`. The return type is inferred from the subclass's `TData` parameter, so callers get full type safety without a manual cast: `PositionSystem.getComponent(world, eid).x`.

### `createWorld(scene)` helper

A factory function that accepts a `Phaser.Scene` and returns a fully typed `GameWorld` object. The returned object contains:

- `scene` — the Phaser scene, available to all systems via `world.scene`
- `events` — a `Phaser.Events.EventEmitter` for cross-system event communication (e.g. `'movement:path-empty'`)
- `components: Map<typeof ComponentSystem, unknown>` — stores component data keyed by system constructor; populated exclusively via `setupComponentData`
- `observers: (() => void)[]` — unsubscribe functions returned by `observe()`; populated exclusively via `installSystem`; drained during teardown
- `systems: ComponentSystem[]` — ordered list of installed systems; populated exclusively via `installSystem`
- `installSystem(system)` — see below

`GameScene.create()` calls `createWorld(this)` once, then calls `world.installSystem(new GridSystem())` for each system in dependency order.

### `world.installSystem(system)`

Does three things in order:

1. Pushes `system` onto `world.systems`.
2. Calls `observe(world, onAdd(system.constructor), (eid) => system.create(world, eid))` and stores the returned unsubscribe function in `world.observers`.
3. Calls `system.install(world)` for any one-time world-level wiring the system needs (e.g. calling `world.setupComponentData`, registering event listeners, generating textures).

### `world.setupComponentData(SystemClass, data)`

Inserts `data` into `world.components` keyed by `SystemClass`. Called by systems inside their `install` hook when they need to register a data store. Calling it more than once for the same key overwrites the previous entry — no guard is needed because `install` is called exactly once per system.

### `GameWorld` interface

The complete `GameWorld` type is the return type of `createWorld(scene)`. All fields are initialized by the factory — `GameScene.create()` does not need to manually initialize any of them before calling `world.installSystem`. `world.observers` is an implementation detail of `installSystem`; external code does not push to it directly.

### Scene event wiring

`GameScene` wires the following Phaser scene events in its `create` method (or an equivalent setup method) and removes them on scene destruction:

- `update` → for each system, for each matched eid: `system.update(world, eid, delta)`
- `sleep` → for each system, for each matched eid: `system.sleep(world, eid)`
- `wake` → for each system, for each matched eid: `system.wake(world, eid)`
- `pause` → for each system, for each matched eid: `system.pause(world, eid)`
- `resume` → for each system, for each matched eid: `system.resume(world, eid)`
- `destroy` and `shutdown` → for each system: for each matched eid call `system.destroy(world, eid)`, then call `system.uninstall(world)` once; then drain `world.observers` by calling each unsubscribe function

Both `destroy` and `shutdown` run the same teardown sequence. The handler is registered for both events.

### System instantiation

Systems are instantiated inline at the `world.installSystem` call site: `world.installSystem(new GridSystem())`. No module-level singleton exports. Cross-system data access at runtime uses `world.components.get(GridSystem)` — the class constructor is always available as a static import, and callers must cast the result to the known data type.

### Pathfinding utility

The A\* algorithm, `MinHeap`, `findPath()`, and `requestPath(gridData, movementData, positionData, eid, col, row)` move to `utils/pathfinding.ts` as plain module-level exports accepting data objects directly. `PathfindingSystem.ts` remains but is refactored to extend `ComponentSystem` with fully no-op hooks and no data registration — it is a marker-only component. `PathfindingSystem.spec.ts` is updated in place — it imports `findPath`/`requestPath` from `utils/pathfinding.ts` instead of from the system file.

### `isPassable` / `randomPassableTile` signature change

Both accept a `GridData` object directly. Callers that previously used `worldEid` now pass the singleton's `data[worldEid]` (or whatever grid data reference they hold).

### `WanderingSystem` component scope

`WanderingSystem.install(world)` is called once by `registerSystem` and registers a single `'movement:path-empty'` event listener. `WanderingSystem.uninstall(world)` removes that listener. `create` and `destroy` are no-ops. The `Wandering` marker component is attached to each unit entity by `UnitFactorySystem`, so `query(world, [WanderingSystem])` returns all 200 wandering units and the shutdown loop covers them. No listener duplication risk — the listener is registered in `install`, not `create`.

### `UnitRendererSystem.install` texture generation

`install(world)` generates the shared `'unit'` texture once using a temporary `Graphics` object. `create(world, eid)` then unconditionally creates an `Image` for the entity — no guard flag needed.

### Cross-system data access

The loop always queries `[system.constructor]`. For reading another system's data store at runtime (e.g. grid data inside `WanderingSystem.create`), use `world.components.get(GridSystem) as GridData`. The data was placed there by `GridSystem.install` via `world.setupComponentData`.

## Testing Decisions

### What makes a good test

Test the observable output of a system hook given controlled inputs. Call `createWorld(mockScene)` to get a real world, call `world.installSystem(new MySystem())`, attach bitECS components, call hooks, and assert on component values, emitted events, or spy call counts. Never assert on private instance state. Reset world instances in `beforeEach`.

### Modules to test

- **`ComponentSystem<TData>` / `createWorld`** — assert that after `world.installSystem`: `world.systems` contains the system; calling `world.setupComponentData` inside `install` populates `world.components`; attaching the component to an entity triggers `create`; `install` is called exactly once; `uninstall` is called on teardown; `static getComponent` returns the correct typed data object for a given eid.
- **`GridSystem`** — update `isPassable(gridData, col, row)` and `randomPassableTile(gridData)` call sites; all existing assertions pass unchanged.
- **`GridRendererSystem`** — use `create(world, eid)` and `destroy(world, eid)` signatures; all existing `fillRect` and `gfx.destroy()` assertions pass.
- **`MovementSystem`** — no signature change; existing tests unchanged.
- **`UnitRendererSystem`** — assert `install(world)` generates the shared `'unit'` texture exactly once; assert `create(world, eid)` adds an `Image` at the correct pixel coordinates; `destroy(world, eid)` calls `sprite.destroy()`.
- **`WanderingSystem`** — assert `install(world)` registers exactly one `'movement:path-empty'` listener; assert `uninstall(world)` removes it; mock `requestPath` from `utils/pathfinding` instead of `PathfindingSystem`.
- **`PathfindingSystem`** — refactored to extend `ComponentSystem<object>`; no data registration; no-op hooks; `PathfindingSystem.spec.ts` updated to import A* utilities from `utils/pathfinding.ts`.
- **`utils/pathfinding`** — new module; test that `findPath` returns expected routes and `requestPath` writes the correct path into movement data.
- **Spec file updates** — all existing spec files must be updated to call hooks with the new `ComponentSystem` signatures (`create(world, eid)`, `update(world, eid, delta)`, `destroy(world, eid)`); `PathfindingSystem.spec.ts` must import A* utilities from `utils/pathfinding.ts`; no behavioral regressions are acceptable.

## Out of Scope

- Adding any new system or behavior — this phase is purely structural.
- Controller ownership, idle timers, unit claiming, or any multiplayer feature.
- Input handling, camera follow, split-screen.
- Migrating `Boot`, `Preloader`, `MainMenu`, or `GameOver` scenes.
- Changing `PhaserGame.vue`, `EventBus.ts`, or any Vue component.
- Async or worker-based pathfinding.

## Further Notes

- The `observe` unsubscribe functions are stored in `world.observers` and called during the `destroy`/`shutdown` teardown sequence, after all `system.destroy` and `system.uninstall` calls. This prevents stale callbacks from firing on a dead world if bitECS were to be reused across scenes.
- The class constructor is both the bitECS component token (for `addComponent`, `query`, `observe`) and the `world.components` Map key (for data registered via `world.setupComponentData`). The preferred access pattern is `GridSystem.getComponent(world, eid)`, which returns the data typed as `TData` without a manual cast. Direct `world.components.get(GridSystem)` access is reserved for bulk retrieval of the entire data store.
- Systems are instantiated inline at `world.installSystem` call sites. No module-level singletons. Tests call `createWorld(mockScene)` and instantiate systems directly in `beforeEach`.
- `install` and `uninstall` are world-level hooks (called once per registration/teardown). All other hooks (`create`, `update`, `sleep`, `wake`, `pause`, `resume`, `destroy`) are per-entity hooks (called once per matched entity per event).
- `world.events` is the appropriate emitter for cross-system game events (e.g. `'movement:path-empty'`). It is not `scene.sys.events` — it is a dedicated emitter owned by the world, so systems do not couple to Phaser's internal scene event bus for game-domain events.
- The existing behavior — 200 units wandering the grid indefinitely — must be identical after this refactor. Observable behavior is not in scope for change.
