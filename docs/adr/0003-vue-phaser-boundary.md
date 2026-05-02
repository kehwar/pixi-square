# Vue/Phaser boundary via EventBus and StartGame factory

`src/game/` is a Vue-free zone: no imports from `vue`, `vue-router`, or `pinia`. Vue components and Pinia stores have no direct imports of Phaser objects. The two worlds communicate exclusively through the `EventBus` singleton (`Phaser.Events.EventEmitter`) and the `StartGame` factory function.

The Phaser `Game` instance is held in a plain (non-reactive) variable inside `PhaserGame.vue`. It must never be placed inside `ref()` or `reactive()` — Phaser mutates its internals aggressively and Vue's Proxy wrapper would corrupt it.

This boundary is the reason `src/game/` is fully unit-testable: Vitest cannot load Phaser in happy-dom (canvas detection crashes at module load), so any test that touches game code mocks at the boundary rather than fighting the renderer.

## Consequences

- Any test that transitively imports `EventBus` needs a `vi.mock('@/game/EventBus', ...)` stub.
- `PhaserGame.vue` uses `ReturnType<typeof StartGame>` for the game instance type rather than importing from `'phaser'` directly.
