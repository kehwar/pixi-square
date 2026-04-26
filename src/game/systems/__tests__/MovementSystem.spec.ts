import type { GameWorld, GameWorldContext } from '../types'
import { addEntity, createWorld } from 'bitecs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TILE_SIZE } from '../GridSystem'
import { addMovementComponent, Movement, MovementSystem } from '../MovementSystem'
import { addPositionComponent, Position, PositionSystem } from '../PositionSystem'

// --- Helpers ---

interface MockEvents {
  on: ReturnType<typeof vi.fn>
  emit: (event: string, eid: number) => void
  _handlers: Map<string, ((eid: number) => void)[]>
}

function makeMockEvents(): MockEvents {
  const handlers = new Map<string, ((eid: number) => void)[]>()
  return {
    _handlers: handlers,
    on: vi.fn((event: string, handler: (eid: number) => void) => {
      const existing = handlers.get(event) ?? []
      handlers.set(event, [...existing, handler])
    }),
    emit(event: string, eid: number): void {
      const list = handlers.get(event) ?? []
      for (const h of list) h(eid)
    },
  }
}

function makeWorld(): {
  world: ReturnType<typeof createWorld<GameWorld>>
  eid: number
  events: MockEvents
  movementSystem: MovementSystem
} {
  const events = makeMockEvents()
  const components = new Map<any, unknown>([
    [PositionSystem, Position],
    [MovementSystem, Movement],
  ])
  const world = createWorld<GameWorldContext>({
    scene: {} as GameWorldContext['scene'],
    events: events as unknown as GameWorldContext['events'],
    components,
    observers: [],
    systems: new Map(),
    installSystem: () => {},
    setupComponentStorage: () => {},
    getComponent: () => { throw new Error('not initialised') },
    getComponentStorage: <TStorage>(SystemClass: any): TStorage => components.get(SystemClass) as TStorage,
  })
  const movementSystem = new MovementSystem()
  const eid = addEntity(world)
  addPositionComponent(world, eid, 5, 5)
  addMovementComponent(world, eid)
  return { world, eid, events, movementSystem }
}

const TS = TILE_SIZE
const DEFAULT_SPEED = 6

describe('movementSystem.update', () => {
  beforeEach(() => {
    // Clear component arrays between tests
    Movement.speed.length = 0
    Movement.path.length = 0
    Position.col.length = 0
    Position.row.length = 0
    Position.pixelX.length = 0
    Position.pixelY.length = 0
  })

  it('advances pixelX toward the next waypoint', () => {
    const { world, eid, movementSystem } = makeWorld()
    Movement.path[eid] = [{ col: 6, row: 5 }]

    movementSystem.update(world, eid, 100) // 6 tiles/s * 32 px/tile * 0.1 s = 19.2 px
    expect(Position.pixelX[eid]).toBeCloseTo(5 * TS + TS / 2 + 19.2, 1)
    expect(Position.pixelY[eid]).toBeCloseTo(5 * TS + TS / 2, 1)
  })

  it('snaps to tile centre and dequeues waypoint on arrival', () => {
    const { world, eid, movementSystem } = makeWorld()
    const targetPixelX = 6 * TS + TS / 2
    Position.pixelX[eid] = targetPixelX - 0.5
    Movement.path[eid] = [{ col: 6, row: 5 }]

    movementSystem.update(world, eid, 500)
    expect(Position.pixelX[eid]).toBe(6 * TS + TS / 2)
    expect(Position.col[eid]).toBe(6)
    expect(Position.row[eid]).toBe(5)
    expect(Movement.path[eid]!.length).toBe(0)
  })

  it('unit stops at final destination', () => {
    const { world, eid, movementSystem } = makeWorld()
    Movement.path[eid] = [{ col: 6, row: 5 }]

    movementSystem.update(world, eid, 10_000)
    expect(Position.col[eid]).toBe(6)
    expect(Position.pixelX[eid]).toBe(6 * TS + TS / 2)
    expect(Movement.path[eid]!.length).toBe(0)
  })

  it('does not move when path is empty', () => {
    const { world, eid, movementSystem } = makeWorld()
    const startX = Position.pixelX[eid]!

    movementSystem.update(world, eid, 1000)
    expect(Position.pixelX[eid]).toBe(startX)
    expect(Position.col[eid]).toBe(5)
  })

  it('emits movement:path-empty when last waypoint is reached', () => {
    const { world, eid, events, movementSystem } = makeWorld()
    const emitSpy = vi.spyOn(events, 'emit')
    Movement.path[eid] = [{ col: 6, row: 5 }]

    movementSystem.update(world, eid, 10_000) // large delta ensures arrival
    expect(emitSpy).toHaveBeenCalledWith('movement:path-empty', eid)
  })

  it('does not emit movement:path-empty while path still has waypoints', () => {
    const { world, eid, events, movementSystem } = makeWorld()
    const emitSpy = vi.spyOn(events, 'emit')
    Movement.path[eid] = [{ col: 6, row: 5 }, { col: 7, row: 5 }]

    // First update: arrives at (6,5), shifts it — path still has (7,5) left
    movementSystem.update(world, eid, 10_000)
    expect(emitSpy).not.toHaveBeenCalledWith('movement:path-empty', eid)
    expect(Movement.path[eid]!.length).toBe(1)
  })

  it('emits movement:path-empty on the update that drains the last waypoint', () => {
    const { world, eid, events, movementSystem } = makeWorld()
    const emitSpy = vi.spyOn(events, 'emit')
    Movement.path[eid] = [{ col: 6, row: 5 }, { col: 7, row: 5 }]

    // First update drains first waypoint; second drains second and fires event
    movementSystem.update(world, eid, 10_000)
    movementSystem.update(world, eid, 10_000)
    expect(emitSpy).toHaveBeenCalledWith('movement:path-empty', eid)
  })

  it('emits movement:path-empty once per path drain', () => {
    const { world, eid, events, movementSystem } = makeWorld()
    const emitSpy = vi.spyOn(events, 'emit')
    Movement.path[eid] = [{ col: 6, row: 5 }]

    movementSystem.update(world, eid, 10_000)
    const callCount = emitSpy.mock.calls.filter(
      ([event]) => event === 'movement:path-empty',
    ).length
    expect(callCount).toBe(1)
  })

  it('advances speed * TILE_SIZE * (delta/1000) pixels per frame', () => {
    const { world, eid, movementSystem } = makeWorld()
    Movement.path[eid] = [{ col: 10, row: 5 }] // far enough that we don't arrive

    const startX = Position.pixelX[eid]!
    movementSystem.update(world, eid, 100)
    const expected = startX + DEFAULT_SPEED * TS * (100 / 1000)
    expect(Position.pixelX[eid]).toBeCloseTo(expected, 1)
  })
})
