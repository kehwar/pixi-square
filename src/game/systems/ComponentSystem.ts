import type { GameWorld } from './types'

export type ComponentSystemClass<TComponent = any, TStorage = TComponent[]>
  = (abstract new (...args: any[]) => ComponentSystem<TComponent, TStorage>) & {
    getComponentStorage: (world: GameWorld) => TStorage
    getComponent: (world: GameWorld, eid: number) => TComponent
  }

export abstract class ComponentSystem<TComponent = unknown, TStorage = TComponent[]> {
  protected declare _component: TComponent
  protected declare _storage: TStorage

  install(_world: GameWorld): void {}
  uninstall(_world: GameWorld): void {}
  create(_world: GameWorld, _eid: number): void {}
  update(_world: GameWorld, _eid: number, _delta: number): void {}
  sleep(_world: GameWorld, _eid: number): void {}
  wake(_world: GameWorld, _eid: number): void {}
  pause(_world: GameWorld, _eid: number): void {}
  resume(_world: GameWorld, _eid: number): void {}
  destroy(_world: GameWorld, _eid: number): void {}

  /**
   * Returns the raw storage container registered for this system.
   * For AoS systems this is `TComponent[]`; for SoA systems it is whatever
   * object was passed to `world.setupComponentData`.
   */
  static getComponentStorage<TComponent, TStorage>(
    this: ComponentSystemClass<TComponent, TStorage>,
    world: GameWorld,
  ): TStorage {
    return world.components.get(this) as TStorage
  }

  /**
   * Returns the per-entity component value for `eid`.
   * Default implementation assumes AoS: storage is `TComponent[]`.
   * Override in SoA subclasses to pluck the correct fields.
   */
  static getComponent<TComponent, TStorage>(
    this: ComponentSystemClass<TComponent, TStorage>,
    world: GameWorld,
    eid: number,
  ): TComponent {
    const storage = this.getComponentStorage(world) as unknown as TComponent[]
    return storage[eid]!
  }
}
