import type { GameWorld } from './types'

export type ComponentSystemClass<TComponent = any, TStorage = TComponent[]>
  = abstract new (...args: any[]) => ComponentSystem<TComponent, TStorage>

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

  /**
   * Called when an entity with this component is removed from the world.
   * Default implementation clears the component value for the entity.
   * Override to add custom teardown logic.
   */
  destroy(world: GameWorld, eid: number): void {
    this.clearComponent(world, eid)
  }

  /**
   * Returns the raw storage container registered for this system.
   * For AoS systems this is `TComponent[]`; for SoA systems it is whatever
   * object was passed to `world.setupComponentData`.
   */
  getComponentStorage(world: GameWorld): TStorage {
    const Ctor = this.constructor as ComponentSystemClass<TComponent, TStorage>
    return world.components.get(Ctor) as TStorage
  }

  /**
   * Returns the per-entity component value for `eid`.
   * Default implementation assumes AoS: storage is `TComponent[]`.
   * Override in SoA subclasses to pluck the correct fields.
   */
  getComponent(world: GameWorld, eid: number): TComponent {
    const storage = this.getComponentStorage(world) as unknown as TComponent[]
    return storage[eid]!
  }

  /**
   * Sets the per-entity component value for `eid`.
   * Default implementation assumes AoS: storage is `TComponent[]`.
   * Override in SoA subclasses to pluck the correct fields.
   * Should be called in the `create` hook to initialize an entity's component value.
   */
  setComponent(world: GameWorld, eid: number, value: TComponent): void {
    const storage = this.getComponentStorage(world) as unknown as TComponent[]
    storage[eid] = value
  }


  /**
   * Clears the per-entity component value for `eid`.
   * Default implementation assumes AoS: storage is `TComponent[]`.
   * Override in SoA subclasses to pluck the correct fields.
   * Should be called in the `destroy` hook to clean up after an entity is removed.
   */
  clearComponent(world: GameWorld, eid: number): void {
    const storage = this.getComponentStorage(world) as unknown as TComponent[]
    if (storage) delete storage[eid]
  }
}
