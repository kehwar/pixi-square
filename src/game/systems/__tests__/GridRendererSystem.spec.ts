import type { GameWorld } from '../types'
import { addEntity, createWorld } from 'bitecs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as GridRendererSystem from '../GridRendererSystem'
import * as GridSystem from '../GridSystem'

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

function makeWorld(): { world: ReturnType<typeof createWorld<GameWorld>>, worldEid: number } {
  const mockScene = {
    add: {
      graphics: vi.fn(() => ({
        fillStyle: vi.fn().mockReturnThis(),
        fillRect: vi.fn().mockReturnThis(),
        destroy: vi.fn(),
      })),
    },
  } as unknown as GameWorld['scene']

  const world = createWorld<GameWorld>({ scene: mockScene } as GameWorld)
  const worldEid = addEntity(world)
  GridSystem.create(world, worldEid)
  return { world, worldEid }
}

describe('gridRendererSystem', () => {
  beforeEach(() => {
    GridRendererSystem._reset()
  })

  it('create() calls add.graphics() on the scene', () => {
    const { world, worldEid } = makeWorld()
    GridRendererSystem.create(world, worldEid)
    expect(world.scene.add.graphics).toHaveBeenCalledOnce()
  })

  it('create() calls fillRect for every tile', () => {
    const { world, worldEid } = makeWorld()
    GridRendererSystem.create(world, worldEid)

    const gfx = GridRendererSystem._getGraphics()
    // Should have calls for background + every individual tile (passable and obstacle)
    // At minimum: 1 background + COLS*ROWS tile calls
    const totalTiles = GridRendererSystem.COLS * GridRendererSystem.ROWS
    expect(gfx!.fillRect).toHaveBeenCalledWith(0, 0, GridRendererSystem.COLS * GridRendererSystem.TILE_SIZE, GridRendererSystem.ROWS * GridRendererSystem.TILE_SIZE)
    // One fillRect per tile plus the background call
    expect((gfx!.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(totalTiles + 1)
  })

  it('create() calls fillStyle for border, passable, and obstacle colors', () => {
    const { world, worldEid } = makeWorld()
    GridRendererSystem.create(world, worldEid)

    const gfx = GridRendererSystem._getGraphics()
    // Should have at least 3 fillStyle calls (border, passable, obstacle)
    expect((gfx!.fillStyle as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('destroySystems() calls destroy() on the graphics object', () => {
    const { world, worldEid } = makeWorld()
    GridRendererSystem.create(world, worldEid)

    const gfx = GridRendererSystem._getGraphics()
    expect(gfx).not.toBeNull()

    GridRendererSystem.destroySystems(world)
    expect(gfx!.destroy).toHaveBeenCalledOnce()
    expect(GridRendererSystem._getGraphics()).toBeNull()
  })

  it('destroySystems() is safe to call without prior create()', () => {
    const { world } = makeWorld()
    expect(() => GridRendererSystem.destroySystems(world)).not.toThrow()
  })
})
