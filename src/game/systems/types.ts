import type { World } from 'bitecs'
import type { Events, Scene } from 'phaser'
import type { ComponentSystem, ComponentSystemClass } from './ComponentSystem'
import { createWorld as createBitECSWorld, observe, onAdd, onRemove } from 'bitecs'
import { Events as PhaserEvents } from 'phaser'

export interface GameWorldContext {
  scene: Scene
  events: Events.EventEmitter
  components: Map<ComponentSystemClass<any, any>, unknown>
  observers: (() => void)[]
  systems: Map<ComponentSystemClass, ComponentSystem<any, any>>
  installSystem: (system: ComponentSystem<any, any>) => void
  setupComponentStorage: <TComponent, TStorage>(SystemClass: ComponentSystemClass<TComponent, TStorage>, data: TStorage) => void
  getComponent: <TComponent>(SystemClass: ComponentSystemClass<TComponent, any>, eid: number) => TComponent
  getComponentStorage: <TStorage>(SystemClass: ComponentSystemClass<any, TStorage>) => TStorage
}

export type GameWorld = World<GameWorldContext>

export function createWorld(scene: Scene): GameWorld {
  const events = new PhaserEvents.EventEmitter()
  const components: Map<ComponentSystemClass<any, any>, unknown> = new Map()
  const observers: (() => void)[] = []
  const systems: Map<ComponentSystemClass, ComponentSystem<any, any>> = new Map()

  const world = createBitECSWorld<GameWorldContext>({
    scene,
    events,
    components,
    observers,
    systems,
    installSystem: (_system: ComponentSystem) => {},
    setupComponentStorage: <TComponent, TStorage>(_SystemClass: ComponentSystemClass<TComponent, TStorage>, _data: TStorage) => {},
    getComponent: <TComponent>(_SystemClass: ComponentSystemClass<TComponent, any>, _eid: number): TComponent => { throw new Error('not initialised') },
    getComponentStorage: <TStorage>(_SystemClass: ComponentSystemClass<any, TStorage>): TStorage => { throw new Error('not initialised') },
  })

  world.installSystem = (system: ComponentSystem<any, any>) => {
    const SystemClass = system.constructor as ComponentSystemClass
    world.systems.set(SystemClass, system)
    const observers = [
      observe(world, onAdd(SystemClass), (eid: number) => system.create(world, eid)),
      observe(world, onRemove(SystemClass), (eid: number) => system.destroy(world, eid)),
    ]
    world.observers.push(...observers)
    system.install(world)
  }

  world.setupComponentStorage = <TComponent, TStorage>(SystemClass: ComponentSystemClass<TComponent, TStorage>, data: TStorage) => {
    world.components.set(SystemClass, data)
  }

  world.getComponent = <TComponent>(SystemClass: ComponentSystemClass<TComponent, any>, eid: number): TComponent => {
    const system = world.systems.get(SystemClass) as ComponentSystem<TComponent, any> | undefined
    return system!.getComponent(world, eid)
  }

  world.getComponentStorage = <TStorage>(SystemClass: ComponentSystemClass<any, TStorage>): TStorage => {
    return world.components.get(SystemClass) as TStorage
  }

  return world
}
