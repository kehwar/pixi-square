Status: needs-triage

# Phase 1: P1 Join + Single-Camera Follow

## Parent

[.scratch/local-multiplayer-claim/PRD.md](../PRD.md)

## What to build

Add `controller` (`'p1' | 'p2' | null`) and `idleMs` fields to the unit model and implement the core world API: `claimUnit`, `releaseUnit`, `getClaimedUnits`, `nearestUnclaimedUnit`, and idle-expiry in `tick` (auto-release at 10 000 ms). Release must wait for the current tile step to finish before returning the unit to wandering.

Implement a minimal `InputSystem` for Player 1 (Space join/release) wired to the world API so a user can press Space to claim the nearest unclaimed unit to screen center and press Space again to release.

Implement a single-camera `CameraSystem` / `PlayerCameraSystem` that follows the claimed unit full-screen with smooth exponential lerp. Camera holds its last position when no unit is claimed.

Add unit and integration tests covering: `nearestUnclaimedUnit`, `claimUnit`, `releaseUnit`, idle-timer expiry in `tick`, and the end-to-end P1 claim → camera follow flow.

## Acceptance criteria

- [ ] Pressing Space when no P1 unit exists claims the nearest unclaimed unit to screen center.
- [ ] Claimed unit stops wandering and the single full-screen camera follows it smoothly.
- [ ] Pressing Space while holding a claimed unit releases it; unit resumes wandering after finishing its current tile step; camera holds last position.
- [ ] A claimed unit with no input for 10 000 ms is automatically released.
- [ ] `nearestUnclaimedUnit`, `claimUnit`, `releaseUnit`, and `tick` idle expiry are covered by unit tests.
- [ ] Type-checking, lint, and unit tests pass (`npm run build`, `npm run lint`, `npm run test:unit`).

## Blocked by

None — can start immediately.

## User stories covered

1, 2, 13, 15, 16, 20, 22, 26, 30, 31
