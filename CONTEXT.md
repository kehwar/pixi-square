# Pixi Square

A local-multiplayer grid-world game where players claim autonomous wandering units and navigate a tile-based world together.

## Language

**Unit**:
Any entity that exists on the grid, regardless of claim state.
_Avoid_: Actor, agent, entity (too generic)

**Wanderer**:
A unit with no Player Slot; moves autonomously via the wandering AI.
_Avoid_: AI unit, NPC, bot

**Player Unit**:
A unit that holds a Player Slot and is driven by that player's input.
_Avoid_: Claimed unit, controlled unit, player entity

**Grid**:
The fixed 200×200 tile map that defines the world topology — which tiles are passable and which are obstacles.
_Avoid_: Map, world, level, tilemap

**World**:
The runtime simulation state: the Grid plus all Units and their movement state. Driven by the ECS tick.
_Avoid_: Scene, game state, simulation (too vague on its own)

**Claim**:
The act of a player taking control of a Wanderer, converting it into a Player Unit. The target Wanderer is the one nearest (by world-space pixel distance) to the center of the claiming player's Viewport.
_Avoid_: Take, own, assign, select

**Release**:
The act of returning a Player Unit to wandering status. Two-phase: input and Viewport are relinquished immediately, but the unit completes its current Path before the Wanderer AI resumes.
_Avoid_: Drop, unclaim, free

**Auto-Release**:
A release triggered automatically after a Player Unit has been Idle (no input) for 10 seconds.
_Avoid_: Idle timeout, expiry

**Promotion**:
The special release event where P1 releases while P2 is active — P2's entity is mutated in place to become P1, swapping Key Layout, Viewport Slot, and renderer tint. Movement state (current Path) is not affected; the unit continues uninterrupted.
_Avoid_: P2→P1 swap, player reassignment

**Player Slot**:
A numbered position (`'p1'` or `'p2'`) that a human occupies for a session. Not a persistent identity — on Promotion, P2's unit slides into the P1 slot without any player memory being transferred.
_Avoid_: Player, controller, player identity, player ID

**Idle**:
A unit with no current Path. For a Wanderer, idle is transient — the wandering AI immediately picks a new destination. For a Player Unit, idle accumulates toward Auto-Release at 10 seconds of no input.
_Avoid_: Waiting, resting, inactive, stopped

**Path**:
A sequence of tile waypoints computed by A* that a unit traverses in order. A directional key press produces a path of length 1.
_Avoid_: Route, waypoints, movement queue

**Step**:
The traversal of a single tile along the current Path — the atomic unit of movement.
_Avoid_: Move, tick, frame, hop

**Key Layout**:
The fixed set of keyboard keys assigned to a Player Slot's actions (movement directions + Join Key). Not remappable at runtime.
_Avoid_: Key binding, control scheme, input binding, key mapping

**Join Key**:
The key within a Key Layout that triggers Claim when no unit is held, or Release when one is. Space for P1, Numpad 0 for P2.
_Avoid_: Action key, claim key, toggle key

**Viewport**:
A Phaser camera paired with its screen rectangle; each active Player Unit owns exactly one Viewport.
_Avoid_: Camera view, screen region, player camera

**Viewport Slot**:
The named position a Viewport occupies on screen: `full` (single player), `left` (P1 in split), or `right` (P2 in split).
_Avoid_: Camera slot, position, layout slot

**Split-Screen**:
The layout state when two Viewports are active — each occupying half the screen.
_Avoid_: Dual viewport, two-player view, side-by-side mode

## Relationships

- A **World** contains exactly one **Grid** and zero or more **Units**
- A **Unit** is either a **Wanderer** (no Player Slot) or a **Player Unit** (holds a Player Slot)
- A **Unit** transitions between **Wanderer** and **Player Unit** via **Claim** / **Release**
- A **Player Unit** owns exactly one **Viewport**, assigned a **Viewport Slot**
- One active Player Unit → Viewport Slot is `full`; two active Player Units → slots are `left` (P1) and `right` (P2)
- **Promotion** reassigns the P2 Player Slot to the existing P2 unit's entity, making it the P1 Player Unit

## Example dialogue

> **Dev:** "When a player presses their Join Key, what happens if all units are already claimed?"
> **Domain expert:** "Nothing — there's no unclaimed Wanderer to take. The Join Key only triggers a Claim if a free Wanderer exists."

> **Dev:** "If P1 releases mid-Path, does the unit finish the current Step first?"
> **Domain expert:** "Input and camera drop immediately — P1 loses control on the frame they press the Join Key. But the unit continues along its entire remaining Path before the Wanderer AI takes over. Another player can claim it during this coast — claim status is based on Player Slot, not whether a Path is active."

> **Dev:** "What viewport does P2 get the moment they press their Join Key?"
> **Domain expert:** "The screen immediately splits. P2's Viewport Slot becomes `right`, P1's becomes `left`. There's no animation — it's instant."

## Flagged ambiguities

- "unit" was used to mean both any entity on the grid AND specifically an unclaimed entity — resolved: **Unit** is the base term for any grid entity; **Wanderer** and **Player Unit** are the two states.
- A released unit may still be following its old Path (coasting) — resolved: it is still a **Wanderer** and is immediately claimable. Claim status is determined by Player Slot, not by whether a Path is active.
- "screen center" in PRD means center of the player's **Viewport** (not the canvas center), which matters in split-screen where each player has a different Viewport.
