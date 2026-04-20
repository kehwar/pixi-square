## Problem Statement

The game currently has a working Vue + PixiJS integration shell but no actual game content. The PixiJS canvas renders a placeholder bunny demo. The three route views (`#/`, `#/game`, `#/settings`) are empty stubs. There is no game world, no units, no interaction, and no simulation logic. Before anything else can be built — menus, settings, progression — there must be a minimal but real, playable game scene to serve as the foundation.

## Solution

Implement a minimal game world as a first playable slice. The world is a 200×200 tile grid rendered on the PixiJS canvas. One player-controlled colonist and 20 randomly wandering AI colonists exist in the world from the start. The player clicks a tile and the player colonist pathfinds there smoothly. The AI colonists wander randomly, also pathfinding around obstacles. The camera follows the player colonist and can be zoomed with the mouse wheel. Roughly 1% of tiles are randomly blocked as obstacles.

The implementation uses a strict split: all simulation logic (grid state, unit positions, pathfinding, tick logic) lives in pure TypeScript with zero PixiJS imports, making it fully testable with Vitest. The PixiJS renderer reads simulation state and draws it — it is never tested headlessly.

## User Stories

1. As a player, I want to see a 200×200 grid of tiles rendered on screen, so that I have a game world to interact with.
2. As a player, I want each tile to appear as a solid colored square with a visible border, so that I can clearly distinguish individual tiles.
3. As a player, I want a small number of obstacle tiles rendered in a different color, so that I can see which areas are impassable.
4. As a player, I want to see my colonist on the grid as a distinct colored square, so that I can identify my unit at a glance.
5. As a player, I want the camera to follow my colonist automatically, so that I always know where my unit is.
6. As a player, I want to zoom the camera in and out with the mouse wheel, so that I can get a close-up view or a wider strategic overview.
7. As a player, I want to click on a tile and have my colonist begin moving toward it, so that I can direct my unit around the world.
8. As a player, I want my colonist to move smoothly between tile centers (not teleport), so that movement feels responsive and natural.
9. As a player, I want my colonist to be able to move diagonally as well as cardinally, so that movement feels fluid.
10. As a player, I want my colonist to automatically route around obstacles when I click a destination, so that I don't have to manually navigate around blocked tiles.
11. As a player, I want to see 20 AI colonists wandering the grid randomly, so that the world feels alive from the start.
12. As a player, I want the AI colonists to also pathfind around obstacles rather than walking through them, so that movement looks coherent.
13. As a player, I want the game scene to remain running when I navigate to a different route (e.g. settings), so that the simulation is not reset on every navigation.
14. As a developer, I want to run headless Vitest tests that spawn units, issue move commands, advance simulation ticks, and assert on resulting tile positions, so that I can verify game logic without a browser.

## Implementation Decisions

### Simulation / Renderer split

All game logic lives in `game/simulation/`. It is pure TypeScript with zero imports from PixiJS, Vue, Pinia, or Vue Router. All PixiJS rendering lives in `game/renderer/`. The renderer reads simulation state; it never writes to it except through the simulation's public API.

### Simulation modules

- **Grid** — A 200×200 matrix of tile records. Each tile has a `type` (passable | obstacle). Obstacle tiles are placed randomly at initialization at approximately 1% density. The grid exposes a method to query whether a coordinate is passable.
- **Pathfinder** — An A\* implementation that operates on the grid. Supports diagonal movement (8-directional). Returns an ordered list of tile coordinates from source to destination, or null if no path exists. Diagonal moves cost √2; cardinal moves cost 1.
- **Unit** — A record representing a single colonist: tile position, pixel position (for smooth interpolation), movement speed, movement queue (list of tile waypoints from the pathfinder), and a unit type (player | ai).
- **World** — The top-level simulation object. Owns the grid and all units. Exposes `tick(deltaMs)`, `moveUnit(unitId, targetTile)`, `getState()`. On each tick it advances each unit's pixel position toward the next waypoint in its queue; when a unit reaches the center of a waypoint tile it dequeues the next waypoint. AI units pick a new random passable destination when their queue empties.
- **WorldFactory** — Creates a `World` with one player unit and 20 AI units placed at random passable starting positions.

### Renderer modules

- **GridRenderer** — A PixiJS `Container` that draws the 200×200 grid as colored squares with borders. Obstacle tiles get a distinct color. Only redraws tiles that change (or draws once at init if the grid is static).
- **UnitRenderer** — A PixiJS `Container` with one child sprite (colored square) per unit. On each render frame it reads unit pixel positions from the world state and updates sprite positions.
- **CameraController** — Controls the PixiJS stage transform (position + scale). Each frame it lerps the camera position toward the player unit's pixel position. Mouse wheel events adjust the scale, clamped to a sensible min/max range. The camera is clamped so the viewport cannot pan outside the grid bounds.
- **GameScene** — Composes `GridRenderer`, `UnitRenderer`, and `CameraController`. Owns the `Ticker` callback that calls `world.tick(deltaMs)` and then syncs renderer state. Exposes `start()` and `stop()`.

### Integration with app.ts

`app.ts` creates the PixiJS `Application`, then creates a `World` via `WorldFactory` and a `GameScene`. The `GameScene.start()` is called once. Click events on the PixiJS canvas are translated from screen space to tile coordinates and passed to `world.moveUnit(playerUnitId, tile)`.

### Tile sizing

Each tile is 32×32 pixels in world space. The full grid is therefore 6400×6400 world-space pixels. The camera zoom range is approximately 0.25× to 2×.

### Movement speed

Units move at 2 tiles per second (64 world-space pixels per second). This is a constant on the `Unit` record and can be varied per unit type later.

### No Vue changes required

`GameView.vue` remains a transparent stub. The PixiJS canvas in `AppLayout.vue` drives everything. No new Pinia stores are introduced in this phase.

## Testing Decisions

**What makes a good test here:** test only the external observable behavior of the simulation — unit positions after N ticks, path validity, obstacle avoidance — never internal data structures or private methods. Tests must run in Vitest's `happy-dom` or `node` environment with zero PixiJS or DOM canvas involvement.

### Modules to test

- **Grid** — Construction produces correct dimensions; obstacle density is within expected range; passability queries return correct results.
- **Pathfinder** — Returns a valid path between two passable tiles; returns null when destination is an obstacle; path avoids all obstacle tiles; diagonal moves are included; path from a tile to itself is trivial.
- **Unit / World tick** — A unit with a queued path advances its pixel position each tick; a unit dequeues the next waypoint when it reaches a tile center; a unit at its final destination stops moving; an AI unit picks a new destination when its queue empties.
- **moveUnit** — Calling `moveUnit` replaces the unit's queue with the result of pathfinding to the new target; calling it while the unit is mid-path replaces the old path.

### Prior art

`src/views/__tests__/AppLayout.spec.ts` and `src/router/__tests__/index.spec.ts` are the existing test examples. Both use `vi.mock` to isolate from PixiJS. The simulation tests will not need mocking at all — they are plain unit tests on plain TypeScript classes/functions.

## Out of Scope

- Tile types beyond passable/obstacle (grass, water, resources, etc.)
- Colonist selection UI, selection rings, or multi-select
- Any Vue overlay HUD (health bars, resource counters, status panels)
- Main menu navigation ("Play" button, back button)
- Settings (audio, display)
- Animations or sprite sheets — units are colored squares only
- Sound effects
- Save / load
- Win / lose conditions
- Fog of war
- Multiple maps or map generation beyond random obstacle placement
- Camera panning via keyboard or drag (camera only follows player unit in this phase)

## Further Notes

- The 200×200 grid at 32px tiles produces a 6400×6400 world. At 1% obstacle density that is approximately 400 blocked tiles.
- A\* with 8-directional movement on a 200×200 grid is fast enough to run synchronously on the main thread; no worker is needed at this scale.
- The simulation tick is driven by PixiJS `Ticker` `deltaMS` so simulation speed is frame-rate-independent.
- The renderer split sets up the architecture for future headless simulation (server-side, replays, or AI training) without any rework.
