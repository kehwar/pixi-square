Status: closed

# Phase 1: P1 Join + Single-Camera Follow

## Parent

[.scratch/local-multiplayer-claim/PRD.md](../PRD.md)

## What to build

Add `controller` (`'p1' | 'p2' | null`) and `idleMs` fields to the unit model and implement the core world API: `claimUnit`, `releaseUnit`, `getClaimedUnits`, `nearestUnclaimedUnit`, and idle-expiry in `tick` (auto-release at 10 000 ms). Release must wait for the current tile step to finish before returning the unit to wandering.

Implement a minimal `InputSystem` for Player 1 (Space join/release) wired to the world API so a user can press Space to claim the nearest unclaimed unit to screen center and press Space again to release.

Implement a single-camera `CameraSystem` / `PlayerCameraSystem` that follows the claimed unit full-screen with smooth exponential lerp. Camera holds its last position when no unit is claimed.

Add unit and integration tests covering: `nearestUnclaimedUnit`, `claimUnit`, `releaseUnit`, idle-timer expiry in `tick`, and the end-to-end P1 claim → camera follow flow.

## Acceptance criteria

- [x] Pressing Space when no P1 unit exists claims the nearest unclaimed unit to screen center.
- [x] Claimed unit stops wandering and the single full-screen camera follows it smoothly.
- [x] Pressing Space while holding a claimed unit releases it; unit resumes wandering after finishing its current tile step; camera holds last position.
- [x] A claimed unit with no input for 10 000 ms is automatically released.
- [x] `nearestUnclaimedUnit`, `claimUnit`, `releaseUnit`, and `tick` idle expiry are covered by unit tests.
- [x] Type-checking, lint, and unit tests pass (`npm run build`, `npm run lint`, `npm run test:unit`).

## Blocked by

None — can start immediately.

## User stories covered

1, 2, 13, 15, 16, 20, 22, 26, 30, 31

## Comments

### 2026-05-02 — Agent

Implemented all acceptance criteria:

- `src/game/systems/InputSystem.ts` — world-level system owning claim state (`claimUnit`, `releaseUnit`, `nearestUnclaimedUnit`, `getClaimedUnits`). `update` accumulates `idleMs` per claimed unit and auto-releases at 10 000 ms. Space keydown handled via Phaser keyboard plugin.
- `src/game/systems/CameraSystem.ts` — world-level camera pool; `acquireCamera` returns `cameras.main` for phase 1.
- `src/game/systems/PlayerCameraSystem.ts` — per-entity; exponential-lerp follow (`CAMERA_LERP = 0.05`) in `update`.
- `src/game/scenes/GameScene.ts` — wired all three systems; added a dedicated system entity for `InputSystem.update`.
- `src/game/systems/WanderingSystem.ts` — `create` now skips the initial path request when the entity already has an active path, enabling immediate `WanderingSystem` re-add on release without a two-phase deferred callback.

Trade-offs: two-phase release (deferred `WanderingSystem` re-add on `movement:path-empty`) was initially implemented then replaced by the simpler `WanderingSystem.create` guard — cleaner responsibility boundary, fewer moving parts. Camera "holds last position" on release is satisfied implicitly by Phaser not resetting camera scroll when no one updates it.

23 new tests across `InputSystem.spec.ts` (16) and `PlayerCameraSystem.spec.ts` (7). `WanderingSystem.spec.ts` gained one test for the path-guard behaviour.

