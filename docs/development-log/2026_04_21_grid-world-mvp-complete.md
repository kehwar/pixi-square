---
date: 2026-04-21
---

# Grid World MVP Complete

## Problem Statement

The PixiJS canvas was a placeholder bunny demo with no real game content. Before any menus, settings, or progression systems could be built, there needed to be a minimal but genuinely playable game scene: a grid world with units, movement, and simulation logic that could be tested headlessly and extended without rework.

## Solution

A 200×200 tile grid world with one player colonist and 200 AI wanderers, implemented across four incremental phases. The player clicks a tile; the colonist pathfinds there smoothly at 6 tiles/s. AI colonists wander at 3 tiles/s, continuously picking new random destinations. The camera follows the player with exponential-lerp smoothing and supports mouse-wheel zoom (0.25×–2×). 47 Vitest tests cover all simulation logic; no PixiJS is involved in any test.

### Modules added

| Module | Layer | Role |
|---|---|---|
| `game/simulation/grid.ts` | Simulation | 200×200 tile matrix, 10% obstacle density, passability queries |
| `game/simulation/unit.ts` | Simulation | Unit record: id, type, tile pos, pixel pos, speed, path queue |
| `game/simulation/world.ts` | Simulation | Owns grid + units; drives `tick(deltaMs)` and `moveUnit()` |
| `game/simulation/pathfinder.ts` | Simulation | A* with 8-directional movement and MinHeap open set |
| `game/renderer/grid-renderer.ts` | Renderer | Draws grid in 3 batched draw calls |
| `game/renderer/unit-renderer.ts` | Renderer | One colored square per unit; updates position each frame |
| `game/renderer/camera-controller.ts` | Renderer | Stage transform: exponential-lerp follow + wheel zoom |
| `game/renderer/game-scene.ts` | Renderer | Composes above; owns ticker callback and click handler |

## Implementation Decisions

### Strict simulation / renderer boundary

All logic in `game/simulation/` is pure TypeScript with zero PixiJS imports. `game/renderer/` reads simulation state but never writes it except through the simulation's public API. This made all 47 tests runnable in `happy-dom`/`node` without any mocking of PixiJS. The boundary is enforced in AGENTS.md.

### A* with MinHeap and octile heuristic

The open set is a binary min-heap (`MinHeap` class inside `pathfinder.ts`) rather than a sorted array or priority queue library. Tile keys are encoded as `row * 1024 + col` (integer arithmetic, no string allocations). The heuristic is octile distance — `min(dx, dy) * √2 + |dx − dy|` — which is admissible and consistent for 8-directional movement. The pathfinder accepts any `{ isPassable(col, row): boolean }` interface, keeping it decoupled from `Grid` and testable with plain stubs.

Diagonal corner-cutting is blocked: a diagonal step `(dc, dr)` is only taken when both cardinal neighbours `(col+dc, row)` and `(col, row+dr)` are passable. This prevents units from clipping through the corners of obstacle tiles.

### Batched grid rendering

Drawing 40,000 tiles individually would generate 40,000+ PixiJS draw calls. Instead, `GridRenderer` batches all passable rects into one `fill()`, all obstacle rects into a second `fill()`, and draws grid lines as 201 horizontal + 201 vertical lines in a single `stroke()`. Total: 3 draw commands for the entire grid.

### Tile movement — budget loop

`World.tick()` uses a per-unit budget loop: `budget = speed * TILE_SIZE * (deltaMs / 1000)`. While budget remains and the path is non-empty, it consumes the exact distance to the next tile center (no overshoot). This cleanly handles multiple waypoints per tick at high speeds or low frame rates. `TILE_SIZE = 32` is a constant on `Grid` (not duplicated in renderers).

### Exponential-lerp camera follow

`CameraController.followPlayer(deltaMs)` computes `factor = 1 − e^(−6 × dt)` each frame. Speed is proportional to distance — fast when far, glides to a stop when close. This replaced a fixed-speed lerp after observing jerky behaviour near the destination. `centerOnPlayer()` is retained for startup snap and post-zoom snapping.

### Zoom: player-centered, not cursor-anchored

Cursor-anchored zoom (zoom toward the cursor position) was implemented and then reverted. At the start of a session the cursor is near the viewport center but not on the player unit, causing the player to drift out of view on zoom. Player-centered zoom keeps the player unit visible at all times, which is the correct UX for this game where the player always wants to know where their colonist is.

### WorldFactory.AI_COUNT = 200

Initially set to 20, then raised to 200 after Phase 4 to stress-test wandering performance. Frame rate remained acceptable. The constant is exported so tests can reference it without magic numbers. AI speed is 3 tiles/s (half the player's 6 t/s) to make the two unit types visually distinguishable.

### Canvas persistence — no code needed

The requirement was for the scene to survive route navigation. `AppLayout.vue` is the parent of all child routes and never unmounts during in-app navigation. The `if (app !== null) return` guard in `app.ts` prevents double-init. No code changes were needed to satisfy this requirement; the existing architecture already handled it.

## Alternatives Considered

- **Per-tile Graphics objects** — one `Graphics` instance per tile for easy updates. Rejected: 40,000 objects would destroy batch performance. The static grid is drawn once into a single `Graphics` with batched fill calls.
- **Cursor-anchored zoom** — implemented, then reverted (see above).
- **String tile keys in A*** — `"col,row"` string concatenation for the open-set map. Rejected in favour of integer `row * 1024 + col` to avoid string allocations in the hot pathfinding loop.
- **Sorted array for A* open set** — simple but O(n) insertion. Replaced with a binary min-heap for O(log n) push/pop, which matters for long paths on a 200×200 grid.
- **Camera follow in a separate mode** — a toggle between "snap" and "follow" modes. Rejected; exponential-lerp naturally degrades to a snap at startup (first frame factor ≈ 1 when the camera starts at origin) and follows smoothly thereafter.

## Further Notes

- 47 Vitest tests pass across `grid.spec.ts`, `world.spec.ts`, `pathfinder.spec.ts`, and `camera-controller.spec.ts`.
- `tsconfig.vitest.json` was extended with `ES2022.Array` lib to enable `Array.prototype.at` in tests.
- `GameView.vue` remains a transparent stub — all game content lives in the PixiJS canvas driven by `app.ts` / `GameScene`.
- The simulation/renderer boundary enables future headless simulation (replays, AI training, server-side) without rework.
