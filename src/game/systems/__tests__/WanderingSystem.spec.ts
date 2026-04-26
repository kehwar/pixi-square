import { addComponent, addEntity } from 'bitecs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as pathfinding from '../../../game/utils/pathfinding'
import { Grid, GridSystem, isPassable } from '../GridSystem'
import { addMovementComponent, Movement } from '../MovementSystem'
import { addPositionComponent, Position } from '../PositionSystem'
import { createWorld } from '../types'
import { create } from '../WanderingSystem'

vi.mock('phaser', () => {
  class EventEmitter {
    private _handlers: Record<string, ((arg: number) => void)[]> = {}

    on(event: string, handler: (eid: number) => void): this {
      if (!this._handlers[event])
        this._handlers[event] = []
      this._handlers[event]!.push(handler)
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
} {
  const world = createWorld(fakeScene)
  world.installSystem(new GridSystem())
  const worldEid = addEntity(world)
  addComponent(world, worldEid, GridSystem)
  return { world, worldEid }
}

describe('wanderingSystem.create', () => {
  beforeEach(() => {
    vi.mocked(pathfinding.requestPath).mockClear()
  })

  it('subscribes to movement:path-empty on the world events', () => {
    const { world, worldEid } = makeWorldWithGrid()
    const onSpy = vi.spyOn(world.events, 'on')

    create(world, worldEid)

    expect(onSpy).toHaveBeenCalledWith('movement:path-empty', expect.any(Function))
  })

  it('calls requestPath when movement:path-empty fires', () => {
    const { world, worldEid } = makeWorldWithGrid()
    create(world, worldEid)

    const eid = addEntity(world)
    addPositionComponent(world, eid, 0, 0)
    addMovementComponent(world, eid)

    world.events.emit('movement:path-empty', eid)
    expect(pathfinding.requestPath).toHaveBeenCalledOnce()
    expect(pathfinding.requestPath).toHaveBeenCalledWith(
      Grid[worldEid]!,
      Movement,
      Position,
      eid,
      expect.any(Number),
      expect.any(Number),
    )
  })

  it('calls requestPath with a passable destination tile', () => {
    const { world, worldEid } = makeWorldWithGrid()
    create(world, worldEid)

    const eid = addEntity(world)
    addPositionComponent(world, eid, 0, 0)
    addMovementComponent(world, eid)

    world.events.emit('movement:path-empty', eid)
    const [, , , , destCol, destRow] = vi.mocked(pathfinding.requestPath).mock.calls[0]!
    expect(isPassable(Grid[worldEid]!, destCol!, destRow!)).toBe(true)
  })

  it('calls requestPath each time movement:path-empty fires', () => {
    const { world, worldEid } = makeWorldWithGrid()
    create(world, worldEid)

    const eid = addEntity(world)
    addPositionComponent(world, eid, 0, 0)
    addMovementComponent(world, eid)

    world.events.emit('movement:path-empty', eid)
    world.events.emit('movement:path-empty', eid)
    world.events.emit('movement:path-empty', eid)
    expect(pathfinding.requestPath).toHaveBeenCalledTimes(3)
  })
})
