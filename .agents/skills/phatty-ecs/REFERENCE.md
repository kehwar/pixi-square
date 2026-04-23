# Phatty ECS — API Reference

## `Scene` (extends `Phaser.Scene`)

```ts
class Scene extends Phaser.Scene {
  entities: EntitySystem
}
```

## `EntitySystem`

```ts
class EntitySystem {
  events: Phaser.Events.EventEmitter  // 'create' | 'destroy'
  query: QueryBuilder
  create(): Entity
}
```

## `QueryBuilder`

```ts
class QueryBuilder {
  // Single component, optional predicate
  with<CC extends ComponentConstructor>(component: CC, where?: (c: InstanceType<CC>) => boolean): this
  // Multiple components (all required), optional predicate on tuple
  with<CCs extends [ComponentConstructor, ...]>(components: CCs, where?: (cs: Instances<CCs>) => boolean): this

  without<CC extends ComponentConstructor>(component: CC, where?: (c: InstanceType<CC>) => boolean): this
  without<CCs extends [ComponentConstructor, ...]>(components: CCs, where?: (cs: Instances<CCs>) => boolean): this

  first(): Entity | undefined
  all(): Entity[]
  count(): number
  exists(): boolean
}
```

## `Entity`

```ts
class Entity {
  components: ComponentSystem
  destroy(): void
}
```

## `ComponentSystem`

```ts
class ComponentSystem {
  // Mutate
  add<T extends ComponentConstructor>(Component: T, ...args: ConstructorParameters<T>): InstanceType<T>
  remove<T extends Component>(Component: ComponentConstructor<T>): void
  clear(): void

  // Query
  get<T extends Component>(Component: ComponentConstructor<T>): T          // throws if absent
  find<T extends Component>(Component: ComponentConstructor<T>): T | undefined
  has<T extends Component>(Component: ComponentConstructor<T>): boolean
  all(): Component[]

  events: Phaser.Events.EventEmitter  // 'add' | 'remove' | 'update'
}
```

## `Component` (abstract base)

```ts
abstract class Component {
  // Override to configure
  priority: number                   // default 0, lower runs first
  required: (typeof Component)[]     // default [], throws if missing on entity

  // Read-only context
  readonly entity: Entity
  readonly entities: EntitySystem
  readonly scene: Scene

  // Lifecycle hooks (all optional)
  create(): void
  update(time: number, delta: number): void
  sleep(): void
  wake(): void
  pause(): void
  resume(): void
  destroy(): void
}
```
