import { describe, expect, it, vi } from 'vitest'
import { COLS, GridRendererSystem, ROWS, TILE_SIZE } from '../GridRendererSystem'
import { GridSystem } from '../GridSystem'
import { createWorld } from '../World'

// Mock Phaser before importing modules that depend on it
vi.mock('phaser', () => {
  class EventEmitter {}

  class Graphics {
    fillStyle = vi.fn().mockReturnThis()
    fillRect = vi.fn().mockReturnThis()
    destroy = vi.fn()
  }

  class Scene {
    add = {
      graphics: vi.fn(() => new Graphics()),
    }
  }

  return { Scene, Events: { EventEmitter } }
})

function makeWorld(): { world: ReturnType<typeof createWorld>, eid: number, gridRendererSystem: GridRendererSystem } {
  const mockScene = {
    add: {
      graphics: vi.fn(() => ({
        fillStyle: vi.fn().mockReturnThis(),
        fillRect: vi.fn().mockReturnThis(),
        destroy: vi.fn(),
      })),
    },
  } as unknown as Parameters<typeof createWorld>[0]

  const world = createWorld(mockScene)
  world.installSystem(new GridSystem())
  const gridRendererSystem = new GridRendererSystem()
  world.installSystem(gridRendererSystem)
  const eid = world.addEntity()
  // Add GridSystem component first so Grid[eid] is populated before GridRendererSystem.create fires
  world.addComponent(GridSystem, eid)
  return { world, eid, gridRendererSystem }
}

describe('gridRendererSystem', () => {
  it('create() calls add.graphics() on the scene', () => {
    const { world, eid } = makeWorld()
    world.addComponent(GridRendererSystem, eid)
    expect(world.scene.add.graphics).toHaveBeenCalledOnce()
  })

  it('create() calls fillRect for every tile', () => {
    const { world, eid, gridRendererSystem } = makeWorld()
    world.addComponent(GridRendererSystem, eid)

    const { graphics: gfx } = gridRendererSystem.getComponent(world, eid)
    // Should have calls for background + every individual tile (passable and obstacle)
    // At minimum: 1 background + COLS*ROWS tile calls
    const totalTiles = COLS * ROWS
    expect(gfx.fillRect).toHaveBeenCalledWith(0, 0, COLS * TILE_SIZE, ROWS * TILE_SIZE)
    // One fillRect per tile plus the background call
    expect((gfx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(totalTiles + 1)
  })

  it('create() calls fillStyle for border, passable, and obstacle colors', () => {
    const { world, eid, gridRendererSystem } = makeWorld()
    world.addComponent(GridRendererSystem, eid)

    const { graphics: gfx } = gridRendererSystem.getComponent(world, eid)
    // Should have at least 3 fillStyle calls (border, passable, obstacle)
    expect((gfx.fillStyle as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('destroy() calls destroy() on the graphics object', () => {
    const { world, eid, gridRendererSystem } = makeWorld()
    world.addComponent(GridRendererSystem, eid)

    const { graphics: gfx } = gridRendererSystem.getComponent(world, eid)

    gridRendererSystem.destroy(world, eid)

    expect(gfx.destroy).toHaveBeenCalledOnce()
  })

  it('destroy() is unsafe to call for an entity that was never created', () => {
    const { world } = makeWorld()
    const unusedEid = world.addEntity()
    const rendererSystem = world.systems.get(GridRendererSystem) as GridRendererSystem
    expect(() => rendererSystem.destroy(world, unusedEid)).toThrow()
  })
})
