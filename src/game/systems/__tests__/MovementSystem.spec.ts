import { describe, expect, it, vi } from 'vitest'
import { TILE_SIZE } from '../GridSystem'
import { MovementSystem } from '../MovementSystem'
import { PositionSystem } from '../PositionSystem'
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
      if (this._handlers[event])
        this._handlers[event] = this._handlers[event]!.filter(h => h !== handler)
      return this
    }

    emit(event: string, arg: number): void {
      for (const h of this._handlers[event] ?? []) h(arg)
    }
  }
  return { Events: { EventEmitter } }
})

function makeWorld(): {
  world: ReturnType<typeof createWorld>
  eid: number
  movementSystem: MovementSystem
} {
  const world = createWorld({} as Parameters<typeof createWorld>[0])
  world.installSystem(new PositionSystem())
  const movementSystem = new MovementSystem()
  world.installSystem(movementSystem)
  const eid = world.addEntity()
  world.addComponent(PositionSystem, eid, (w, sys, e) => sys.setPosition(w, e, 5, 5))
  world.addComponent(MovementSystem, eid)
  return { world, eid, movementSystem }
}

const TS = TILE_SIZE
const DEFAULT_SPEED = 6

describe('movementSystem.update', () => {
  it('advances pixelX toward the next waypoint', () => {
    const { world, eid, movementSystem } = makeWorld()
    const movStorage = world.getComponentStorage(MovementSystem)
    const posStorage = world.getComponentStorage(PositionSystem)
    movStorage.path[eid] = [{ col: 6, row: 5 }]

    movementSystem.update(world, eid, 100) // 6 tiles/s * 32 px/tile * 0.1 s = 19.2 px
    expect(posStorage.pixelX[eid]).toBeCloseTo(5 * TS + TS / 2 + 19.2, 1)
    expect(posStorage.pixelY[eid]).toBeCloseTo(5 * TS + TS / 2, 1)
  })

  it('snaps to tile centre and dequeues waypoint on arrival', () => {
    const { world, eid, movementSystem } = makeWorld()
    const movStorage = world.getComponentStorage(MovementSystem)
    const posStorage = world.getComponentStorage(PositionSystem)
    const targetPixelX = 6 * TS + TS / 2
    posStorage.pixelX[eid] = targetPixelX - 0.5
    movStorage.path[eid] = [{ col: 6, row: 5 }]

    movementSystem.update(world, eid, 500)
    expect(posStorage.pixelX[eid]).toBe(6 * TS + TS / 2)
    expect(posStorage.col[eid]).toBe(6)
    expect(posStorage.row[eid]).toBe(5)
    expect(movStorage.path[eid]!.length).toBe(0)
  })

  it('unit stops at final destination', () => {
    const { world, eid, movementSystem } = makeWorld()
    const movStorage = world.getComponentStorage(MovementSystem)
    const posStorage = world.getComponentStorage(PositionSystem)
    movStorage.path[eid] = [{ col: 6, row: 5 }]

    movementSystem.update(world, eid, 10_000)
    expect(posStorage.col[eid]).toBe(6)
    expect(posStorage.pixelX[eid]).toBe(6 * TS + TS / 2)
    expect(movStorage.path[eid]!.length).toBe(0)
  })

  it('does not move when path is empty', () => {
    const { world, eid, movementSystem } = makeWorld()
    const posStorage = world.getComponentStorage(PositionSystem)
    const startX = posStorage.pixelX[eid]!

    movementSystem.update(world, eid, 1000)
    expect(posStorage.pixelX[eid]).toBe(startX)
    expect(posStorage.col[eid]).toBe(5)
  })

  it('emits movement:path-empty when last waypoint is reached', () => {
    const { world, eid, movementSystem } = makeWorld()
    const movStorage = world.getComponentStorage(MovementSystem)
    const emitSpy = vi.spyOn(world.events, 'emit')
    movStorage.path[eid] = [{ col: 6, row: 5 }]

    movementSystem.update(world, eid, 10_000) // large delta ensures arrival
    expect(emitSpy).toHaveBeenCalledWith('movement:path-empty', eid)
  })

  it('does not emit movement:path-empty while path still has waypoints', () => {
    const { world, eid, movementSystem } = makeWorld()
    const movStorage = world.getComponentStorage(MovementSystem)
    const emitSpy = vi.spyOn(world.events, 'emit')
    movStorage.path[eid] = [{ col: 6, row: 5 }, { col: 7, row: 5 }]

    // First update: arrives at (6,5), shifts it — path still has (7,5) left
    movementSystem.update(world, eid, 10_000)
    expect(emitSpy).not.toHaveBeenCalledWith('movement:path-empty', eid)
    expect(movStorage.path[eid]!.length).toBe(1)
  })

  it('emits movement:path-empty on the update that drains the last waypoint', () => {
    const { world, eid, movementSystem } = makeWorld()
    const movStorage = world.getComponentStorage(MovementSystem)
    const emitSpy = vi.spyOn(world.events, 'emit')
    movStorage.path[eid] = [{ col: 6, row: 5 }, { col: 7, row: 5 }]

    // First update drains first waypoint; second drains second and fires event
    movementSystem.update(world, eid, 10_000)
    movementSystem.update(world, eid, 10_000)
    expect(emitSpy).toHaveBeenCalledWith('movement:path-empty', eid)
  })

  it('emits movement:path-empty once per path drain', () => {
    const { world, eid, movementSystem } = makeWorld()
    const movStorage = world.getComponentStorage(MovementSystem)
    const emitSpy = vi.spyOn(world.events, 'emit')
    movStorage.path[eid] = [{ col: 6, row: 5 }]

    movementSystem.update(world, eid, 10_000)
    const callCount = emitSpy.mock.calls.filter(
      ([event]) => event === 'movement:path-empty',
    ).length
    expect(callCount).toBe(1)
  })

  it('advances speed * TILE_SIZE * (delta/1000) pixels per frame', () => {
    const { world, eid, movementSystem } = makeWorld()
    const movStorage = world.getComponentStorage(MovementSystem)
    const posStorage = world.getComponentStorage(PositionSystem)
    movStorage.path[eid] = [{ col: 10, row: 5 }] // far enough that we don't arrive

    const startX = posStorage.pixelX[eid]!
    movementSystem.update(world, eid, 100)
    const expected = startX + DEFAULT_SPEED * TS * (100 / 1000)
    expect(posStorage.pixelX[eid]).toBeCloseTo(expected, 1)
  })
})
