import { hasComponent } from 'bitecs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CameraSystem } from '../CameraSystem'
import { InputSystem } from '../InputSystem'
import { MovementSystem } from '../MovementSystem'
import { CAMERA_LERP, PlayerCameraSystem } from '../PlayerCameraSystem'
import { PositionSystem } from '../PositionSystem'
import { WanderingSystem } from '../WanderingSystem'
import { createWorld } from '../World'

// ---------------------------------------------------------------------------
// Phaser mock
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
    events: undefined as any,
  } as unknown as Parameters<typeof createWorld>[0]
}

function makeWorld(camera = makeFakeCamera()) {
  const fakeScene = makeFakeScene(camera)
  const world = createWorld(fakeScene)
  world.installSystem(new PositionSystem())
  world.installSystem(new MovementSystem())
  world.installSystem(new WanderingSystem())
  world.installSystem(new CameraSystem())
  const inputSystem = new InputSystem()
  world.installSystem(inputSystem)
  world.installSystem(new PlayerCameraSystem())

  // system entity for InputSystem.update
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
// PlayerCameraSystem — camera lerp
// ---------------------------------------------------------------------------

describe('playerCameraSystem.update — camera lerp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('moves camera scrollX toward the unit pixel position each update', () => {
    // Camera starts at (0,0); unit is at pixelX=400, pixelY=300 (center of 800×600 = no change)
    // Place unit off-center so camera must scroll
    const cam = makeFakeCamera(0, 0, 800, 600)
    const { world, inputSystem } = makeWorld(cam)

    const eid = addUnit(world, 1000, 300) // unit far to the right
    inputSystem.claimUnit(world, eid, 'p1')

    const pcs = world.systems.get(PlayerCameraSystem) as PlayerCameraSystem
    pcs.update(world, eid, 16.67)

    // Camera scrollX should have moved toward (1000 - 800/2) = 600
    // lerpFactor ≈ 1 - (1 - 0.05)^1 = 0.05
    // Δ = (600 - 0) * 0.05 = 30
    expect(cam.scrollX).toBeGreaterThan(0)
    expect(cam.scrollX).toBeLessThan(600)
  })

  it('moves camera scrollY toward the unit pixel position each update', () => {
    const cam = makeFakeCamera(0, 0, 800, 600)
    const { world, inputSystem } = makeWorld(cam)

    const eid = addUnit(world, 400, 1000) // unit far below
    inputSystem.claimUnit(world, eid, 'p1')

    const pcs = world.systems.get(PlayerCameraSystem) as PlayerCameraSystem
    pcs.update(world, eid, 16.67)

    expect(cam.scrollY).toBeGreaterThan(0)
    expect(cam.scrollY).toBeLessThan(700)
  })

  it('does not move the camera when the unit is already at the center', () => {
    // camera scrollX=200, unit pixelX=600, width=800 → center at 600 → no scroll needed
    const cam = makeFakeCamera(200, 100, 800, 600)
    const { world, inputSystem } = makeWorld(cam)

    const eid = addUnit(world, 600, 400) // pixelX=600, cam.scrollX + width/2 = 200+400 = 600
    inputSystem.claimUnit(world, eid, 'p1')

    const pcs = world.systems.get(PlayerCameraSystem) as PlayerCameraSystem
    pcs.update(world, eid, 16.67)

    expect(cam.scrollX).toBeCloseTo(200, 5)
    expect(cam.scrollY).toBeCloseTo(100, 5)
  })

  it('lerp factor for one frame at 16.67ms equals approximately 1-(1-CAMERA_LERP)^1', () => {
    const cam = makeFakeCamera(0, 0, 800, 600)
    const { world, inputSystem } = makeWorld(cam)

    const eid = addUnit(world, 800, 300) // target scrollX = 800 - 400 = 400
    inputSystem.claimUnit(world, eid, 'p1')

    const pcs = world.systems.get(PlayerCameraSystem) as PlayerCameraSystem
    pcs.update(world, eid, 16.67)

    const expectedLerp = 1 - (1 - CAMERA_LERP) ** 1 // delta/16.67 = 1
    expect(cam.scrollX).toBeCloseTo(400 * expectedLerp, 1)
  })
})

// ---------------------------------------------------------------------------
// End-to-end: P1 claim → PlayerCameraSystem present + camera follows
// ---------------------------------------------------------------------------

describe('end-to-end: P1 claim → camera follow', () => {
  it('playerCameraSystem is present on the claimed entity after claimUnit', () => {
    const { world, inputSystem } = makeWorld()
    const eid = addUnit(world, 100, 100)

    inputSystem.claimUnit(world, eid, 'p1')

    expect(hasComponent(world, eid, PlayerCameraSystem)).toBe(true)
  })

  it('the claimed entity is the only entity in world.query([PlayerCameraSystem])', () => {
    const { world, inputSystem } = makeWorld()
    const eid1 = addUnit(world, 100, 100)
    const eid2 = addUnit(world, 500, 500)
    inputSystem.claimUnit(world, eid1, 'p1')

    const claimed = Array.from(world.query([PlayerCameraSystem]))
    expect(claimed).toContain(eid1)
    expect(claimed).not.toContain(eid2)
  })

  it('after release, PlayerCameraSystem is no longer present and WanderingSystem is re-added', () => {
    const { world, inputSystem } = makeWorld()
    const eid = addUnit(world, 100, 100)
    world.addComponent(WanderingSystem, eid)
    inputSystem.claimUnit(world, eid, 'p1')

    inputSystem.releaseUnit(world, eid)

    expect(hasComponent(world, eid, PlayerCameraSystem)).toBe(false)
    expect(hasComponent(world, eid, WanderingSystem)).toBe(true)
  })
})
