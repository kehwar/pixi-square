Status: needs-triage

# Phase 3: Second Player and Split-Screen

## Parent

[.scratch/local-multiplayer-claim/PRD.md](../PRD.md)

## What to build

Extend `InputSystem` with a second `KeyLayout` (Arrow keys + Numpad 0 for P2) and its join-key listener. On P2 join, find the nearest unclaimed unit and perform the full component swap (remove wandering systems, add player systems).

Extend `CameraSystem` to manage camera slot assignment: one active player → `full`; two active players → P1 gets `left`, P2 gets `right`. Implement instant viewport rebalancing when cameras are acquired or released. Implement split-screen rendering that clips each camera to its half of the canvas.

Implement `promoteP2ToP1` atomically: when P1 releases while P2 is active, update the entity's `KeyLayout` reference, camera slot, and renderer tint in one operation before any tick runs. The `ViewportManager`/`CameraSystem` must then see a single `'p1'` claimed unit and collapse to full-screen without an intermediate blank frame.

Add unit and integration tests for P2 join/release, camera slot assignment, split/collapse transitions, and `promoteP2ToP1` semantics integrating with Phases 1–2.

## Acceptance criteria

- [ ] Pressing Numpad 0 when P2 is empty claims the nearest unclaimed unit and splits the screen instantly into left (P1) and right (P2) halves.
- [ ] Pressing Numpad 0 again (or idle-timeout) releases P2's unit and collapses the view to full-screen for P1.
- [ ] Releasing P1 while P2 is active promotes P2 to P1: P2's unit responds to WASD+Space, camera shifts to full-screen, no intermediate blank frame.
- [ ] `acquireCamera` / `releaseCamera` slot assignment and rebalancing are covered by unit tests.
- [ ] `promoteP2ToP1` update (layout + camera slot + renderer) is atomic and covered by integration tests.
- [ ] Type-checking, lint, and unit tests pass (`npm run build`, `npm run lint`, `npm run test:unit`).

## Blocked by

- [02-p1-player-input-movement.md](02-p1-player-input-movement.md)

## User stories covered

3, 5, 14, 21, 27, 28, 30
