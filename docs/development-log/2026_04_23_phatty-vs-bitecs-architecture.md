---
date: 2026-04-23
---

# phatty vs bitECS: ECS Architecture Comparison

## Problem Statement

`phatty` and `bitECS` both market themselves as ECS libraries but have fundamentally different internal models. The question is whether phatty's ECS label is accurate — i.e. whether it actually delivers the data-oriented performance advantages that ECS implies — or whether it is a higher-level object component abstraction with similar surface area.

## Findings

Both libraries were read at the source level. The core distinction is in how entities and components are stored and iterated.

**bitECS** is a genuine data-oriented ECS. Entities are plain integers; components are bare arrays or TypedArrays indexed by entity ID:

```ts
const Position = { x: new Float32Array(1e5), y: new Float32Array(1e5) }
const eid = addEntity(world)   // eid = 4, a plain number
Position.x[eid] = 10           // direct array write, no object allocation
```

**phatty** uses class instances for both entities and components, stored in a per-entity `Map`:

```ts
class ComponentSystem {
  private componentsMap: Map<typeof Component, Component> = new Map()
}
```

Each component is a heap-allocated object attached to a heap-allocated `Entity`. This is structurally identical to Unity's MonoBehaviour model.

## Key Differences

### Memory model

bitECS uses **Structure of Arrays (SoA)**: `Position.x[0..n]` is a single contiguous `Float32Array`. Iterating all positions touches one memory region — the CPU prefetcher can load it ahead of time and cache lines contain only relevant data.

phatty's components are **scattered across the heap**: each `Entity` object holds a `Map`, each component is a separate object at an arbitrary memory address. Iterating entities means pointer-chasing through unrelated memory regions — no spatial locality.

### Query matching

bitECS assigns each component a **bitflag**; each entity carries a bitmask of its components. A query match is `entityMask & queryMask === queryMask` — O(1) per entity, no allocation. Entity sets are maintained in **sparse sets** (contiguous dense array + sparse index), so iteration is O(n) with no gaps and O(1) add/remove.

phatty queries iterate a `Set<Entity>` and call `entity.components.has(ctor)` on each — a Map lookup per entity per component, with pointer-chasing into heap objects.

### Logic location

bitECS keeps logic in **external system functions** that operate on component arrays. phatty puts logic **inside component classes** via a Unity-style lifecycle (`create()`, `update(time, delta)`, `destroy()`). This makes phatty's code more ergonomic and encapsulated but couples data and behaviour in the same object.

### What phatty adds over bitECS

phatty provides things bitECS intentionally omits: component priorities, `required[]` dependency declarations with runtime checks, sleep/wake/pause/resume lifecycle forwarding (integrated with Phaser scenes), and a Phaser `EventEmitter` on each `ComponentSystem`. These are genuinely useful authoring affordances.

### Summary

| Dimension | bitECS | phatty |
|---|---|---|
| Entity representation | `number` | `Entity` class instance |
| Component storage | TypedArray / plain array, indexed by eid | `Map` on each `Entity` |
| Memory layout | SoA, cache-coherent | Scattered heap objects |
| Query matching | Bitmask — O(1)/entity | Iterates all entities + `has()` per component |
| GC pressure | Near-zero | Normal OOP |
| Logic location | External system functions | Inside component classes |
| True ECS performance advantage | Yes | No |

## Further Notes

- phatty is best understood as a **Component Object Model** — the same conceptual model as Unity MonoBehaviour, not Unity DOTS. Using "ECS" to describe it is a naming convention, not an architectural claim.
- The two libraries are not mutually exclusive. phatty suits gameplay logic where code organisation and ergonomics matter more than throughput. bitECS suits bulk-data systems (collision grids, particle simulation, pathfinding over large agent counts) where cache efficiency is the bottleneck.
- The Unity DOTS/MonoBehaviour split is a direct analogy: MonoBehaviour (phatty) is the familiar, productive model; DOTS (bitECS) is the performance model. Neither replaces the other in practice.
