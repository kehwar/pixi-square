import type { World } from 'bitecs'
import type { Events, Scene } from 'phaser'
import type { ComponentSystem, ComponentSystemClass } from './ComponentSystem'
import { createWorld as createBitECSWorld, observe, onAdd } from 'bitecs'
import { Events as PhaserEvents } from 'phaser'

export interface GameWorldContext {
  scene: Scene
  events: Events.EventEmitter
  components: Map<ComponentSystemClass, unknown>
  observers: (() => void)[]
  systems: ComponentSystem[]
  installSystem: (system: ComponentSystem) => void
  setupComponentData: <T>(SystemClass: ComponentSystemClass<T>, data: T[]) => void
}

export type GameWorld = World<GameWorldContext>

export function createWorld(scene: Scene): GameWorld {
  const events = new PhaserEvents.EventEmitter()
  const components: Map<ComponentSystemClass, unknown> = new Map()
  const observers: (() => void)[] = []
  const systems: ComponentSystem[] = []

  const world = createBitECSWorld<GameWorldContext>({
    scene,
    events,
    components,
    observers,
    systems,
    installSystem: (_system: ComponentSystem) => {},
    setupComponentData: <T>(_SystemClass: ComponentSystemClass<T>, _data: T[]) => {},
  })

  world.installSystem = (system: ComponentSystem) => {
    world.systems.push(system)
    const SystemClass = system.constructor as ComponentSystemClass
    const unsub = observe(world, onAdd(SystemClass), (eid: number) => system.create(world, eid))
    world.observers.push(unsub)
    system.install(world)
  }

  world.setupComponentData = <T>(SystemClass: ComponentSystemClass<T>, data: T[]) => {
    world.components.set(SystemClass, data)
  }

  return world
}
