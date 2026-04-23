---
date: 2026-04-23
---

# Phaser Migration Complete (Phases 1–3)

## Problem Statement

The project used PixiJS v8 as its rendering engine. PixiJS is a low-level renderer with no built-in camera system, input management, or scene lifecycle. Features on the roadmap — per-player split-screen viewports, camera zoom, tile-level click input — would each require non-trivial custom infrastructure on top of PixiJS. Rather than build those systems by hand, the project migrated to Phaser 4, which provides cameras, keyboard/pointer input, and a scene lifecycle first-class. The migration also took the opportunity to remodel the simulation's unit data model, removing the fragile pre-assigned `playerUnitId` in favour of a `controller` ownership field.

## Solution

Replaced PixiJS with Phaser 4 across three committed phases:

1. **Bootstrap** — package swap, Vue↔Phaser wiring via a `PhaserGame.vue` component and `StartGame` factory, scene stubs, AGENTS.md boundary rule updated.
2. **Scene Lifecycle & EventBus** — full 5-scene chain (Boot → Preloader → MainMenu → Game → GameOver), `EventBus` singleton bridging Phaser and Vue, Play button in `MainMenuView`, Vue router responding to Phaser navigate events.
3. **Simulation Remodel + Wanderer Rendering** — `Unit` type discriminant removed, `controller`/`idleMs` added, `World` API rebuilt, 200 unclaimed wanderers created by `WorldFactory`, Game scene draws static grid in `create()` and redraws all wanderers each `update()`.

All 70 unit tests pass. Phase 4 (P1 input, camera follow) is deferred to a new PRD.

## Implementation Decisions

### PixiJS archive
The entire PixiJS implementation was snapshotted to `references/pixi-vue-demo/` before any destructive changes. `node_modules` excluded; run `npm install` inside to restore. This preserves the working reference without bloating git history with lock files.

### `StartGame` factory and `PhaserGame.vue` boundary
`src/game/main.ts` exports `StartGame(parent: string): Phaser.Game`. `PhaserGame.vue` calls it on `onMounted` and holds the result in a plain (non-reactive) variable. The Phaser game instance is intentionally **never** placed inside `ref()` or `reactive()` — Phaser mutates its own internals heavily and Vue's reactivity proxy would corrupt it. `PhaserGame.vue` does not import from `'phaser'` directly; it uses `ReturnType<typeof StartGame>` for the type, staying on the safe side of the boundary rule.

### EventBus: `Phaser.Events.EventEmitter` singleton
`src/game/EventBus.ts` exports a `new Phaser.Events.EventEmitter()` singleton. Phaser scenes emit events on it; Vue components listen. No Vue imports inside the file. This is the *only* coupling point between the two worlds.

Vitest cannot load `phaser` in happy-dom (canvas detection crashes at module load). `EventBus.spec.ts` mocks `phaser` with a local `EventEmitter`-compatible class that satisfies the same interface, testing the contract (on/off/once/emit/removeAllListeners) without a browser environment. Any test that transitively imports `@/game/EventBus` also needs a `vi.mock('@/game/EventBus', ...)` stub — applied to `router/index.spec.ts` and `AppLayout.spec.ts`.

### Scene chain
Boot immediately starts Preloader; Preloader immediately starts MainMenu (no file assets). Each scene emits `current-scene-ready` on `EventBus` in `create()`. MainMenu listens for the `start-game` EventBus event fired by the Vue "Play" button. Game emits `navigate '/game'`; `AppLayout.vue` routes accordingly via `router.push`.

### Simulation model changes
- `UnitType` enum and `type` field deleted from `Unit`.
- Added `controller: 'p1' | 'p2' | null` and `idleMs: number`.
- `World` constructor simplified to `(grid: Grid, units: Unit[])` — no more `playerUnitId`.
- New `World` methods: `claimUnit`, `releaseUnit`, `stepUnit`, `pathfindUnit`, `registerInput`, `getClaimedUnits`, `nearestUnclaimedUnit`.
- `tick(deltaMs)` increments `idleMs` for claimed units and auto-releases any unit at `idleMs >= 10_000`. P2→P1 promotion happens inside `releaseUnit('p1')`: if P2 holds a unit at the time P1 releases, that unit is reassigned to `'p1'`.
- `WorldFactory.UNIT_COUNT = 200` (renamed from `AI_COUNT`); all units start with `controller: null`.

### Grid draw performance
Two-pass fill: all passable tiles in one `fillStyle` call, all obstacle tiles in a second. This avoids 40,000 state switches in the Graphics command buffer. Grid is drawn once in `create()` since it is static; only the unit layer is redrawn each `update()`.

### Renderer classes deleted
`GridRenderer` and `UnitRenderer` class files were deleted. Their logic is inlined directly into the `Game` scene. This was the right call — each renderer had one caller (the scene), so the abstraction added navigation overhead with no reuse benefit.

### Wanderer rendering
A single `Graphics` object for units is cleared and redrawn each `update()`. All 200 wanderers render as royalblue squares (`0x4169E1`). P1/P2 colour distinction (gold / red with highlight ring) is designed in the data model but not yet rendered — deferred to Phase 4.

### Camera position
`cameras.main.centerOn(gridWidth / 2, gridHeight / 2)` places the viewport over the center of the 6400×6400 world. No follow logic yet.

### Vitest excludes
`references/**` added to `vitest.config.ts` excludes so archived demo tests don't run alongside the live suite.

## Alternatives Considered

- **Keep PixiJS, build custom camera/input on top**: ruled out because the roadmap's split-screen and zoom features would require significant non-trivial infrastructure that Phaser already provides. The migration cost was judged lower than the ongoing custom-build cost.
- **Keep `UnitType` discriminant, add `controller` alongside it**: rejected because the two fields encode the same thing. A unit's role is ownership-at-runtime, not a fixed type. Keeping both would require keeping them in sync and invite contradictions.
- **Keep `GridRenderer`/`UnitRenderer` as classes**: considered briefly. Rejected because each had a single call site (the Game scene) and the "separation" added file-hop overhead without enabling reuse or independent testing.
- **Place game instance in `ref()`**: rejected because Phaser mutates its internals aggressively and Vue's Proxy wrapper would interfere. The game instance is held in a plain variable inside `PhaserGame.vue`.

## Further Notes

- **Phase 4 deferred**: P1 keyboard input (Space to claim/release, WASD movement, hold-repeat at 8 Hz), camera follow with exponential lerp, mouse wheel zoom, and click-to-pathfind were scoped in the original PRD but are deferred to a new PRD. The data model fully supports them (`controller`, `idleMs`, `claimUnit`, `stepUnit`, `pathfindUnit`) — Phase 4 only needs the input wiring and camera logic added to the `Game` scene.
- **P2 input**: also deferred. `controller: 'p2'` is in the model; no input routes to it yet.
- **Test count**: 70 tests pass across `world.spec.ts` (41 tests), `grid.spec.ts`, `pathfinder.spec.ts`, `EventBus.spec.ts`, `AppLayout.spec.ts`, `router/index.spec.ts`, and view specs.
- The original PRD and plan files (`docs/prd/phaser-migration.md`, `docs/plans/phaser-migration.md`) have been deleted now that the migration is archived here.
