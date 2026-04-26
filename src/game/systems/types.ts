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
  systems: ComponentSystem[]
  installSystem: (system: ComponentSystem) => void
  setupComponentStorage: <TComponent, TStorage>(SystemClass: ComponentSystemClass<TComponent, TStorage>, data: TStorage) => void
}

export type GameWorld = World<GameWorldContext>

export function createWorld(scene: Scene): GameWorld {
  const events = new PhaserEvents.EventEmitter()
  const components: Map<ComponentSystemClass<any, any>, unknown> = new Map()
  const observers: (() => void)[] = []
  const systems: ComponentSystem[] = []

  const world = createBitECSWorld<GameWorldContext>({
    scene,
    events,
    components,
    observers,
    systems,
    installSystem: (_system: ComponentSystem) => {},
    setupComponentStorage: <TComponent, TStorage>(_SystemClass: ComponentSystemClass<TComponent, TStorage>, _data: TStorage) => {},
  })

  world.installSystem = (system: ComponentSystem) => {
    world.systems.push(system)
    const SystemClass = system.constructor as ComponentSystemClass
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

  return world
}
