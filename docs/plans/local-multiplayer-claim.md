# Plan: Local Multiplayer Claim

> Source PRD: [docs/prd/local-multiplayer-claim.md](../prd/local-multiplayer-claim.md)

## Architectural decisions

- **Routes**: unchanged — `#/game` remains the only game route.
- **Unit model**: `Unit` gains `controller: 'p1' | 'p2' | null` and `idleMs: number`; the `type: 'player' | 'ai'` discriminant is removed.
- **World API**: `playerUnitId` removed; new methods `claimUnit`, `releaseUnit`, `stepUnit`, `pathfindUnit`, `registerInput`, `getClaimedUnits`, `nearestUnclaimedUnit`; `tick` drives idle expiry and P2→P1 promotion.
- **Input**: standalone `KeyboardInputController` class (game layer, no Vue); callback interface for testability; two instances share the same `window` event listeners.
- **Viewport / camera**: `ViewportManager` owns one or two `Viewport` containers, each with its own `CameraController`; the single PixiJS `Application` and canvas are unchanged.
- **Split-screen**: achieved entirely inside the PixiJS stage (mask/scissor per viewport); `AppLayout.vue` is untouched.
- **Rendering**: `UnitRenderer` is shared across both viewports; color/ring determined by `controller`.
- **Constants**: `WorldFactory.AI_COUNT` renamed to `UNIT_COUNT`; idle timeout constant `IDLE_TIMEOUT_MS = 10_000`.

---

## Phase 1: All-Wanderer Simulation + Player 1 Input

**User stories**: 1, 2, 4, 6, 7, 8, 20, 21, 22, 23, 24, 25

### What to build

Replace the fixed player/AI model with a uniform wanderer pool. Every unit starts with `controller: null` and wanders autonomously. The `World` gains a complete claim/release/step/idle API. `WorldFactory` creates 200 wanderers with no pre-assigned player.

Wire a `KeyboardInputController` for P1 (WASD + Space) into `GameScene`. Pressing Space claims the nearest unclaimed unit to the screen center; pressing Space again releases it. WASD moves the claimed unit one tile per tap, or at 8 Hz after a 200 ms hold. Directional input into an obstacle is silently ignored. After 10 seconds of no input the unit is auto-released and resumes wandering; a released unit finishes its current tile step before AI movement resumes. Pressing Space while P1 is the only active player and P1 releases causes no promotion (P2 is not yet implemented — promotion is exercised via tests only at this stage).

The camera (still a single `CameraController` on the full stage) follows P1's claimed unit using `getClaimedUnits()`; it freezes in place when P1 has no unit. Click-to-pathfind routes through `getClaimedUnits()` for P1. All units render in royal blue for now (visual distinction comes in Phase 2).

### Acceptance criteria

- [ ] `WorldFactory.create()` produces 200 units all with `controller: null` and no `type` field.
- [ ] `claimUnit('p1', id)` marks the unit as P1's, resets `idleMs` to 0, and clears its path.
- [ ] `releaseUnit('p1')` clears the claim; the unit resumes wandering on the next tick after finishing its current step.
- [ ] `stepUnit('p1', direction)` moves the claimed unit one tile when the destination is passable, and is a no-op into an obstacle or out-of-bounds.
- [ ] `registerInput('p1')` resets `idleMs` to 0 without moving.
- [ ] `tick` auto-releases a unit whose `idleMs >= 10_000`.
- [ ] Two simultaneous claims (`'p1'` and `'p2'`) do not interfere with each other's `idleMs`.
- [ ] `getClaimedUnits()` reflects live claim and release state for both controllers.
- [ ] P2→P1 promotion: releasing P1 while P2 holds a unit reassigns that unit to `'p1'`, leaves `'p2'` unclaimed, and preserves `idleMs`.
- [ ] `nearestUnclaimedUnit(pixelX, pixelY)` returns the unit closest by Euclidean pixel distance.
- [ ] Pressing Space in-game claims the nearest unclaimed unit (verified by game running without error).
- [ ] WASD tap issues one tile step; WASD hold at ≥ 200 ms repeats at 8 Hz until key release.
- [ ] `KeyboardInputController` stub tests: claim, step, and release callbacks fire at the correct times with synthetic `KeyboardEvent` objects.
- [ ] Camera follows P1's unit when claimed; stays frozen when no unit is claimed.
- [ ] All existing simulation and camera-controller tests continue to pass after migration.
- [ ] Linting and type-checking pass without errors after the new code is added.

---

## Phase 2: Unit Visual Distinction

**User stories**: 9, 10, 11

### What to build

Update `UnitRenderer.sync()` to read `controller` from each unit. Wanderers remain royal blue. P1's unit renders gold with a gold highlight ring around it. P2's unit renders red with a red highlight ring. The ring is drawn as a stroked circle or square slightly larger than the unit glyph, added/removed as `controller` changes.

### Acceptance criteria

- [ ] Unclaimed units render in royal blue with no ring.
- [ ] A unit with `controller === 'p1'` renders gold with a visible gold ring.
- [ ] A unit with `controller === 'p2'` renders red with a visible red ring.
- [ ] Switching a unit from claimed to unclaimed (or between players) updates color and ring within the same frame.
- [ ] Linting and type-checking pass without errors after the new code is added.

---

## Phase 3: Per-Viewport Camera, Auto-Zoom & Input Routing

**User stories**: 14, 15, 16, 17, 18, 26

### What to build

Introduce `ViewportManager` managing a single `Viewport` in single-player mode. Each `Viewport` wraps a `Container` that holds the camera-transformed world view and owns its own `CameraController` instance. `CameraController` now operates on a viewport `Container` plus explicit viewport dimensions (width/height/offset) rather than the full stage.

Auto-zoom: `CameraController` computes a zoom level such that ±15 tiles around the unit are visible within the viewport. Zoom is smoothed with exponential lerp and clamped to `[MIN_ZOOM, MAX_ZOOM]`. When no unit is claimed the camera freezes (no zoom change, no position change).

Mouse-wheel events are routed to the viewport under the cursor (in single-player mode this is always the one viewport). After manual zoom the camera re-centers on the claimed unit. Click-to-pathfind converts the click's screen coordinate through that viewport's camera transform to world-space tile coordinates and calls `pathfindUnit` for the corresponding controller. Clicks in a viewport with no claimed unit are ignored.

### Acceptance criteria

- [ ] Single-player mode: one `Viewport` occupies the full canvas.
- [ ] Auto-zoom keeps the claimed unit's ±15-tile radius visible in the viewport.
- [ ] Zoom is clamped to `[MIN_ZOOM, MAX_ZOOM]` at all times.
- [ ] Zoom smoothly interpolates each frame using exponential lerp.
- [ ] Camera freezes (position and zoom unchanged) when no unit is claimed.
- [ ] Mouse-wheel zoom targets the correct viewport (always P1's in single-player mode).
- [ ] Click-to-pathfind correctly converts screen → world-space coordinates through the viewport transform.
- [ ] Viewport clamping keeps the camera within grid bounds at all zoom levels.
- [ ] Unit tests: `followPlayer` converges toward unit position; freezes with no unit; auto-zoom stays in range; viewport clamping holds in half-width config; single-player `ViewportManager` initialises and destroys without error.
- [ ] Linting and type-checking pass without errors after the new code is added.

---

## Phase 4: Split-Screen and Player 2

**User stories**: 3, 5, 12, 13, 19, 23

### What to build

Add a second `KeyboardInputController` for P2 (Arrow keys + Numpad 0) wired into `GameScene`. `ViewportManager` gains a split mode: two equal side-by-side `Viewport` containers each occupying half the canvas width, clipped with a mask or scissor rect, separated by a thin divider. The switch between single and split mode is instant (no animation). `GameScene` observes `getClaimedUnits()` each tick and notifies `ViewportManager` to change mode when the count of active players changes.

When P2 claims a unit the viewport splits and both cameras operate independently (follow, auto-zoom, zoom, click-to-pathfind each routed to left/right half). When P2 releases (idle or Numpad 0), the split collapses to single-player. When P1 releases while P2 is active, the world's P2→P1 promotion fires first (implemented in Phase 1), then `ViewportManager` observes a single `'p1'` claim and collapses without a blank frame.

### Acceptance criteria

- [ ] Pressing Numpad 0 claims the nearest unclaimed unit as P2.
- [ ] Arrow keys move P2's unit with the same hybrid tap/hold behaviour as P1.
- [ ] Pressing Numpad 0 again releases P2's unit.
- [ ] The screen splits into two equal halves the moment P2 claims a unit.
- [ ] Each viewport's camera independently follows its player's unit.
- [ ] Mouse-wheel zoom over the left half zooms P1's viewport; over the right half zooms P2's.
- [ ] Click-to-pathfind in each half routes to the correct player's controller.
- [ ] The split collapses back to full-screen when P2 releases (idle or voluntary).
- [ ] When P1 releases while P2 is active, P2 is promoted to P1 and the display is single full-screen (P1 slot) with no blank frame.
- [ ] P1 and P2 idle timers are independent — one player idling does not affect the other.
- [ ] `ViewportManager` unit tests: single→split and split→single transitions do not throw; each viewport occupies the correct half-width.
- [ ] Linting and type-checking pass without errors after the new code is added.
