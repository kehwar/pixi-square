import type { GameWorld } from '../types'
import { addEntity, createWorld } from 'bitecs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as GridSystem from '../GridSystem'
import * as PathfindingSystem from '../PathfindingSystem'
import { addMovementComponent } from '../MovementSystem'
import { addPositionComponent } from '../PositionSystem'
import { create } from '../WanderingSystem'

vi.mock('../PathfindingSystem', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../PathfindingSystem')>()
  return {
    ...mod,
    requestPath: vi.fn(),
  }
})

// --- Helpers ---

interface MockEvents {
  on: (event: string, handler: (eid: number) => void) => void
  emit: (event: string, eid: number) => void
}

function makeMockEvents(): MockEvents & { _emit: (event: string, eid: number) => void } {
  const handlers = new Map<string, ((eid: number) => void)[]>()
  return {
    on(event: string, handler: (eid: number) => void): void {
      const existing = handlers.get(event) ?? []
      handlers.set(event, [...existing, handler])
    },
    emit(event: string, eid: number): void {
      const list = handlers.get(event) ?? []
      for (const h of list) h(eid)
    },
    _emit(event: string, eid: number): void {
      this.emit(event, eid)
    },
  }
}

function makeWorldWithGrid(): {
  world: ReturnType<typeof createWorld<GameWorld>>
  worldEid: number
  events: ReturnType<typeof makeMockEvents>
} {
  const events = makeMockEvents()
  const world = createWorld<GameWorld>({
    scene: {} as GameWorld['scene'],
    events: events as unknown as GameWorld['events'],
  })
  const worldEid = addEntity(world)
  GridSystem.create(world, worldEid)
  return { world, worldEid, events }
}

describe('wanderingSystem.create', () => {
  beforeEach(() => {
    vi.mocked(PathfindingSystem.requestPath).mockClear()
  })

  it('subscribes to movement:path-empty on the world events', () => {
    const { world, worldEid, events } = makeWorldWithGrid()
    const onSpy = vi.spyOn(events, 'on')

    create(world, worldEid)

    expect(onSpy).toHaveBeenCalledWith('movement:path-empty', expect.any(Function))
  })

  it('calls requestPath when movement:path-empty fires', () => {
    const { world, worldEid, events } = makeWorldWithGrid()
    create(world, worldEid)

    const eid = addEntity(world)
    addPositionComponent(world, eid, 0, 0)
    addMovementComponent(world, eid)

    events.emit('movement:path-empty', eid)
    expect(PathfindingSystem.requestPath).toHaveBeenCalledOnce()
    expect(PathfindingSystem.requestPath).toHaveBeenCalledWith(world, eid, expect.any(Number), expect.any(Number))
  })

  it('calls requestPath with a passable destination tile', () => {
    const { world, worldEid, events } = makeWorldWithGrid()
    create(world, worldEid)

    const eid = addEntity(world)
    addPositionComponent(world, eid, 0, 0)
    addMovementComponent(world, eid)

    events.emit('movement:path-empty', eid)
    const [, , destCol, destRow] = vi.mocked(PathfindingSystem.requestPath).mock.calls[0]!
    expect(GridSystem.isPassable(worldEid, destCol!, destRow!)).toBe(true)
  })

  it('calls requestPath each time movement:path-empty fires', () => {
    const { world, worldEid, events } = makeWorldWithGrid()
    create(world, worldEid)

    const eid = addEntity(world)
    addPositionComponent(world, eid, 0, 0)
    addMovementComponent(world, eid)

    events.emit('movement:path-empty', eid)
    events.emit('movement:path-empty', eid)
    events.emit('movement:path-empty', eid)
    expect(PathfindingSystem.requestPath).toHaveBeenCalledTimes(3)
  })
})
