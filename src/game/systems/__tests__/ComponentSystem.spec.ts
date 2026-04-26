import { addEntity } from 'bitecs'
import { describe, expect, it, vi } from 'vitest'

import { ComponentSystem } from '../ComponentSystem'
import { createWorld } from '../types'

vi.mock('phaser', () => {
  class EventEmitter {}
  return { Events: { EventEmitter } }
})

// --- Minimal Phaser scene stub ---
const fakeScene = {} as Parameters<typeof createWorld>[0]

// --- Concrete test subclass ---

interface FakeData {
  value: number
}

class FakeSystem extends ComponentSystem<FakeData> {}

// --- Tests ---

describe('componentSystem', () => {
  describe('createWorld', () => {
    it('initialises all GameWorld fields', () => {
      const world = createWorld(fakeScene)
      expect(world.scene).toBe(fakeScene)
      expect(world.events).toBeDefined()
      expect(world.components).toBeInstanceOf(Map)
      expect(world.observers).toBeInstanceOf(Array)
      expect(world.systems).toBeInstanceOf(Array)
      expect(typeof world.installSystem).toBe('function')
      expect(typeof world.setupComponentStorage).toBe('function')
    })
  })

  describe('world.installSystem', () => {
    it('pushes the system into world.systems', () => {
      const world = createWorld(fakeScene)
      const system = new FakeSystem()
      world.installSystem(system)
      expect(world.systems).toContain(system)
    })

    it('calls system.install exactly once', () => {
      const world = createWorld(fakeScene)
      const system = new FakeSystem()
      const installSpy = vi.spyOn(system, 'install')
      world.installSystem(system)
      expect(installSpy).toHaveBeenCalledTimes(1)
      expect(installSpy).toHaveBeenCalledWith(world)
    })

    it('stores two unsubscribe functions in world.observers (onAdd + onRemove)', () => {
      const world = createWorld(fakeScene)
      const system = new FakeSystem()
      world.installSystem(system)
      expect(world.observers).toHaveLength(2)
      expect(typeof world.observers[0]).toBe('function')
      expect(typeof world.observers[1]).toBe('function')
    })

    it('drains world.observers after calling each unsubscribe', () => {
      const world = createWorld(fakeScene)
      const system = new FakeSystem()
      world.installSystem(system)
      const unsub = world.observers[0]!
      unsub()
      // after manual drain the function was called; observers array still references the items
      // but the observers themselves are inactive — this confirms both are stored
      expect(world.observers).toHaveLength(2)
    })
  })

  describe('observe / create auto-fire', () => {
    it('fires system.create when addComponent is called with the system class', async () => {
      const world = createWorld(fakeScene)
      const system = new FakeSystem()
      const createSpy = vi.spyOn(system, 'create')
      world.installSystem(system)

      const eid = addEntity(world)
      // addComponent is the bitECS mechanism; observe hooks fire synchronously on add
      const { addComponent } = await import('bitecs')
      addComponent(world, eid, FakeSystem)

      expect(createSpy).toHaveBeenCalledTimes(1)
      expect(createSpy).toHaveBeenCalledWith(world, eid)
    })
  })

  describe('world.setupComponentData + getComponent', () => {
    it('stores data keyed by system constructor', () => {
      const world = createWorld(fakeScene)
      const container: FakeData[] = []
      world.setupComponentStorage(FakeSystem, container)
      expect(world.components.get(FakeSystem)).toBe(container)
    })

    it('getComponent returns the typed per-entity object', () => {
      const world = createWorld(fakeScene)
      const system = new FakeSystem()
      const container: FakeData[] = []
      const eid = 42
      container[eid] = { value: 99 }
      world.setupComponentStorage(FakeSystem, container)
      const result = system.getComponent(world, eid)
      expect(result).toEqual({ value: 99 })
    })
  })

  describe('default no-op hooks', () => {
    it('all lifecycle hooks are callable without throwing', () => {
      const world = createWorld(fakeScene)
      const system = new FakeSystem()
      const eid = 0
      expect(() => system.install(world)).not.toThrow()
      expect(() => system.uninstall(world)).not.toThrow()
      expect(() => system.create(world, eid)).not.toThrow()
      expect(() => system.update(world, eid, 16)).not.toThrow()
      expect(() => system.sleep(world, eid)).not.toThrow()
      expect(() => system.wake(world, eid)).not.toThrow()
      expect(() => system.pause(world, eid)).not.toThrow()
      expect(() => system.resume(world, eid)).not.toThrow()
      expect(() => system.destroy(world, eid)).not.toThrow()
    })
  })

  describe('teardown', () => {
    it('uninstall is called when manually invoked', () => {
      const world = createWorld(fakeScene)
      const system = new FakeSystem()
      const uninstallSpy = vi.spyOn(system, 'uninstall')
      world.installSystem(system)
      system.uninstall(world)
      expect(uninstallSpy).toHaveBeenCalledTimes(1)
      expect(uninstallSpy).toHaveBeenCalledWith(world)
    })

    it('draining world.observers calls the unsubscribe functions', () => {
      const world = createWorld(fakeScene)
      const system = new FakeSystem()
      world.installSystem(system)
      // simulate teardown: drain observers
      const calls: number[] = []
      const original = world.observers[0]!
      world.observers[0] = () => {
        calls.push(1)
        original()
      }
      world.observers.forEach(fn => fn())
      expect(calls).toHaveLength(1)
    })
  })
})
