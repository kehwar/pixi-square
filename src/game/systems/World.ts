import type { QueryModifier, QueryOptions, QueryResult, QueryTerm, World } from 'bitecs'
import type { Events, Scene } from 'phaser'
import type { ComponentSystem, ComponentSystemClass } from './ComponentSystem'
import { addComponent as addBitECSComponent, addEntity as addBitECSEntity, createWorld as createBitECSWorld, hasComponent, observe, onAdd, onRemove, query as queryBitECS, removeEntity as removeBitECSEntity } from 'bitecs'
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
  addComponent: <TInstance extends ComponentSystem<any, any>>(SystemClass: abstract new (...args: any[]) => TInstance, eid: number, init?: (world: GameWorld, system: TInstance, eid: number) => void) => void
  addEntity: () => number
  removeEntity: (eid: number) => void
  query: (terms: QueryTerm[], ...modifiers: (QueryModifier | QueryOptions)[]) => QueryResult
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
    addComponent: ((_SystemClass: unknown, _eid: number, _init?: unknown) => {}) as GameWorldContext['addComponent'],
    addEntity: () => 0,
    removeEntity: (_eid: number) => {},
    query: (_terms: QueryTerm[], ..._modifiers: (QueryModifier | QueryOptions)[]) => [] as unknown as QueryResult,
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
    const system = world.systems.get(SystemClass) as { getComponent: (world: GameWorld, eid: number) => TComponent } | undefined
    return system!.getComponent(world, eid)
  }

  world.getComponentStorage = <TStorage>(SystemClass: ComponentSystemClass<any, TStorage>): TStorage => {
    return world.components.get(SystemClass) as TStorage
  }

  world.addComponent = <TInstance extends ComponentSystem<any, any>>(
    SystemClass: abstract new (...args: any[]) => TInstance,
    eid: number,
    init?: (world: GameWorld, system: TInstance, eid: number) => void,
  ) => {
    addBitECSComponent(world, eid, SystemClass as ComponentSystemClass)
    if (init !== undefined) {
      const system = world.systems.get(SystemClass as ComponentSystemClass) as TInstance
      init(world, system, eid)
    }
  }

  world.addEntity = () => addBitECSEntity(world)

  world.query = (terms: QueryTerm[], ...modifiers: (QueryModifier | QueryOptions)[]) => queryBitECS(world, terms, ...modifiers)

  world.removeEntity = (eid: number) => {
    for (const [SystemClass, system] of world.systems) {
      if (hasComponent(world, eid, SystemClass)) {
        system.destroy(world, eid)
      }
    }
    removeBitECSEntity(world, eid)
  }

  // --- Scene → world lifecycle wiring ---

  const runHook = (fn: (system: ComponentSystem<any, any>, eid: number) => void) => {
    for (const [SystemClass, system] of world.systems) {
      for (const eid of queryBitECS(world, [SystemClass])) {
        fn(system, eid)
      }
    }
  }

  let tornDown = false
  const teardown = () => {
    if (tornDown)
      return
    tornDown = true
    runHook((s, e) => s.destroy(world, e))
    for (const [, system] of world.systems) system.uninstall(world)
    for (const unsubscribe of world.observers) unsubscribe()
    world.observers.length = 0
  }

  scene.events?.on('update', (_time: number, delta: number) => runHook((s, e) => s.update(world, e, delta)))
  scene.events?.on('sleep', () => runHook((s, e) => s.sleep(world, e)))
  scene.events?.on('wake', () => runHook((s, e) => s.wake(world, e)))
  scene.events?.on('pause', () => runHook((s, e) => s.pause(world, e)))
  scene.events?.on('resume', () => runHook((s, e) => s.resume(world, e)))
  scene.events?.once('shutdown', teardown)
  scene.events?.once('destroy', teardown)

  return world
}
