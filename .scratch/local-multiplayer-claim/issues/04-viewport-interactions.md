Status: needs-triage

# Phase 4: Per-Viewport Interactions (Click-to-Pathfind, Wheel Zoom)

## Parent

[.scratch/local-multiplayer-claim/PRD.md](../PRD.md)

## What to build

Implement auto-zoom in `PlayerCameraSystem`: the zoom level keeps a fixed visible radius (±15 tiles) around the unit, smoothed per tick with exponential lerp and clamped to `[MIN_ZOOM, MAX_ZOOM]`.

Add pointer click handling scoped to each camera's viewport rect. On click, transform screen-space → world-space → tile coordinates using the camera's transform and emit `'input:pathfind'` for the entity; `PlayerInputSystem` consumes the event and calls `requestPath`.

Add mouse-wheel handling scoped to each viewport rect. In single-player mode, all wheel events go to P1's camera; in split-screen mode, left-half events go to P1, right-half to P2. Wheel adjusts zoom within `[MIN_ZOOM, MAX_ZOOM]` and re-centers the camera on the claimed unit after the adjustment.

Add unit and integration tests for click coordinate transforms, auto-zoom clamping, wheel-driven independent zoom, and interaction with the camera and input logic from Phases 1–3.

## Acceptance criteria

- [ ] Clicking a tile in a player's viewport issues a `pathfindUnit` call with correct tile coordinates for that player.
- [ ] Mouse wheel over a player's half adjusts only that player's camera zoom and re-centers on their unit.
- [ ] Auto-zoom clamps to `[MIN_ZOOM, MAX_ZOOM]` and is smoothed each tick.
- [ ] Wheel zoom on the correct half is routed correctly in both single and split-screen modes.
- [ ] Type-checking, lint, and unit tests pass (`npm run build`, `npm run lint`, `npm run test:unit`).

## Blocked by

- [03-second-player-split-screen.md](03-second-player-split-screen.md)

## User stories covered

12, 22, 23, 24, 25, 29
