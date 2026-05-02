# bitECS + ComponentSystem as the ECS architecture

We use bitECS as the entity-component foundation for the game simulation. bitECS represents entities as plain integers and stores component data in SoA TypedArrays, giving O(1) bitmask query matching and cache-coherent iteration over 200+ units. The alternative — phatty — was evaluated but rejected: phatty stores components as heap-allocated objects in per-entity Maps, which has no cache locality advantage and is structurally equivalent to a Unity MonoBehaviour model rather than a true data-oriented ECS.

bitECS intentionally omits per-entity lifecycle hooks (create, update, destroy, sleep, wake). We built the `ComponentSystem` abstract base class on top to fill this gap: each `ComponentSystem` subclass doubles as the bitECS component token and as the holder of lifecycle methods, wired automatically by `world.installSystem`. This means adding a new behavior is one class + one `installSystem` call, with no manual teardown wiring.

## Considered Options

- **phatty**: ergonomic Component Object Model with Phaser lifecycle integration built in. Rejected because it provides no SoA/bitmask performance benefit — it is scattered heap objects with pointer-chasing iteration, not a data-oriented ECS.
- **Plain bitECS with free functions**: used briefly in Phase A. Replaced because it produced no composable lifecycle model and required manual teardown calls in the scene.
