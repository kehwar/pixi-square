import type { GameWorld } from './types'

export type ComponentSystemClass<T = any> = abstract new (...args: any[]) => ComponentSystem<T>

export abstract class ComponentSystem<TData = unknown> {
  protected declare _type: TData

  install(_world: GameWorld): void {}
  uninstall(_world: GameWorld): void {}
  create(_world: GameWorld, _eid: number): void {}
  update(_world: GameWorld, _eid: number, _delta: number): void {}
  sleep(_world: GameWorld, _eid: number): void {}
  wake(_world: GameWorld, _eid: number): void {}
  pause(_world: GameWorld, _eid: number): void {}
  resume(_world: GameWorld, _eid: number): void {}
  destroy(_world: GameWorld, _eid: number): void {}

  static getComponent<T>(
    this: ComponentSystemClass<T>,
    world: GameWorld,
    eid: number,
  ): T {
    const container = world.components.get(this) as T[]
    return container[eid]!
  }
}
