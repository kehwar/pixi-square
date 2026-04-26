import type { GameWorld } from './World'

export type ComponentSystemClass<TComponent = any, TStorage = any>
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

  destroy(world: GameWorld, eid: number): void {
    this.clearComponent(world, eid)
  }

  getComponentStorage(world: GameWorld): TStorage {
    const Ctor = this.constructor as ComponentSystemClass<TComponent, TStorage>
    return world.getComponentStorage(Ctor)
  }

  getComponent(world: GameWorld, eid: number): TComponent {
    const storage = this.getComponentStorage(world) as unknown as TComponent[]
    return storage[eid]!
  }

  setComponent(world: GameWorld, eid: number, value: TComponent): void {
    const storage = this.getComponentStorage(world) as unknown as TComponent[]
    storage[eid] = value as TComponent
  }

  clearComponent(world: GameWorld, eid: number): void {
    const storage = this.getComponentStorage(world) as unknown as TComponent[]
    if (storage)
      delete storage[eid]
  }
}
