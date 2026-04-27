# Plan: Local Multiplayer Claim

> Source PRD: [docs/prd/local-multiplayer-claim.md](docs/prd/local-multiplayer-claim.md)

## Architectural decisions

- **World model:** Each unit gains `controller: 'p1' | 'p2' | null` and `idleMs` (ms). All units start as wanderers; `UNIT_COUNT` (rename of `AI_COUNT`) controls population.
- **World API (durable):** `claimUnit(unitId, controller)`, `releaseUnit(controller)`, `stepUnit(controller, direction)`, `pathfindUnit(controller, col, row)`, `registerInput(controller)`, `tick(deltaMs)`, `getClaimedUnits()`, `nearestUnclaimedUnit(pixelX, pixelY)`.
- **Input ownership:** A single world-level `InputSystem` owns join-key listeners and two `KeyLayout`s (P1: WASD+Space, P2: Arrows+Numpad0). It exposes `acquireLayout`, `releaseLayout`, and `promoteP2ToP1` as the public contract for per-entity systems.
- **Keyboard bridge:** A small, testable `KeyboardInputController` (per player) implements hybrid-repeat (immediate step on keydown, 200ms initial delay, 8Hz repeat) and delegates to the world API via callbacks. This keeps DOM wiring out of simulation code.
- **Camera ownership:** A single `CameraSystem` manages a pool of Phaser `Camera` objects and assigns logical slots `full | left | right`. Per-entity `PlayerCameraSystem` borrows a camera via `acquireCamera(eid)` and releases it via `releaseCamera(eid)`.
- **Viewport / split-screen:** `ViewportManager` composes one or two viewports (each with its own `CameraController`) and toggles single/split layout instantly when `getClaimedUnits()` changes.
- **Renderers:** `WandererRendererSystem` (unclaimed) and `PlayerRendererSystem` (claimed) render appearance. `PlayerRendererSystem` owns tint and highlight ring; `promoteP2ToP1` mutates renderer state atomically.
- **Testing approach:** Exercise behavior via public APIs and small DOM bridges. `KeyboardInputController` accepts callbacks to enable unit tests with synthetic events. Add unit and integration tests: each phase must include unit tests for newly added code and integration tests that exercise the new systems working together with previously completed phases (for example, camera+input+world). Tests should use public APIs and avoid relying on private fields.

---

## Phase 1: P1 join + single-camera follow

**User stories**: 1, 2, 13, 20, 26, 30, 31

### What to build

- Add `controller` and `idleMs` to the unit model and implement the core world API: `claimUnit`, `releaseUnit`, `getClaimedUnits`, `nearestUnclaimedUnit`, and `tick` idle expiry (10_000 ms). Ensure release finishes current tile step before returning to wandering.
- Implement a minimal `KeyboardInputController` for Player 1 (Space join/release) wired to the world API (via callbacks) so a user can press Space to claim the nearest unclaimed unit to screen center and press Space again to release.
- Implement a single-camera `CameraController` that follows the claimed unit full-screen (no split yet).
- Add unit and integration tests covering the behaviors implemented in this phase (end-to-end P1 claim → camera follow flow) and wire them into `npm run test:unit`.

### Acceptance criteria

- [ ] Pressing Space when no P1 unit exists claims the nearest unclaimed unit to screen center.
- [ ] Claimed unit stops wandering and the single full-screen camera follows it smoothly.
- [ ] Pressing Space while holding a claimed unit releases it; unit resumes wandering; camera holds last position.
- [ ] `nearestUnclaimedUnit`, `claimUnit`, `releaseUnit`, and `tick` behavior are covered by unit tests.
- [ ] Type-checking, lint, and unit tests pass (run `npm run build`, `npm run lint`, `npm run test:unit`).

---

## Phase 2: Per-entity player input (P1 movement)

**User stories**: 4, 6, 7, 8, 9, 10, 11, 16

### What to build

- Implement `PlayerInputSystem` as a per-entity ComponentSystem that borrows a `KeyLayout` from `InputSystem` and handles `pendingDirection`, `idleMs` bookkeeping, and `movement:path-empty` consumption.
- Implement the hybrid key semantics for movement (immediate tap, 200ms initial delay, 8Hz repeat) in the `KeyboardInputController` callbacks and ensure `PlayerInputSystem` queues `pendingDirection` when a step is in progress.
- Enforce diagonal/corner-cutting rules and blocked-tile behavior when resolving a step.
- Add unit and integration tests for `PlayerInputSystem` behaviors, `pendingDirection` handling, and hybrid key-repeat semantics; include integration tests that verify movement integrates with the world API and the camera follow implemented in Phase 1.

### Acceptance criteria

- [ ] WASD controls the claimed unit for P1; single-tile tap moves immediately.
- [ ] Directional input during movement is queued and consumed on `movement:path-empty`.
- [ ] Held keys chain tile steps as specified (no OS double-step interference).
- [ ] Diagonal steps are only taken when both adjacent cardinal tiles are passable.
- [ ] `idleMs` increments and triggers `releaseUnit` at 10_000 ms; any keydown resets `idleMs` to 0.
- [ ] Type-checking, lint, and unit tests pass (run `npm run build`, `npm run lint`, `npm run test:unit`).

---

## Phase 3: Second player and split-screen plumbing

**User stories**: 3, 21, 27, 28, 2, 14

### What to build

- Implement the world-level `InputSystem` with two `KeyLayout`s and join-key listeners. On P2 join, it should find the nearest unclaimed unit, perform the component swap (remove wandering systems, add player systems), and request camera assignment.
- Implement `CameraSystem` that assigns camera slots (`full` when one player, `left`/`right` when two players) and rebalances viewports when cameras are acquired/released.
- Implement `ViewportManager` (or use `CameraSystem` viewports) to split the screen instantly into left/right halves when two players are active.
- Ensure `promoteP2ToP1` behavior is atomic when P1 releases while P2 is active.
- Add unit/integration tests for join/release flows, camera slot assignment, and `promoteP2ToP1` promotion semantics; include integration tests that validate correct interaction with the world API and `PlayerInputSystem` from Phases 1–2, and assert no intermediate frames are visible during promotion.

### Acceptance criteria

- [ ] Pressing Numpad 0 when P2 is empty claims the nearest unclaimed unit and causes an instant left/right split.
- [ ] When two players are active, P1 has left-half viewport, P2 has right-half viewport; when P2 releases, the view collapses to single full-screen for P1.
- [ ] Promoting P2→P1 updates input bindings, camera slot, and renderer tints without intermediate frames.
- [ ] Type-checking, lint, and unit/integration tests pass (run `npm run build`, `npm run lint`, `npm run test:unit`).

---

## Phase 4: Per-viewport interactions (click-to-pathfind, wheel zoom)

**User stories**: 12, 22, 23, 24, 25

### What to build

- Implement `PlayerCameraSystem` per-entity to borrow Phaser camera, follow the unit with exponential lerp, and maintain auto-zoom to a fixed visible radius (smoothed, clamped to `[MIN_ZOOM, MAX_ZOOM]`).
- Add pointer click handling scoped to each camera's viewport to translate screen → world → tile coordinates and emit `input:pathfind` for the entity.
- Add wheel handling scoped to each viewport to adjust zoom independently and re-center on the unit after manual zoom.
- Add unit and integration tests for click-to-pathfind coordinate transforms, camera auto-zoom behavior, and wheel-driven zooming; include integration tests that verify these features work together with the player input and camera assignment logic from Phases 1–3.

### Acceptance criteria

- [ ] Clicking a tile in a player's viewport issues a `pathfindUnit` call with correct tile coordinates for that player.
- [ ] Mouse wheel over a player's half adjusts only that player's camera zoom and re-centers on their unit.
- [ ] Auto-zoom clamps to `[MIN_ZOOM, MAX_ZOOM]` and is smoothed each tick.
- [ ] Type-checking, lint, and unit/integration tests pass (run `npm run build`, `npm run lint`, `npm run test:unit`).

---

## Phase 5: Renderer polish and promotion visuals

**User stories**: 17, 18, 19

### What to build

- Rename `UnitRendererSystem` → `WandererRendererSystem` and implement `PlayerRendererSystem` that draws claimed units with per-player tint and a highlight ring (gold for P1, red for P2).
- Ensure `promoteP2ToP1` updates renderer tint and ring atomically when promotion occurs.
- Add renderer unit tests that verify tint and ring updates, and integration tests that validate visuals update atomically across viewports and interact correctly with camera and input flows from prior phases (Phases 1–4).

### Acceptance criteria

- [ ] Unclaimed units render in the wanderer color; P1 units render gold with ring; P2 units render red with ring.
- [ ] Promotion updates colors immediately and deterministically in all viewports.
- [ ] Type-checking, lint, and unit/integration tests pass (run `npm run build`, `npm run lint`, `npm run test:unit`).

---

## Phase 6: Cleanup and performance adjustments

**User stories**: (developer-facing, housekeeping)

### What to build

- Rename `AI_COUNT` → `UNIT_COUNT` across the codebase.
- Ensure `CameraSystem` pools/destroys cameras safely, and `ViewportManager` only activates dual-render when a second player is active.
- Run lint/format and update docs (this plan file and any dev notes).
- Add regression/unit tests that verify the rename and camera pooling behavior; run the full test suite during cleanup to catch regressions early.

### Acceptance criteria

- [ ] Codebase renamed and linted; no regressions introduced.
- [ ] Camera pooling and viewport activation behave responsibly under rapid join/release.
- [ ] Type-checking, lint, and full test suite pass after cleanup (run `npm run build`, `npm run lint`, `npm run test:unit`).
