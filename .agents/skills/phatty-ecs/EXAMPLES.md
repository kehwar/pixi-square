# Phatty ECS — Full Examples

Source: https://github.com/grischaerbe/phatty

## Player Movement (from official README)

A complete example showing component communication, dependency chains, and priority-based execution order.

```ts
import { Scene, Component } from 'phatty'

// Base transform component — provides a Container as the root game object.
class TransformComponent extends Component {
  public transform: Phaser.GameObjects.Container

  constructor(x: number, y: number) {
    super()
    this.transform = this.entity.scene.add.container(x, y)
  }

  destroy(): void {
    this.transform.destroy()
  }
}

// Sprite component — renders a texture inside the transform container.
class SpriteComponent extends Component {
  required = [TransformComponent]

  private sprite: Phaser.GameObjects.Sprite
  private transform!: TransformComponent

  constructor(texture: string) {
    super()
    this.sprite = this.entity.scene.add.sprite(0, 0, texture).setOrigin(0.5, 0.5)
  }

  create() {
    // Resolve component refs in create(), not the constructor.
    this.transform = this.entity.components.get(TransformComponent)
    this.transform.transform.add(this.sprite)
  }

  destroy() {
    this.sprite.destroy()
  }
}

// Movement component — translates the container each frame.
class MovementComponent extends Component {
  required = [TransformComponent]

  private transform!: TransformComponent
  private speed = 200
  private direction = new Phaser.Math.Vector2()

  create() {
    this.transform = this.entity.components.get(TransformComponent)
  }

  update(_time: number, delta: number): void {
    if (this.direction.equals(Phaser.Math.Vector2.ZERO)) return
    const dir = this.direction.clone().normalize()
    this.transform.transform.x += dir.x * this.speed * (delta / 1000)
    this.transform.transform.y += dir.y * this.speed * (delta / 1000)
    this.direction.set(0, 0)
  }

  move(direction: Phaser.Math.Vector2) {
    this.direction.copy(direction)
  }
}

// Input component — reads cursor keys and delegates to MovementComponent.
// priority = -1 ensures input is sampled before the movement component runs.
class PlayerInputComponent extends Component {
  required = [MovementComponent]
  priority = -1

  private movement!: MovementComponent
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private moveDirection = new Phaser.Math.Vector2()

  constructor() {
    super()
    this.cursors = this.entity.scene.input.keyboard!.createCursorKeys()
  }

  create() {
    this.movement = this.entity.components.get(MovementComponent)
  }

  update() {
    this.moveDirection.set(0, 0)

    if (this.cursors.left.isDown)  this.moveDirection.x -= 1
    if (this.cursors.right.isDown) this.moveDirection.x += 1
    if (this.cursors.up.isDown)    this.moveDirection.y -= 1
    if (this.cursors.down.isDown)  this.moveDirection.y += 1

    if (!this.moveDirection.equals(Phaser.Math.Vector2.ZERO)) {
      this.movement.move(this.moveDirection)
    }
  }
}

// Scene — wire everything together.
class GameScene extends Scene {
  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    const player = this.entities.create()

    player.components.add(TransformComponent, 400, 300)
    player.components.add(SpriteComponent, 'player')
    player.components.add(MovementComponent)
    player.components.add(PlayerInputComponent)
  }
}
```

### Key takeaways

- **`constructor` vs `create()`** — create Phaser objects in the constructor (scene is already accessible via `this.entity.scene`); resolve cross-component refs in `create()` so all components are guaranteed to be present.
- **`required`** — lists component classes that must exist on the same entity; `components.get()` will throw if they are missing.
- **`priority`** — `PlayerInputComponent` uses `-1` so it always runs before `MovementComponent` (default `0`).
- **`destroy()`** — clean up Phaser game objects explicitly; the ECS does not do it automatically.

---

## EntitySystem Events

```ts
class GameScene extends Scene {
  create() {
    // Fired whenever an entity is created in this scene.
    this.entities.events.on('create', (entity: Entity) => {
      console.log('entity created', entity)
    })

    // Fired whenever an entity is destroyed.
    this.entities.events.on('destroy', (entity: Entity) => {
      console.log('entity destroyed', entity)
    })
  }
}
```

## ComponentSystem Events

```ts
class TrackerComponent extends Component {
  create() {
    // 'add' fires after each component.add() on this entity.
    this.entity.components.events.on('add', (component: Component) => {
      console.log('component added', component)
    })

    // 'remove' fires after component.remove().
    this.entity.components.events.on('remove', (component: Component) => {
      console.log('component removed', component)
    })
  }
}
```

## QueryBuilder — All Patterns

```ts
class GameScene extends Scene {
  update() {
    // Single component — all matches
    const enemies = this.entities.query.with(EnemyComponent).all()

    // Single component — predicate filter
    const weakEnemies = this.entities.query
      .with(EnemyComponent, (c) => c.hp < 10)
      .all()

    // Multiple components required (tuple overload)
    const armedEnemies = this.entities.query
      .with([EnemyComponent, WeaponComponent])
      .all()

    // Multiple components with predicate on the tuple
    const armedWeakEnemies = this.entities.query
      .with(
        [EnemyComponent, WeaponComponent],
        ([enemy, weapon]) => enemy.hp < 10 && weapon.ammo > 0,
      )
      .all()

    // Exclude entities that have a component
    const alive = this.entities.query
      .with(EnemyComponent)
      .without(DeadComponent)
      .all()

    // Exclude by predicate
    const notFullHealth = this.entities.query
      .with(EnemyComponent)
      .without(EnemyComponent, (c) => c.hp === c.maxHp)
      .all()

    // Terminal methods
    const first   = this.entities.query.with(PlayerComponent).first()   // Entity | undefined
    const all     = this.entities.query.with(EnemyComponent).all()      // Entity[]
    const count   = this.entities.query.with(EnemyComponent).count()    // number
    const exists  = this.entities.query.with(EnemyComponent).exists()   // boolean
  }
}
```

## Conditional / Optional Components

```ts
class HudComponent extends Component {
  update() {
    // find() returns undefined instead of throwing — safe for optional deps.
    const shield = this.entity.components.find(ShieldComponent)
    if (shield) {
      console.log('shield hp:', shield.hp)
    }
  }
}
```
