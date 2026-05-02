import { hasComponent } from 'bitecs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CameraSystem } from '../CameraSystem'
import { IDLE_RELEASE_MS, InputSystem } from '../InputSystem'
import { MovementSystem } from '../MovementSystem'
import { PlayerCameraSystem } from '../PlayerCameraSystem'
import { PositionSystem } from '../PositionSystem'
import { WanderingSystem } from '../WanderingSystem'
import { createWorld } from '../World'

// ---------------------------------------------------------------------------
// Phaser mock — minimal EventEmitter + keyboard stub
// ---------------------------------------------------------------------------

vi.mock('phaser', () => {
  class EventEmitter {
    private _handlers: Record<string, ((...args: any[]) => void)[]> = {}

    on(event: string, handler: (...args: any[]) => void): this {
      if (!this._handlers[event])
        this._handlers[event] = []
      this._handlers[event]!.push(handler)
      return this
    }

    off(event: string, handler?: (...args: any[]) => void): this {
      if (!handler) {
        this._handlers[event] = []
      }
      else if (this._handlers[event]) {
        this._handlers[event] = this._handlers[event]!.filter(h => h !== handler)
      }
      return this
    }

    emit(event: string, ...args: any[]): void {
      for (const h of this._handlers[event] ?? []) h(...args)
    }

    once(event: string, handler: (...args: any[]) => void): this {
      const wrapper = (...args: any[]) => {
        this.off(event, wrapper)
        handler(...args)
      }
      return this.on(event, wrapper)
    }
  }
  return { Events: { EventEmitter } }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFakeCamera(scrollX = 0, scrollY = 0, width = 800, height = 600) {
  return { scrollX, scrollY, width, height }
}

function makeFakeScene(camera = makeFakeCamera()) {
  const keyboard = { on: vi.fn(), off: vi.fn() }
  return {
    cameras: { main: camera },
    input: { keyboard },
    events: undefined as any, // wired by createWorld
  } as unknown as Parameters<typeof createWorld>[0]
}

function makeWorld(scene?: ReturnType<typeof makeFakeScene>) {
  const fakeScene = scene ?? makeFakeScene()
  const world = createWorld(fakeScene)
  world.installSystem(new PositionSystem())
  world.installSystem(new MovementSystem())
  world.installSystem(new WanderingSystem())
  world.installSystem(new CameraSystem())
  const inputSystem = new InputSystem()
  world.installSystem(inputSystem)
  world.installSystem(new PlayerCameraSystem())

  // "system entity" that owns InputSystem update
  const sysEid = world.addEntity()
  world.addComponent(InputSystem, sysEid)

  return { world, inputSystem, fakeScene }
}

function addUnit(world: ReturnType<typeof makeWorld>['world'], pixelX: number, pixelY: number) {
  const eid = world.addEntity()
  world.addComponent(PositionSystem, eid, (w, _sys, e) => {
    const s = w.getComponentStorage(PositionSystem)
    s.pixelX[e] = pixelX
    s.pixelY[e] = pixelY
  })
  world.addComponent(MovementSystem, eid)
  return eid
}

// ---------------------------------------------------------------------------
// nearestUnclaimedUnit
// ---------------------------------------------------------------------------

describe('inputSystem.nearestUnclaimedUnit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the entity with the smallest pixel distance to the query point', () => {
    const { world, inputSystem } = makeWorld()
    const eid1 = addUnit(world, 100, 100) // dist to (200,200): √20000 ≈ 141
    const eid2 = addUnit(world, 500, 500) // dist to (200,200): √180000 ≈ 424
    const eid3 = addUnit(world, 900, 900) // dist to (200,200): √980000 ≈ 990

    const result = inputSystem.nearestUnclaimedUnit(world, 200, 200)
    expect(result).toBe(eid1)
    // suppress unused variable warnings
    void eid2
    void eid3
  })

  it('returns null when all entities with PositionSystem are claimed', () => {
    const { world, inputSystem } = makeWorld()
    const eid = addUnit(world, 100, 100)
    inputSystem.claimUnit(world, eid, 'p1')

    const result = inputSystem.nearestUnclaimedUnit(world, 0, 0)
    expect(result).toBeNull()
  })

  it('returns null when no entities with PositionSystem exist', () => {
    const { world, inputSystem } = makeWorld()
    const result = inputSystem.nearestUnclaimedUnit(world, 0, 0)
    expect(result).toBeNull()
  })

  it('skips claimed entities and returns the nearest unclaimed one', () => {
    const { world, inputSystem } = makeWorld()
    const eid1 = addUnit(world, 50, 50) // closest but claimed
    const eid2 = addUnit(world, 200, 200) // next closest

    inputSystem.claimUnit(world, eid1, 'p1')

    const result = inputSystem.nearestUnclaimedUnit(world, 0, 0)
    expect(result).toBe(eid2)
  })
})

// ---------------------------------------------------------------------------
// claimUnit
// ---------------------------------------------------------------------------

describe('inputSystem.claimUnit', () => {
  it('removes WanderingSystem from the entity', () => {
    const { world, inputSystem } = makeWorld()
    const eid = addUnit(world, 100, 100)
    world.addComponent(WanderingSystem, eid)
    expect(hasComponent(world, eid, WanderingSystem)).toBe(true)

    inputSystem.claimUnit(world, eid, 'p1')

    expect(hasComponent(world, eid, WanderingSystem)).toBe(false)
  })

  it('adds PlayerCameraSystem to the entity', () => {
    const { world, inputSystem } = makeWorld()
    const eid = addUnit(world, 100, 100)

    inputSystem.claimUnit(world, eid, 'p1')

    expect(hasComponent(world, eid, PlayerCameraSystem)).toBe(true)
  })

  it('records the claimed unit in getClaimedUnits', () => {
    const { world, inputSystem } = makeWorld()
    const eid = addUnit(world, 100, 100)

    inputSystem.claimUnit(world, eid, 'p1')

    expect(inputSystem.getClaimedUnits().get('p1')?.eid).toBe(eid)
  })

  it('sets the controller field on the PlayerCameraSystem component', () => {
    const { world, inputSystem } = makeWorld()
    const eid = addUnit(world, 100, 100)

    inputSystem.claimUnit(world, eid, 'p1')

    const data = world.getComponent(PlayerCameraSystem, eid)
    expect(data.controller).toBe('p1')
  })
})

// ---------------------------------------------------------------------------
// releaseUnit
// ---------------------------------------------------------------------------

describe('inputSystem.releaseUnit', () => {
  it('removes PlayerCameraSystem from the entity immediately', () => {
    const { world, inputSystem } = makeWorld()
    const eid = addUnit(world, 100, 100)
    inputSystem.claimUnit(world, eid, 'p1')
    expect(hasComponent(world, eid, PlayerCameraSystem)).toBe(true)

    inputSystem.releaseUnit(world, eid)

    expect(hasComponent(world, eid, PlayerCameraSystem)).toBe(false)
  })

  it('removes the unit from getClaimedUnits', () => {
    const { world, inputSystem } = makeWorld()
    const eid = addUnit(world, 100, 100)
    inputSystem.claimUnit(world, eid, 'p1')

    inputSystem.releaseUnit(world, eid)

    expect(inputSystem.getClaimedUnits().has('p1')).toBe(false)
  })

  it('re-adds WanderingSystem immediately when the path is empty', () => {
    const { world, inputSystem } = makeWorld()
    const eid = addUnit(world, 100, 100)
    inputSystem.claimUnit(world, eid, 'p1')
    // path is empty by default

    inputSystem.releaseUnit(world, eid)

    expect(hasComponent(world, eid, WanderingSystem)).toBe(true)
  })

  it('re-adds WanderingSystem immediately even when a path is active (WanderingSystem.create skips the initial path request)', () => {
    const { world, inputSystem } = makeWorld()
    const eid = addUnit(world, 100, 100)
    world.addComponent(WanderingSystem, eid)
    inputSystem.claimUnit(world, eid, 'p1')

    // Give the unit an active path
    const ms = world.getComponentStorage(MovementSystem)
    ms.path[eid] = [{ col: 5, row: 5 }]

    inputSystem.releaseUnit(world, eid)

    // WanderingSystem is added immediately; it will not override the active path
    expect(hasComponent(world, eid, PlayerCameraSystem)).toBe(false)
    expect(hasComponent(world, eid, WanderingSystem)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// idle timer auto-release
// ---------------------------------------------------------------------------

describe('inputSystem idle timer', () => {
  it('increments idleMs for claimed units on update', () => {
    const { world, inputSystem } = makeWorld()
    const eid = addUnit(world, 100, 100)
    inputSystem.claimUnit(world, eid, 'p1')

    // Simulate 3 frames of 100ms each via the system entity update
    const [sysEid] = world.query([InputSystem])
    inputSystem.update(world, sysEid!, 100)
    inputSystem.update(world, sysEid!, 100)
    inputSystem.update(world, sysEid!, 100)

    expect(inputSystem.getIdleMsForEid(eid)).toBe(300)
  })

  it('auto-releases the unit when idleMs reaches IDLE_RELEASE_MS', () => {
    const { world, inputSystem } = makeWorld()
    const eid = addUnit(world, 100, 100)
    inputSystem.claimUnit(world, eid, 'p1')

    const [sysEid] = world.query([InputSystem])
    // Drive idle timer to exactly the threshold
    inputSystem.update(world, sysEid!, IDLE_RELEASE_MS)

    expect(hasComponent(world, eid, PlayerCameraSystem)).toBe(false)
    expect(inputSystem.getClaimedUnits().has('p1')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// P1 Space key (join / release)
// ---------------------------------------------------------------------------

describe('inputSystem P1 Space key', () => {
  it('claims the nearest unclaimed unit on first Space press', () => {
    const fakeScene = makeFakeScene()
    const { world } = makeWorld(fakeScene)
    const eid = addUnit(world, 100, 100)

    // Simulate the Space keydown event via the keyboard mock
    const keyboard = fakeScene.input.keyboard as unknown as ReturnType<typeof vi.fn> & { on: ReturnType<typeof vi.fn> }
    const spaceHandler = (keyboard.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (args: any[]) => args[0] === 'keydown-SPACE',
    )?.[1] as (() => void) | undefined
    expect(spaceHandler).toBeDefined()
    spaceHandler!()

    expect(hasComponent(world, eid, PlayerCameraSystem)).toBe(true)
  })

  it('releases the held unit on second Space press', () => {
    const fakeScene = makeFakeScene()
    const { world, inputSystem } = makeWorld(fakeScene)
    const eid = addUnit(world, 100, 100)
    inputSystem.claimUnit(world, eid, 'p1')

    const keyboard = fakeScene.input.keyboard as unknown as { on: ReturnType<typeof vi.fn> }
    const spaceHandler = keyboard.on.mock.calls.find(
      (args: any[]) => args[0] === 'keydown-SPACE',
    )?.[1] as (() => void) | undefined
    expect(spaceHandler).toBeDefined()
    spaceHandler!()

    expect(hasComponent(world, eid, PlayerCameraSystem)).toBe(false)
    expect(inputSystem.getClaimedUnits().has('p1')).toBe(false)
  })
})
