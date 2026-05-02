Status: needs-triage

# Phase 2: P1 Movement (PlayerInputSystem)

## Parent

[.scratch/local-multiplayer-claim/PRD.md](../PRD.md)

## What to build

Implement `PlayerInputSystem` as a per-entity ComponentSystem that borrows a `KeyLayout` from `InputSystem`. It handles `pendingDirection` buffering, `idleMs` bookkeeping (any keydown resets to 0), and `movement:path-empty` consumption to chain tile steps.

Implement WASD directional movement for P1: a tap moves one tile immediately; a held key chains tile steps (detect via `scene.input.keyboard.isDown` at each `path-empty` event — no OS repeat timer). Enforce diagonal corner-cutting rules (both cardinal neighbors must be passable) and stop movement into blocked or out-of-bounds tiles.

Add unit and integration tests for `PlayerInputSystem` behaviors, `pendingDirection` handling, diagonal corner-cutting, idle timer reset, and integration with the world API and camera follow from Phase 1.

## Acceptance criteria

- [ ] WASD controls the claimed P1 unit; single-tile tap moves immediately.
- [ ] A directional keypress during an in-progress step is queued as `pendingDirection` and consumed on the next `movement:path-empty` event.
- [ ] Held keys chain tile steps without OS double-stepping.
- [ ] Diagonal steps are only taken when both adjacent cardinal tiles are passable (corner-cutting blocked).
- [ ] Movement into a blocked or out-of-bounds tile is a no-op.
- [ ] `idleMs` increments each tick and triggers `releaseUnit` at 10 000 ms; any keydown resets `idleMs` to 0.
- [ ] Type-checking, lint, and unit tests pass (`npm run build`, `npm run lint`, `npm run test:unit`).

## Blocked by

- [01-p1-join-single-camera.md](01-p1-join-single-camera.md)

## User stories covered

4, 6, 7, 8, 9, 10, 11, 15, 16, 29, 31
