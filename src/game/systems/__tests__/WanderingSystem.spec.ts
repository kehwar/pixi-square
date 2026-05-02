import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as pathfinding from '../../../game/utils/pathfinding'
import { GridSystem, isPassable } from '../GridSystem'
import { MovementSystem } from '../MovementSystem'
import { PositionSystem } from '../PositionSystem'
import { WanderingSystem } from '../WanderingSystem'
import { createWorld } from '../World'

vi.mock('phaser', () => {
  class EventEmitter {
    private _handlers: Record<string, ((arg: number) => void)[]> = {}

    on(event: string, handler: (eid: number) => void): this {
      if (!this._handlers[event])
        this._handlers[event] = []
      this._handlers[event]!.push(handler)
      return this
    }

    off(event: string, handler: (eid: number) => void): this {
      if (this._handlers[event]) {
        this._handlers[event] = this._handlers[event]!.filter(h => h !== handler)
      }
      return this
    }

    emit(event: string, arg: number): void {
      for (const h of this._handlers[event] ?? []) h(arg)
    }
  }
  return { Events: { EventEmitter } }
})

vi.mock('../../../game/utils/pathfinding', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../../game/utils/pathfinding')>()
  return {
    ...mod,
    requestPath: vi.fn(),
  }
})

const fakeScene = {} as Parameters<typeof createWorld>[0]

function makeWorldWithGrid(): {
  world: ReturnType<typeof createWorld>
  worldEid: number
  system: WanderingSystem
} {
  const world = createWorld(fakeScene)
  world.installSystem(new GridSystem())
  world.installSystem(new PositionSystem())
  world.installSystem(new MovementSystem())
  const system = new WanderingSystem()
  world.installSystem(system)
  const worldEid = world.addEntity()
  world.addComponent(GridSystem, worldEid)
  return { world, worldEid, system }
}

describe('wanderingSystem.install', () => {
  beforeEach(() => {
    vi.mocked(pathfinding.requestPath).mockClear()
  })

  it('subscribes to movement:path-empty on the world events', () => {
    const world = createWorld(fakeScene)
    world.installSystem(new GridSystem())
    const system = new WanderingSystem()
    const onSpy = vi.spyOn(world.events, 'on')
    world.installSystem(system)
    expect(onSpy).toHaveBeenCalledWith('movement:path-empty', expect.any(Function))
  })

  it('calls requestPath when movement:path-empty fires', () => {
    const { world, worldEid } = makeWorldWithGrid()

    const eid = world.addEntity()
    world.addComponent(PositionSystem, eid, (w, sys, e) => sys.setPosition(w, e, 0, 0))
    world.addComponent(MovementSystem, eid)

    world.events.emit('movement:path-empty', eid)
    expect(pathfinding.requestPath).toHaveBeenCalledOnce()
    expect(pathfinding.requestPath).toHaveBeenCalledWith(
      world.getComponent(GridSystem, worldEid),
      world.getComponentStorage(MovementSystem),
      world.getComponentStorage(PositionSystem),
      eid,
      expect.any(Number),
      expect.any(Number),
    )
  })

  it('calls requestPath with a passable destination tile', () => {
    const { world, worldEid } = makeWorldWithGrid()

    const eid = world.addEntity()
    world.addComponent(PositionSystem, eid, (w, sys, e) => sys.setPosition(w, e, 0, 0))
    world.addComponent(MovementSystem, eid)

    world.events.emit('movement:path-empty', eid)
    const [, , , , destCol, destRow] = vi.mocked(pathfinding.requestPath).mock.calls[0]!
    expect(isPassable(world.getComponent(GridSystem, worldEid), destCol!, destRow!)).toBe(true)
  })

  it('calls requestPath each time movement:path-empty fires', () => {
    const { world } = makeWorldWithGrid()

    const eid = world.addEntity()
    world.addComponent(PositionSystem, eid, (w, sys, e) => sys.setPosition(w, e, 0, 0))
    world.addComponent(MovementSystem, eid)

    world.events.emit('movement:path-empty', eid)
    world.events.emit('movement:path-empty', eid)
    world.events.emit('movement:path-empty', eid)
    expect(pathfinding.requestPath).toHaveBeenCalledTimes(3)
  })
})

describe('wanderingSystem.create', () => {
  beforeEach(() => {
    vi.mocked(pathfinding.requestPath).mockClear()
  })

  it('calls requestPath to request an initial path for the unit', () => {
    const { world, worldEid } = makeWorldWithGrid()

    const eid = world.addEntity()
    world.addComponent(PositionSystem, eid, (w, sys, e) => sys.setPosition(w, e, 0, 0))
    world.addComponent(MovementSystem, eid)

    // Attaching WanderingSystem fires create automatically
    world.addComponent(WanderingSystem, eid)
    expect(pathfinding.requestPath).toHaveBeenCalledOnce()
    expect(pathfinding.requestPath).toHaveBeenCalledWith(
      world.getComponent(GridSystem, worldEid),
      world.getComponentStorage(MovementSystem),
      world.getComponentStorage(PositionSystem),
      eid,
      expect.any(Number),
      expect.any(Number),
    )
  })

  it('requests a passable destination tile', () => {
    const { world, worldEid } = makeWorldWithGrid()

    const eid = world.addEntity()
    world.addComponent(PositionSystem, eid, (w, sys, e) => sys.setPosition(w, e, 0, 0))
    world.addComponent(MovementSystem, eid)

    world.addComponent(WanderingSystem, eid)
    const [, , , , destCol, destRow] = vi.mocked(pathfinding.requestPath).mock.calls[0]!
    expect(isPassable(world.getComponent(GridSystem, worldEid), destCol!, destRow!)).toBe(true)
  })

  it('skips the initial path request when the unit already has an active path', () => {
    const { world } = makeWorldWithGrid()

    const eid = world.addEntity()
    world.addComponent(PositionSystem, eid, (w, sys, e) => sys.setPosition(w, e, 0, 0))
    world.addComponent(MovementSystem, eid)

    // Seed an active path before attaching WanderingSystem (simulates a released Player Unit)
    const ms = world.getComponentStorage(MovementSystem)
    ms.path[eid] = [{ col: 3, row: 3 }]

    world.addComponent(WanderingSystem, eid)

    expect(pathfinding.requestPath).not.toHaveBeenCalled()
  })
})

describe('wanderingSystem.uninstall', () => {
  beforeEach(() => {
    vi.mocked(pathfinding.requestPath).mockClear()
  })

  it('removes the movement:path-empty listener after uninstall', () => {
    const { world, system } = makeWorldWithGrid()

    const eid = world.addEntity()
    world.addComponent(PositionSystem, eid, (w, sys, e) => sys.setPosition(w, e, 0, 0))
    world.addComponent(MovementSystem, eid)

    system.uninstall(world)
    world.events.emit('movement:path-empty', eid)
    expect(pathfinding.requestPath).not.toHaveBeenCalled()
  })
})
