Status: needs-triage

# Phase 5: Renderer Polish and Promotion Visuals

## Parent

[.scratch/local-multiplayer-claim/PRD.md](../PRD.md)

## What to build

Rename `UnitRendererSystem` → `WandererRendererSystem` to clarify it only applies to unclaimed units.

Implement `PlayerRendererSystem` as a per-entity ComponentSystem that renders claimed units with per-player tint (gold for P1, red for P2) and an additional highlight ring drawn around the sprite. The renderer is swapped in/out as part of the claim/release component swap.

Ensure `promoteP2ToP1` updates the renderer tint and ring color atomically alongside the layout and camera slot changes (no separate tick required).

Add renderer unit tests for tint and ring creation/update, and integration tests that validate visuals update atomically across viewports and interoperate with camera and input flows from Phases 1–4.

## Acceptance criteria

- [ ] Unclaimed units render in the wanderer color (unchanged).
- [ ] P1's claimed unit renders gold with a gold highlight ring.
- [ ] P2's claimed unit renders red with a red highlight ring.
- [ ] Promotion from P2 → P1 updates colors immediately and deterministically in all active viewports.
- [ ] `UnitRendererSystem` is fully renamed to `WandererRendererSystem` with no remaining references to the old name.
- [ ] Type-checking, lint, and unit tests pass (`npm run build`, `npm run lint`, `npm run test:unit`).

## Blocked by

- [03-second-player-split-screen.md](03-second-player-split-screen.md)

## User stories covered

17, 18, 19
