# Plan: Grid World MVP

> Source PRD: docs/prd/grid-world-mvp.md

## Architectural decisions

- **Simulation boundary**: `game/simulation/` — pure TypeScript, zero PixiJS imports, fully Vitest-testable. `game/renderer/` — PixiJS only, reads simulation state, never tested headlessly.
- **Grid dimensions**: 200×200 tiles. Each tile is 32×32 world-space pixels (6400×6400 total).
- **Tile coordinate system**: integer `(col, row)`, 0-based, origin top-left.
- **Key models**: `Grid` (tile matrix + passability), `Unit` (type: `player` | `ai`, tile position, pixel position, movement queue), `World` (owns grid + units, drives tick).
- **Pathfinding**: A\* with 8-directional movement. Cardinal cost 1, diagonal cost √2.
- **Movement speed**: 2 tiles per second (64 world-space pixels per second), frame-rate-independent via `deltaMs`.
- **Camera**: follows player unit position, mouse-wheel zoom clamped between 0.25× and 2×.
- **No new Vue or Pinia additions** in this phase. `GameView.vue` remains a transparent stub.

---

## Phase 1: Static Grid + Persistent Scene

**User stories**: 1, 2, 3, 13

### What to build

Create the `Grid` simulation module and wire a `GameScene` into `app.ts` so the scene starts when the app initialises and keeps running regardless of route navigation. The PixiJS canvas shows the full 200×200 tile grid: passable tiles as solid colored squares with visible borders, ~1% of tiles randomly chosen as obstacles and rendered in a distinct color. The camera is fixed for now. Navigating away from `#/game` and back does not restart or reset the scene.

### Acceptance criteria

- [ ] The grid renders 200×200 tiles, each as a colored square with a visible border.
- [ ] Approximately 1% of tiles are rendered in a distinct obstacle color.
- [ ] The `Grid` module can be instantiated and queried for passability in isolation with no PixiJS dependency.
- [ ] Vitest tests confirm: grid has correct dimensions (200×200), obstacle count is within ±50% of 400, passability queries return correct results for passable and obstacle tiles.
- [ ] Navigating from `#/game` to `#/settings` and back does not re-initialise or blank the canvas.

---

## Phase 2: Player Colonist Spawns

**User stories**: 4, 5, 6

### What to build

Add the `Unit` model and `WorldFactory` (spawning one player unit at a random passable tile). The `UnitRenderer` reads unit pixel positions from world state and draws the player colonist as a distinct colored square on the grid. The `CameraController` is introduced: the camera lerps toward the player unit each frame, and the mouse wheel adjusts zoom (clamped 0.25×–2×). The player colonist is visible and the camera sits on top of it at startup.

### Acceptance criteria

- [ ] A single player colonist appears on the grid as a distinctly colored square at a passable tile.
- [ ] The camera starts centered on the player colonist.
- [ ] Scrolling the mouse wheel zooms in and out, clamped to the 0.25×–2× range.
- [ ] The camera does not allow the viewport to pan outside the grid bounds when zooming.

---

## Phase 3: Click-to-Move with Pathfinding

**User stories**: 7, 8, 9, 10, 14

### What to build

Implement the `Pathfinder` (A\*, 8-directional) and connect it to `World.tick()` and `World.moveUnit()`. Canvas click events are translated from screen space to tile coordinates and passed to `moveUnit`. Each tick, the world advances the player unit's pixel position toward the next waypoint; on reaching a tile center the unit dequeues the next step. The colonist moves smoothly (not teleporting), supports diagonal movement, and routes around obstacle tiles. Clicking while the unit is already moving replaces the current path.

### Acceptance criteria

- [ ] Clicking a passable tile causes the player colonist to begin moving toward it smoothly.
- [ ] The colonist moves at 2 tiles per second regardless of frame rate.
- [ ] Diagonal movement occurs where it shortens the path.
- [ ] The path never crosses an obstacle tile.
- [ ] Clicking a new tile while the colonist is mid-path cancels the old path and starts a new one.
- [ ] Clicking an obstacle tile does nothing (no movement, no error).
- [ ] Vitest tests confirm: Pathfinder returns a valid path between two passable tiles; returns null when the destination is an obstacle; the path contains no obstacle tiles; path from a tile to itself is trivial; `World.tick()` advances unit pixel position; unit dequeues next waypoint on reaching tile center; unit stops at final destination; `moveUnit()` replaces an in-progress path.

---

## Phase 4: AI Wanderers

**User stories**: 11, 12

### What to build

`WorldFactory` spawns 20 additional AI units at random passable starting positions. Each AI unit follows the same tick-driven movement as the player unit. When an AI unit's movement queue empties (it has reached its destination), it picks a new random passable tile and pathfinds there. AI units route around obstacles using the same pathfinder. The world now visually contains 21 colonists moving simultaneously.

### Acceptance criteria

- [ ] 20 AI colonists appear on the grid at startup as colored squares distinct from the player unit.
- [ ] AI colonists move smoothly around the grid, pathfinding around obstacles.
- [ ] An AI colonist that reaches its destination immediately begins moving toward a new random destination.
- [ ] AI movement does not degrade frame rate noticeably on the 200×200 grid.
- [ ] Vitest tests confirm: an AI unit with an empty queue picks a new passable destination; the new destination is not an obstacle tile.
