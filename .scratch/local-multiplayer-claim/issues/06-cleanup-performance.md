Status: needs-triage

# Phase 6: Cleanup and Performance

## Parent

[.scratch/local-multiplayer-claim/PRD.md](../PRD.md)

## What to build

Rename `AI_COUNT` → `UNIT_COUNT` across the codebase to reflect that all units are wanderers, not AI.

Audit `CameraSystem` to ensure cameras are pooled and destroyed safely under rapid join/release. Confirm `ViewportManager` / `CameraSystem` only activates dual-render (second camera) when a second player is genuinely active.

Run the full lint/format pass. Update this plan file to mark phases complete and record any deviations from the original design.

Add regression tests that verify the rename and camera pooling behavior; run the full test suite to confirm no regressions.

## Acceptance criteria

- [ ] `AI_COUNT` is renamed to `UNIT_COUNT` with no remaining references to the old name.
- [ ] Camera pool does not leak objects under rapid acquire/release cycling.
- [ ] Dual-render is only active when two players hold claimed units.
- [ ] Full test suite passes with no regressions (`npm run build`, `npm run lint`, `npm run test:unit`).

## Blocked by

- [04-viewport-interactions.md](04-viewport-interactions.md)
- [05-renderer-polish.md](05-renderer-polish.md)

## User stories covered

(developer housekeeping — no direct user stories)
