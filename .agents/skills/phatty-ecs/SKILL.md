---
name: phatty-ecs
description: "Unity-style Entity Component System for Phaser games using the phatty library. Covers Scene setup, Entity creation, Component lifecycle (create/update/destroy/sleep/wake/pause/resume), component priorities, dependency declaration via `required`, querying entities with QueryBuilder, and ComponentSystem events. Use when working with phatty, ECS, entity component system, entities.create, Component, entity, component dependencies, or query entities."
---

# Phatty ECS

> Unity-style entities and components for Phaser. Install with `npm install phatty`.

**Source:** https://github.com/grischaerbe/phatty  
**Related skills:** [scenes](../scenes/SKILL.md), [game-setup-and-config](../game-setup-and-config/SKILL.md)

## Quick Start

```ts
import { Scene, Component } from 'phatty'

class HealthComponent extends Component {
  constructor(public hp: number) {
    super()
  }
  update(time: number, delta: number) { /* per-frame logic */ }
  destroy() { /* cleanup */ }
}

class GameScene extends Scene {
  create() {
    const player = this.entities.create()
    player.components.add(HealthComponent, 100)
  }
}
```

## Component Lifecycle

| Method | When called |
|--------|-------------|
| `constructor` | Immediately on `components.add()` — safe to access `this.entity` and `this.entity.scene` |
| `create()` | First frame after add, before first `update` — use to get refs to other components |
| `update(time, delta)` | Every frame (skipped while sleeping/paused/destroyed) |
| `sleep()` / `wake()` | Scene put to sleep / woken |
| `pause()` / `resume()` | Scene paused / resumed |
| `destroy()` | Entity or scene destroyed |

## Component Priority

Lower numbers run **first**. Default is `0`. Use negative values for input/pre-physics.

```ts
class InputComponent extends Component {
  priority = -10  // runs first
}
class PhysicsComponent extends Component {
  priority = 0    // default
}
class CameraComponent extends Component {
  priority = 10   // runs last
}
```

## Component Dependencies

Declare `required` to enforce that sibling components exist. `components.get()` throws if missing; use `components.find()` for an optional lookup.

```ts
class SpriteComponent extends Component {
  required = [TransformComponent]

  private transform!: TransformComponent

  create() {
    this.transform = this.entity.components.get(TransformComponent)  // throws if absent
  }
}
```

## Querying Entities

`this.entities.query` is a fluent `QueryBuilder`. Chain `.with()` / `.without()` then terminate with `.all()`, `.first()`, `.count()`, or `.exists()`.

```ts
// Filter by component + predicate, exclude another component
const targets = this.entities.query
  .with(EnemyComponent, (c) => c.hp < 10)
  .without(DeadComponent)
  .all()

// Require multiple components (tuple overload)
const armed = this.entities.query.with([PlayerComponent, WeaponComponent]).all()
```

## Further Reading

- [EXAMPLES.md](EXAMPLES.md) — full player-movement walkthrough, EntitySystem/ComponentSystem events, all QueryBuilder patterns, optional component usage
- [REFERENCE.md](REFERENCE.md) — full API signatures for `Scene`, `EntitySystem`, `QueryBuilder`, `Entity`, `ComponentSystem`, and `Component`
